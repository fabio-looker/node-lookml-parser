const parseModule = require('../parse')
const { transformAst } = require('../parse/transform-ast.js')
const { handleParseError } = parseModule
const lookmlParser = { parse: parseModule, parseAst: parseModule.parseAst }
const maybeYamlParser = { parse: require('../maybe-yaml-parse') } 
const { glob } = require("glob")
const Promise = require('bluebird')
const fs = require("fs")
const path = require("path")
const readp = Promise.promisify(fs.readFile)
const defaultConsole = console
const defaultSource = "**/{*.model,*.explore,*.view,manifest}.lkml"
const xf = require("../transformations/index.js")
const indexBy = require("../common/index-by.js")
const normalizeError = require("../common/normalize-error.js")

async function lookmlParser_parseFilesRaw(options = {}) {
	const {
		input,
		source,
		cwd,
		globOptions = {},
		readFileOptions = { encoding: 'utf-8' },
		readFileConcurrency = 4,
		conditionalCommentString,
		console: consoleOpt = defaultConsole,
		trace = {},
		fileOutput = 'by-name',
		ast = false,
		includeAst = false,
		buildStrings = false
	} = options

	let console = Array.isArray(consoleOpt) ? mockConsole(consoleOpt) : consoleOpt
	const inputPattern = input !== undefined ? input : source
	const wantAst = Boolean(ast || includeAst)
	let fileObjects;
	if (Array.isArray(inputPattern)) {
		fileObjects = inputPattern.map(s => ({ path: s.path, read: () => Promise.resolve(s.content) }))
	} else {
		const inputFilePaths = (await glob(inputPattern || defaultSource, {
			...cwd ? { cwd } : {},
			posix: true,
			...globOptions
		})).sort((a, b) => a.localeCompare(b))
		if (!inputFilePaths.length) {
			if (inputPattern) { console.warn("Warning: No input files were matched for pattern " + inputPattern) }
			else { console.warn("Warning: No input files were matched. (Use argument --input=... or input)") }
		}
		fileObjects = inputFilePaths.map($file_path => ({ path: $file_path, read: () => readp(path.resolve(cwd || process.cwd(), $file_path), readFileOptions) }))
	}

	const files = await Promise.map(fileObjects, async (fileObject) => {
		const $file_path = fileObject.path
		let typeRegex = /\.?([-_a-zA-Z0-9]+)(\.lkml|\.lookml)?$/i
		const $file_name = path.basename($file_path).replace(typeRegex, '')
		const [match, $file_type, $file_supertype] = path.basename($file_path).match(typeRegex) || []
		const $file_rel = $file_path.replace(typeRegex, '')
		var file, result;
		try {
			file = await fileObject.read()
			if ($file_supertype == '.lookml') {
				result = maybeYamlParser.parse(file)
				if ($file_type === "dashboard") {
					result = { dashboard: { [$file_name]: result } }
				}
			} else {
				const pegAst = lookmlParser.parseAst(file, { conditionalCommentString })
				result = transformAst(pegAst, { _isInner: true, conditionalCommentString, buildStrings })
				if (wantAst) {
					result.$ast = pegAst
				}
			}
		} catch (e) { result = { error: handleParseError(e, file) } }
		return {
			...result,
			$file_path, $file_rel, $file_name, $file_type
		}
	}, { concurrency: readFileConcurrency })

	const manifest = files.find(f => f.$file_type == "manifest")
	const project = {
		...(files.some(f => f.error) ? { errors: files.map(f => f.error ? normalizeError(f.error, f) : null).filter(Boolean) } : {}),
		file: files.reduce(indexBy(f => [f.$file_rel, f.$file_type].filter(Boolean).join('.')), {}),
		manifest
	}
	return project
}

async function lookmlParser_parseFiles(options = {}) {
	const {
		input,
		source,
		cwd,
		globOptions = {},
		readFileOptions = { encoding: 'utf-8' },
		readFileConcurrency = 4,
		conditionalCommentString,
		console: consoleOpt = defaultConsole,
		trace = {},
		fileOutput = 'by-name',
		transformations,
		getPositions,
		fastPositions
	} = options

	let console = Array.isArray(consoleOpt) ? mockConsole(consoleOpt) : consoleOpt
	const inputPattern = input !== undefined ? input : source

	// Normalize feature flags (with backward-compatibility resolution)
	let modelAssembly = options.modelAssembly !== undefined ? Boolean(options.modelAssembly) : true
	let extensions = options.extensions !== undefined
		? Boolean(options.extensions)
		: (transformations && transformations.applyExtensionsRefinements !== undefined ? Boolean(transformations.applyExtensionsRefinements) : true)

	const removeAbstractOpt = transformations && transformations.removeAbstract !== undefined ? Boolean(transformations.removeAbstract) : extensions

	let strings = options.strings !== undefined
		? Boolean(options.strings)
		: (options.dropStrings !== undefined ? !options.dropStrings : true)

	let legacyFileMetadata = options.legacyFileMetadata !== undefined
		? Boolean(options.legacyFileMetadata)
		: (options.dropFileAdditional !== undefined ? !options.dropFileAdditional : (transformations && transformations.dropFileAdditional !== undefined ? !transformations.dropFileAdditional : false))

	let positions = options.positions !== undefined
		? Boolean(options.positions)
		: (options.addPositions !== undefined ? Boolean(options.addPositions) : (transformations && transformations.addPositions !== undefined ? Boolean(transformations.addPositions) : Boolean(getPositions)))

	let ast = options.ast !== undefined
		? Boolean(options.ast)
		: (options.includeAst !== undefined ? Boolean(options.includeAst) : (transformations && transformations.includeAst !== undefined ? Boolean(transformations.includeAst) : false))

	const validationMode = Boolean(options.validationMode)

	if (validationMode) {
		const isExplicitTrue = (val) => val === true
		if (
			isExplicitTrue(options.ast) ||
			isExplicitTrue(options.includeAst) ||
			isExplicitTrue(options.positions) ||
			isExplicitTrue(options.addPositions) ||
			Boolean(getPositions) ||
			isExplicitTrue(options.legacyFileMetadata) ||
			isExplicitTrue(options.strings) ||
			options.dropStrings === false ||
			options.dropFileAdditional === false ||
			(transformations && isExplicitTrue(transformations.includeAst))
		) {
			throw new Error("validationMode cannot be combined with options that request content or metadata (e.g. ast, positions, strings, legacyFileMetadata).")
		}
		strings = false
		legacyFileMetadata = false
		positions = false
		ast = false
	}

	// Dependency check: extensions requires modelAssembly
	if (extensions && !modelAssembly) {
		console.warn("Warning: extensions option requires modelAssembly. Enabling modelAssembly.")
		modelAssembly = true
	}

	const needsStrings = strings || positions

	// Step 1 & 2: Parse raw files into project
	const project = await lookmlParser_parseFilesRaw({
		input: inputPattern,
		cwd,
		globOptions,
		readFileOptions,
		readFileConcurrency,
		conditionalCommentString,
		console,
		trace,
		fileOutput: 'by-name',
		ast,
		buildStrings: needsStrings
	})

	const files = project.file ? Object.values(project.file) : []

	// Run type validation and normalization across files
	const globalRepeatedKeys = new Set()
	const { typeValidationAndNormalization } = require('../parse/transform-ast.js')

	function collectRepeatedKeys(obj) {
		if (!obj || typeof obj !== 'object') return
		for (const k of Object.keys(obj)) {
			if (k.startsWith('$')) continue
			const val = obj[k]
			if (Array.isArray(val) && val.length > 1) {
				globalRepeatedKeys.add(k)
			}
			if (val && typeof val === 'object') {
				if (Array.isArray(val)) {
					val.forEach(collectRepeatedKeys)
				} else {
					for (const nk of Object.keys(val)) {
						if (nk.startsWith('$')) continue
						if (Array.isArray(val[nk])) {
							if (val[nk].length > 1) globalRepeatedKeys.add(k)
							val[nk].forEach(collectRepeatedKeys)
						}
					}
				}
			}
		}
	}

	for (const f of files) {
		collectRepeatedKeys(f)
	}

	for (const f of files) {
		if (f.error) {
			f.error = normalizeError(f.error, f)
		} else {
			typeValidationAndNormalization(f, { globalRepeatedKeys, ...transformations, getPositions, fastPositions }, f.$file_type || 'model')
		}
		if (validationMode) {
			const rawFErrors = collectErrorsFromObj(f)
			if (rawFErrors.length > 0) {
				f.errors = rawFErrors.map(err => normalizeError(err, f))
			}
		}
	}

	const allInfoMap = new Map()
	for (const f of files) {
		if (Array.isArray(f.info)) {
			for (const item of f.info) {
				if (item && item.property && !allInfoMap.has(item.property)) {
					allInfoMap.set(item.property, item)
				}
			}
		}
	}
	const projectInfo = Array.from(allInfoMap.values())
	if (projectInfo.length > 0) {
		project.info = projectInfo
	}

	// Aggregate file errors and validation errors into project.errors for all runs
	const aggregatedErrors = []
	if (project.errors && Array.isArray(project.errors)) {
		for (const err of project.errors) {
			const normErr = normalizeError(err)
			if (!aggregatedErrors.some(e => e.code === normErr.code && e.message === normErr.message)) {
				aggregatedErrors.push(normErr)
			}
		}
	}
	for (const f of files) {
		if (f.error) {
			const normErr = normalizeError(f.error, f)
			if (!aggregatedErrors.some(e => e.code === normErr.code && e.message === normErr.message)) {
				aggregatedErrors.push(normErr)
			}
		}
		const fErrors = collectErrorsFromObj(f)
		for (const err of fErrors) {
			const normErr = normalizeError(err, f)
			if (!aggregatedErrors.some(e => e.code === normErr.code && e.message === normErr.message)) {
				aggregatedErrors.push(normErr)
			}
		}
	}
	if (aggregatedErrors.length > 0) {
		project.errors = aggregatedErrors
	}

	// Step 3: Model Assembly
	if (modelAssembly) {
		xf.assembleModels(project, { trace })
	}

	// Step 4: Extensions & Refinements
	if (extensions) {
		xf.applyExtensionsRefinements(project)
		if (removeAbstractOpt) {
			xf.removeAbstract(project)
		}
	}

	// Step 5: Line Position Index
	if (positions) {
		xf.addPositions(project, { fastPositions, ...(typeof getPositions === 'object' ? getPositions : typeof options.addPositions === 'object' ? options.addPositions : {}) })
	}

	// Step 6: File Output Representation
	const manifest = project.manifest
	switch (fileOutput) {
		case 'by-name':
			// Default representation
			break;
		case 'none':
			delete project.file
			break;
		case 'array':
			delete project.file;
			project.files = files;
			break;
		case 'by-type':
			delete project.file;
			project.file = {
				model: files.filter(f => (f.$file_type || getFileType(f.$file_path)) == "model").reduce(indexBy(f => f.$file_rel || getFileRel(f.$file_path)), {}),
				view: files.filter(f => (f.$file_type || getFileType(f.$file_path)) == "view").reduce(indexBy(f => f.$file_rel || getFileRel(f.$file_path)), {}),
				explore: files.filter(f => (f.$file_type || getFileType(f.$file_path)) == "explore").reduce(indexBy(f => f.$file_rel || getFileRel(f.$file_path)), {}),
				manifest
			};
			break;
		default: throw new Error("Unrecognized file output argument: " + fileOutput);
	}

	// Step 7: Metadata Purging
	if (!strings) {
		xf.dropStrings(project)
	}
	if (!legacyFileMetadata) {
		xf.dropFileAdditional(project)
	}

	if (validationMode) {
		const topErrorCount = project.error ? 1 : 0
		const projectErrorsCount = Array.isArray(project.errors) ? project.errors.length : 0
		const totalErrors = topErrorCount + projectErrorsCount

		const summaryInfo = {
			message: `Validation completed: ${files.length} file(s) processed, ${totalErrors} error(s) found.`,
			filesCount: files.length,
			errorsCount: totalErrors,
			type: 'summary'
		}

		if (!project.info) {
			project.info = []
		}
		project.info.push(summaryInfo)

		const allowedTopKeys = new Set(['error', 'errors', 'info', 'file'])
		for (const key of Object.keys(project)) {
			if (!allowedTopKeys.has(key)) {
				delete project[key]
			}
		}

		if (project.file) {
			if (fileOutput === 'by-type') {
				for (const typeKey of Object.keys(project.file)) {
					const category = project.file[typeKey]
					if (category && typeof category === 'object') {
						for (const fileKey of Object.keys(category)) {
							category[fileKey] = pruneFileObj(category[fileKey])
						}
					}
				}
			} else {
				for (const fileKey of Object.keys(project.file)) {
					project.file[fileKey] = pruneFileObj(project.file[fileKey])
				}
			}
		}
	}

	return project
}

function pruneFileObj(fObj) {
	if (!fObj || typeof fObj !== 'object') return {}
	const pruned = {}
	if (fObj.error) pruned.error = normalizeError(fObj.error, fObj)
	const errs = collectErrorsFromObj(fObj)
	if (errs.length > 0) pruned.errors = errs.map(e => normalizeError(e, fObj))
	if (Array.isArray(fObj.info) && fObj.info.length > 0) pruned.info = fObj.info
	return pruned
}

function collectErrorsFromObj(obj, acc = [], visited = new Set()) {
	if (!obj || typeof obj !== 'object' || visited.has(obj)) return acc
	visited.add(obj)
	if (Array.isArray(obj.errors)) {
		for (const err of obj.errors) {
			if (!acc.includes(err)) {
				acc.push(err)
			}
		}
	}
	if (Array.isArray(obj)) {
		for (const item of obj) {
			collectErrorsFromObj(item, acc, visited)
		}
	} else {
		for (const k of Object.keys(obj)) {
			if (k === '$strings' || k === '$ast') continue
			if (typeof obj[k] === 'object' && obj[k] !== null) {
				collectErrorsFromObj(obj[k], acc, visited)
			}
		}
	}
	return acc
}

function getFileType(filePath) {
	if (!filePath) return undefined
	const match = path.basename(filePath).match(/\.?([-_a-zA-Z0-9]+)(\.lkml|\.lookml)?$/i)
	return match ? match[1] : undefined
}

function getFileRel(filePath) {
	if (!filePath) return undefined
	return filePath.replace(/\.?([-_a-zA-Z0-9]+)(\.lkml|\.lookml)?$/i, '')
}

function mockConsole(consoleSpec) {
	let allowedMethods = consoleSpec
	let console = {}
	for (let method of ['log', 'warn', 'error']) {
		if (allowedMethods.includes(method)) {
			console[method] = defaultConsole[method].bind(defaultConsole)
		}
		else {
			console[method] = noop
		}
	}
	return console
}
function noop() { }

module.exports = lookmlParser_parseFiles
module.exports.parseFilesRaw = lookmlParser_parseFilesRaw
