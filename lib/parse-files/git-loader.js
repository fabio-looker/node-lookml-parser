const Promise = require('bluebird')
const { minimatch } = require('minimatch')

const defaultSource = "**/{*.model,*.explore,*.view,manifest}.lkml"

function checkEnvironment() {
	if (typeof process === 'undefined' || !process.versions || !process.versions.node) {
		const err = new Error("Git historical mode is only supported in Node.js environments.")
		err.code = "GIT_UNSUPPORTED_ENVIRONMENT"
		throw err
	}
}

function runGit(args, cwd) {
	checkEnvironment()
	const { execFile } = require('child_process')
	const effectiveCwd = cwd || process.cwd()
	return new Promise((resolve, reject) => {
		execFile('git', args, { cwd: effectiveCwd }, (err, stdout, stderr) => {
			if (err) {
				if (err.code === 'ENOENT') {
					const notFoundErr = new Error("git binary not found in PATH")
					notFoundErr.code = "GIT_NOT_FOUND"
					return reject(notFoundErr)
				}
				const stderrStr = (stderr || '').toString()
				if (stderrStr.includes('not a git repository')) {
					const notRepoErr = new Error(`Working directory is not a git repository: '${effectiveCwd}'`)
					notRepoErr.code = "GIT_NOT_A_REPOSITORY"
					return reject(notRepoErr)
				}
				err.stderr = stderrStr
				return reject(err)
			}
			resolve(stdout ? stdout.toString() : '')
		})
	})
}

async function resolveGitRef(gitRef, cwd) {
	const effectiveCwd = cwd || process.cwd()
	// First check if inside a git work tree
	await runGit(['rev-parse', '--is-inside-work-tree'], effectiveCwd)

	// Try resolving commit or tree
	try {
		const stdout = await runGit(['rev-parse', '--verify', `${gitRef}^{commit}`], effectiveCwd)
		return stdout.trim()
	} catch (e) {
		if (e.code === 'GIT_NOT_FOUND' || e.code === 'GIT_NOT_A_REPOSITORY') {
			throw e
		}
		// If commit resolution failed, try tree resolution
		try {
			const stdout = await runGit(['rev-parse', '--verify', `${gitRef}^{tree}`], effectiveCwd)
			return stdout.trim()
		} catch (treeErr) {
			const invalidRefErr = new Error(`Invalid git ref: '${gitRef}'`)
			invalidRefErr.code = "GIT_INVALID_REF"
			throw invalidRefErr
		}
	}
}

async function loadGitFileObjects(options = {}) {
	const {
		gitRef,
		cwd,
		input,
		source,
		console: consoleOpt
	} = options

	const effectiveCwd = cwd || process.cwd()
	const resolvedSha = await resolveGitRef(gitRef, effectiveCwd)

	// List all files at that ref relative to cwd
	const lsTreeOutput = await runGit(['ls-tree', '-r', '-z', resolvedSha], effectiveCwd)
	const rawEntries = lsTreeOutput.split('\0').filter(Boolean)

	const fileEntries = []
	for (const entry of rawEntries) {
		const tabIdx = entry.indexOf('\t')
		if (tabIdx === -1) continue
		const meta = entry.slice(0, tabIdx)
		const filePath = entry.slice(tabIdx + 1)
		const parts = meta.split(' ')
		if (parts[1] === 'blob') {
			fileEntries.push({
				sha: parts[2],
				path: filePath
			})
		}
	}

	fileEntries.sort((a, b) => a.path.localeCompare(b.path))

	const inputPattern = (input !== undefined ? input : source) || defaultSource
	const normalizedPattern = typeof inputPattern === 'string'
		? inputPattern.replace(/^\.\//, '')
		: inputPattern

	const matchedEntries = typeof normalizedPattern === 'string'
		? fileEntries.filter(e => minimatch(e.path, normalizedPattern, { dot: true }))
		: fileEntries

	const gitInfo = {
		type: 'git',
		ref: gitRef,
		commit: resolvedSha,
		message: `Parsed from git ref '${gitRef}' (${resolvedSha})`
	}

	if (!matchedEntries.length) {
		if (consoleOpt && typeof consoleOpt.warn === 'function') {
			if (input !== undefined || source !== undefined) {
				consoleOpt.warn("Warning: No input files were matched for pattern " + inputPattern)
			} else {
				consoleOpt.warn("Warning: No input files were matched. (Use argument --input=... or input)")
			}
		}
		return {
			fileObjects: [],
			gitInfo
		}
	}

	// Stream contents of matched blobs using git cat-file --batch
	const contents = await streamGitBlobs(matchedEntries.map(e => e.sha), effectiveCwd)

	const fileObjects = matchedEntries.map((entry, index) => ({
		path: entry.path,
		read: () => Promise.resolve(contents[index])
	}))

	return {
		fileObjects,
		gitInfo
	}
}

function streamGitBlobs(shas, cwd) {
	checkEnvironment()
	const { spawn } = require('child_process')
	return new Promise((resolve, reject) => {
		const proc = spawn('git', ['cat-file', '--batch'], { cwd })
		const chunks = []
		let stderr = ''

		proc.stdout.on('data', chunk => chunks.push(chunk))
		proc.stderr.on('data', errChunk => { stderr += errChunk.toString() })

		proc.on('error', err => {
			if (err.code === 'ENOENT') {
				const notFoundErr = new Error("git binary not found in PATH")
				notFoundErr.code = "GIT_NOT_FOUND"
				return reject(notFoundErr)
			}
			reject(err)
		})

		proc.on('close', code => {
			if (code !== 0) {
				return reject(new Error(`git cat-file --batch failed with exit code ${code}: ${stderr}`))
			}
			const buf = Buffer.concat(chunks)
			let offset = 0
			const contents = []

			for (let i = 0; i < shas.length; i++) {
				const nextNewline = buf.indexOf(10, offset)
				if (nextNewline === -1) break
				const header = buf.slice(offset, nextNewline).toString('utf8')
				const parts = header.split(' ')
				if (parts[1] === 'missing') {
					contents.push('')
					offset = nextNewline + 1
					continue
				}
				const size = parseInt(parts[2], 10)
				const content = buf.slice(nextNewline + 1, nextNewline + 1 + size).toString('utf8')
				contents.push(content)
				offset = nextNewline + 1 + size + 1
			}

			resolve(contents)
		})

		for (const sha of shas) {
			proc.stdin.write(sha + '\n')
		}
		proc.stdin.end()
	})
}

module.exports = {
	loadGitFileObjects,
	resolveGitRef,
	runGit
}
