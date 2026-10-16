const Promise = require('bluebird')
const fs = require('fs')
const path = require('path')
const { glob } = require('glob')

const readp = Promise.promisify(fs.readFile)
const defaultSource = "**/{*.model,*.explore,*.view,manifest}.lkml"

async function loadFileObjects(options = {}) {
	const {
		input,
		source,
		gitRef,
		cwd,
		globOptions = {},
		readFileOptions = { encoding: 'utf-8' },
		console: consoleOpt
	} = options

	const inputPattern = input !== undefined ? input : source

	if (Array.isArray(inputPattern)) {
		if (gitRef) {
			const err = new Error("Cannot specify both an in-memory file array and gitRef")
			err.code = "INVALID_OPTIONS"
			throw err
		}
		return {
			fileObjects: inputPattern.map(s => ({
				path: s.path,
				read: () => Promise.resolve(s.content)
			}))
		}
	}

	if (gitRef) {
		const { loadGitFileObjects } = require('./git-loader.js')
		return loadGitFileObjects(options)
	}

	// Local filesystem loader
	const inputFilePaths = (await glob(inputPattern || defaultSource, {
		...cwd ? { cwd } : {},
		posix: true,
		...globOptions
	})).sort((a, b) => a.localeCompare(b))

	if (!inputFilePaths.length) {
		if (consoleOpt && typeof consoleOpt.warn === 'function') {
			if (inputPattern) {
				consoleOpt.warn("Warning: No input files were matched for pattern " + inputPattern)
			} else {
				consoleOpt.warn("Warning: No input files were matched. (Use argument --input=... or input)")
			}
		}
	}

	const fileObjects = inputFilePaths.map($file_path => {
		const fullPath = path.resolve(cwd || process.cwd(), $file_path)
		return {
			path: $file_path,
			stat: () => {
				try {
					const st = fs.statSync(fullPath)
					return { size: st.size, mtimeMs: st.mtimeMs }
				} catch (e) {
					return null
				}
			},
			read: () => readp(fullPath, readFileOptions)
		}
	})

	return {
		fileObjects
	}
}

module.exports = {
	loadFileObjects
}
