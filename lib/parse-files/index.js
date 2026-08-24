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
		...(files.some(f => f.error) ? { errors: files.filter(f => f.error) } : {}),
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
		if (!f.error) {
			typeValidationAndNormalization(f, { globalRepeatedKeys, ...transformations, getPositions, fastPositions }, f.$file_type || 'model')
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

	return project
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
