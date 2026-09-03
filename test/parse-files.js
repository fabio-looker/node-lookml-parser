const TestRunner = require('test-runner')
const runner = new TestRunner({sequential:true})
const deepExpect = require("./lib/deep-expect.js")
const lookmlParser_parseFiles = require("../lib/parse-files/index.js")
const lookmlParser_tranformations = require("../lib/transformations/index.js")
const util = require("util")
const fs = require('fs')
const { performance } = require('node:perf_hooks');
const pathLib = require('path')
const defaultConsole = console
const testProjectsLocation = pathLib.join(__dirname,'../test-projects')

const getSpec = function read(path){
	try{
		let file = fs.readFileSync(pathLib.join(testProjectsLocation,path,'test.json'),{encoding:'utf8'})
		return JSON.parse(file)}
	catch(e){
		console.error({path, error:e})
		return {}
		}
	}

const paths = fs
	.readdirSync(testProjectsLocation,{withFileTypes:true})
	.filter(ent=>ent.isDirectory())
	.filter(ent=>ent.name && ent.name[0]!=='.')
	.map(ent=>ent.name)

const utOpt = {compact:false, maxArrayLength:3, depth:12, breakLength:60 }

!async function(){

	console.log("\n### parse-files ###")
	for(let path of paths){
			const test = getSpec(path)
			const name = test.name||path
			const opts = {cwd: pathLib.join(testProjectsLocation,path), legacyFileMetadata: true, ...test.parseFileOptions||{}}
			if(opts.console){opts.console = mockConsole(opts.console)}
			try{
				runner.test(name, async () => {
						const perfStart = performance.now()

						let project = await lookmlParser_parseFiles(opts)

						if(project.error){
							throw "Parse error: "+util.inspect(project.error)
							}

						for(let [xf, xfOpts] of Object.entries(test.transformations || {})){
							if(!xfOpts){continue}
							let transformation = lookmlParser_tranformations[xf]
							if(!transformation){
								throw `Unrecognized transformation ${xf} in test config`
								}
							transformation(project, xfOpts === true ? undefined : xfOpts)
							}

						const perfDuration = performance.now() - perfStart
						//Uncomment for a quick way to get a sense of performance across each test
						//console.log({name, perfDuration})

						if(test.maxTimeMs && perfDuration>test.maxTimeMs){
							// Performance tests should really be isolated from parseFiles which involves I/O, but this is a
							// 'good enough' interim check, as long as the maxTimeMs values are sufficiently padded to avoid false alarms
							throw `Performance: Runtime of ${perfDuration} ms exceeded limit of ${test.maxTimeMs} ms` 
							}
						if({}.polluted !== undefined){
							throw "Prototype pollution occurred"
							}
						if(test.expected){
							let results = deepExpect(test.expected)(project)
							if(results.length){
								throw ("\n"+results.join("\n")
									+"\n\n\n## Expected: ##\n"
									+util.inspect(test.expected,utOpt)
									+"\n\n\n## Received: ##\n"
									+util.inspect(project,utOpt)
									)
							}
						}
						return "ok"
					})
				}
			catch(e){console.error(e)}
		}

	runner.test("parseFilesRaw returns un-assembled project files", async () => {
		const lookmlParser = require('../index.js')
		const project = await lookmlParser.parseFilesRaw({
			cwd: pathLib.join(testProjectsLocation, '001-simple-model')
		})
		if (!project.file) throw new Error("Expected project.file")
		if (project.model) throw new Error("Expected no project.model in raw parsing")
		return "ok"
	})

	runner.test("parseFiles with modelAssembly: false skips model assembly", async () => {
		const lookmlParser = require('../index.js')
		const project = await lookmlParser.parseFiles({
			cwd: pathLib.join(testProjectsLocation, '001-simple-model'),
			modelAssembly: false,
			extensions: false
		})
		if (!project.file) throw new Error("Expected project.file")
		if (project.model) throw new Error("Expected no project.model when modelAssembly: false")
		return "ok"
	})

	runner.test("parseFiles with extensions: true and modelAssembly: false warns and enables modelAssembly", async () => {
		const lookmlParser = require('../index.js')
		let warned = false
		const customConsole = {
			warn: (msg) => {
				if (typeof msg === 'string' && msg.includes('extensions option requires modelAssembly')) {
					warned = true
				}
			},
			log: () => {},
			error: () => {}
		}
		const project = await lookmlParser.parseFiles({
			cwd: pathLib.join(testProjectsLocation, '001-simple-model'),
			modelAssembly: false,
			extensions: true,
			console: customConsole
		})
		if (!warned) throw new Error("Expected warning when extensions: true and modelAssembly: false")
		if (!project.model) throw new Error("Expected modelAssembly to be auto-enabled when extensions: true")
		return "ok"
	})

	runner.test("parseFiles defaults legacyFileMetadata to false", async () => {
		const lookmlParser = require('../index.js')
		const project = await lookmlParser.parseFiles({
			cwd: pathLib.join(testProjectsLocation, '001-simple-model')
		})
		for (const [key, fileObj] of Object.entries(project.file || {})) {
			if (fileObj.$file_rel !== undefined) throw new Error(`Expected $file_rel to be undefined by default on ${key}`)
			if (fileObj.$file_name !== undefined) throw new Error(`Expected $file_name to be undefined by default on ${key}`)
			if (fileObj.$file_type !== undefined) throw new Error(`Expected $file_type to be undefined by default on ${key}`)
			if (!fileObj.$file_path) throw new Error(`Expected $file_path to be preserved on ${key}`)
		}
		return "ok"
	})

	runner.test("parseFiles with strings: false and legacyFileMetadata: false purges metadata while preserving $file_path", async () => {
		const lookmlParser = require('../index.js')
		const project = await lookmlParser.parseFiles({
			cwd: pathLib.join(testProjectsLocation, '001-simple-model'),
			strings: false,
			legacyFileMetadata: false
		})
		for (const [key, fileObj] of Object.entries(project.file || {})) {
			if (fileObj.$strings !== undefined) throw new Error(`Expected $strings to be undefined on ${key}`)
			if (fileObj.$file_rel !== undefined) throw new Error(`Expected $file_rel to be undefined on ${key}`)
			if (!fileObj.$file_path) throw new Error(`Expected $file_path to be preserved on ${key}`)
		}
		return "ok"
	})

	runner.test("parseFiles with validationMode: true returns restricted keys and empty objects for error-free files", async () => {
		const lookmlParser = require('../index.js')
		const project = await lookmlParser.parseFiles({
			cwd: pathLib.join(testProjectsLocation, '001-simple-model'),
			validationMode: true
		})
		const allowedKeys = new Set(['error', 'errors', 'info', 'file'])
		for (const key of Object.keys(project)) {
			if (!allowedKeys.has(key)) throw new Error(`Unexpected top-level key in validationMode: ${key}`)
		}
		if (project.model !== undefined) throw new Error("Expected project.model to be undefined in validationMode")
		if (!project.info || !project.info.some(i => i.type === 'summary' && i.filesCount > 0)) {
			throw new Error("Expected summary info message in project.info")
		}
		if (!project.file) throw new Error("Expected project.file in validationMode")
		for (const [fileKey, fileObj] of Object.entries(project.file)) {
			if (fileObj.$file_path !== undefined) throw new Error(`Expected file metadata $file_path to be omitted on ${fileKey}`)
			if (fileObj.view !== undefined || fileObj.model !== undefined || fileObj.explore !== undefined) {
				throw new Error(`Expected LookML content to be omitted on ${fileKey}`)
			}
			if (Object.keys(fileObj).length !== 0) {
				throw new Error(`Expected error-free file object to be empty {}, got ${JSON.stringify(fileObj)}`)
			}
		}
		return "ok"
	})

	runner.test("parseFiles with validationMode: true throws error when combined with output-expanding options", async () => {
		const lookmlParser = require('../index.js')
		let threw = false
		try {
			await lookmlParser.parseFiles({
				cwd: pathLib.join(testProjectsLocation, '001-simple-model'),
				validationMode: true,
				ast: true
			})
		} catch (e) {
			if (e.message && e.message.includes('validationMode cannot be combined')) {
				threw = true
			}
		}
		if (!threw) throw new Error("Expected error when combining validationMode with ast: true")
		return "ok"
	})

	runner.test("parseFiles aggregates validation errors to project.errors in standard mode and validationMode", async () => {
		const lookmlParser = require('../index.js')
		const stdProject = await lookmlParser.parseFiles({
			cwd: pathLib.join(testProjectsLocation, '029-validation-error-aggregation')
		})
		if (!stdProject.errors || !stdProject.errors.some(e => e.code === 'DUPLICATE_SINGULAR_PROPERTY')) {
			throw new Error("Expected aggregated DUPLICATE_SINGULAR_PROPERTY in stdProject.errors")
		}
		if (!stdProject.errors.some(e => e.code === 'SYNTAX_ERROR')) {
			throw new Error("Expected aggregated SYNTAX_ERROR in stdProject.errors")
		}

		const valProject = await lookmlParser.parseFiles({
			cwd: pathLib.join(testProjectsLocation, '029-validation-error-aggregation'),
			validationMode: true
		})
		if (!valProject.errors || !valProject.errors.some(e => e.code === 'DUPLICATE_SINGULAR_PROPERTY')) {
			throw new Error("Expected aggregated DUPLICATE_SINGULAR_PROPERTY in valProject.errors")
		}
		if (!valProject.errors.some(e => e.code === 'SYNTAX_ERROR')) {
			throw new Error("Expected aggregated SYNTAX_ERROR in valProject.errors")
		}
		if (valProject.view !== undefined || valProject.file['bad_cardinality.view'].view !== undefined) {
			throw new Error("Expected parsed view contents to be omitted in valProject")
		}
		if (!valProject.file['bad_cardinality.view'].errors || valProject.file['bad_cardinality.view'].errors.length === 0) {
			throw new Error("Expected file-level errors in valProject.file['bad_cardinality.view']")
		}
		if (!valProject.file['invalid_syntax.view'].error) {
			throw new Error("Expected file-level error in valProject.file['invalid_syntax.view']")
		}
		return "ok"
	})
	}()

function mockConsole(consoleSpec){
	let allowedMethods = consoleSpec
	let console = {}
	for(let method of ['log','warn','error']){
		if(allowedMethods.includes(method)){
			console[method] = defaultConsole[method].bind(defaultConsole)
			}
		else {
			console[method] = noop
			}
		}
	return console
	}
function noop(){}
