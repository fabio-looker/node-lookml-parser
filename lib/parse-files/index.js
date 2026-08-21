const parseModule = require('../parse')
const { transformAst } = require('../parse/transform-ast.js')
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

exports = module.exports = async function lookmlParser_parseFiles({
	source
	,cwd
	,globOptions = {}
	,readFileOptions = {encoding:'utf-8'}
	,readFileConcurrency = 4
	,conditionalCommentString
	,console = defaultConsole
	,trace = {}
	,fileOutput = 'by-name'
	,transformations = {
		applyExtensionsRefinements: true,
		removeAbstract: true,
		includeAst: false,
		}
	}={}){
	const {
		applyExtensionsRefinements = true,
		removeAbstract = true,
		includeAst = false,
	} = transformations || {}

	if(Array.isArray(console)){console = mockConsole(console)}
	let fileObjects;
	if(Array.isArray(source)){
		fileObjects = source.map(s=>({path:s.path, read:()=>Promise.resolve(s.content) }))
	}else{
		const inputFilePaths = (await glob(source||defaultSource, {
			...cwd?{cwd}:{},
			posix: true,
			...globOptions
			})).sort((a,b) => a.localeCompare(b))
		if(!inputFilePaths.length){
				if(source){console.warn("Warning: No input files were matched for pattern "+source)}
				else{console.warn("Warning: No input files were matched. (Use argument --input=... or source)")}
			}
		fileObjects = inputFilePaths.map($file_path=>({path:$file_path, read:()=>readp(path.resolve(cwd||process.cwd(),$file_path),readFileOptions) }))
	}
	const files = await Promise.map(fileObjects, async (fileObject,fp)=>{
			const $file_path = fileObject.path
			let typeRegex = /\.?([-_a-zA-Z0-9]+)(\.lkml|\.lookml)?$/i
			const $file_name = path.basename($file_path).replace(typeRegex,'')
			const [match,$file_type,$file_supertype] = path.basename($file_path).match(typeRegex)||[]
			const $file_rel = $file_path.replace(typeRegex,'')
			var file,result;
			try{
				file = await fileObject.read()
				if($file_supertype == '.lookml'){
					result = maybeYamlParser.parse(file)
					if($file_type==="dashboard"){
						result = {dashboard: {[$file_name]: result}}
						}
					}
				else{
					if(includeAst){
						const ast = lookmlParser.parseAst(file,{
								conditionalCommentString
							})
						const parsed = transformAst(ast)
						result = {...parsed, $ast: ast}
					}else{
						result = lookmlParser.parse(file,{
								conditionalCommentString
							})
					}
				}
				}catch(e){result = {error:e}}
			return {...result,
					$file_path, $file_rel, $file_name, $file_type
				}
		},{concurrency: readFileConcurrency})
	const manifest = files.find(f=>f.$file_type=="manifest")
	
	const project = {
			...(files.some(f=>f.error)?{
				errors:files.filter(f=>f.error)
				}:{}),
			file: files.reduce(indexBy(f=>[f.$file_rel,f.$file_type].filter(Boolean).join('.')), {}),
			manifest
		}
	
	// For now, we always assemble models, but in the future, this could be controllable via a flag
	xf.assembleModels(project, {trace})
	
	if(applyExtensionsRefinements){
		xf.applyExtensionsRefinements(project)
		}
	if(removeAbstract){
		xf.removeAbstract(project)
		}

	switch(fileOutput){
		case 'by-name':
			// This is now the internally produced default representation. No-op
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
				model:		files.filter(f=>f.$file_type=="model"  ).reduce(indexBy("$file_rel"),{})
				,view:		files.filter(f=>f.$file_type=="view"   ).reduce(indexBy("$file_rel"),{})
				,explore:	files.filter(f=>f.$file_type=="explore").reduce(indexBy("$file_rel"),{})
				,manifest
				};
			break;
		default: throw new Error("Unrecognized file output argument: "+fileOutput);
		}
	return project
	}

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
