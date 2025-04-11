
const lookmlParser = {parse: require ('../parse')}
const maybeYamlParser = {parse: require('../maybe-yaml-parse')} 
const glob = require("glob")
const Promise = require('bluebird')
const fs = require("fs")
const path = require("path")
const readp = Promise.promisify(fs.readFile)
const globp = Promise.promisify(glob)
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
	,fileOutput
	,transformations = {
		applyExtensionsRefinements = false, // MAJOR: Change to true with next major release
		removeAbstract = false, // MAJOR: Change to true with next major release
		}={}
	}={}){
	const inputFilePaths = await globp(source||defaultSource, {
		...cwd?{cwd}:{},
		...globOptions
		})
	if(Array.isArray(console)){console = mockConsole(console)}
	if(!inputFilePaths.length){
			if(source){console.warn("Warning: No input files were matched for pattern "+source)}
			else{console.warn("Warning: No input files were matched. (Use argument --input=... or source)")}
		}
	const files = await Promise.map(inputFilePaths, async ($file_path,fp)=>{
			let typeRegex = /\.?([-_a-zA-Z0-9]+)(\.lkml|\.lookml)?$/i
			const $file_name = path.basename($file_path).replace(typeRegex,'')
			const [match,$file_type,$file_supertype] = path.basename($file_path).match(typeRegex)||[]
			const $file_rel = $file_path.replace(typeRegex,'')
			var file,result;
			try{
				file = await readp(path.resolve(cwd||process.cwd(),$file_path),readFileOptions)
				if($file_supertype == '.lookml'){
					result = maybeYamlParser.parse(file)
					if($file_type==="dashboard"){
						result = {dashboard: {[$file_name]: result}}
						}
					}
				else{
					result = lookmlParser.parse(file,{
							conditionalCommentString,
							model:$file_type==="model"?$file_name:undefined
						})
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
	
	if(transformations.applyExtensionsRefinements){
		xf.applyExtensionsRefinements(project)
		}
	if(transformations.removeAbstract){
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
		case undefined:
			delete project.file;
			const modelFiles = files.filter(f=>f.$file_type=="model" && f.model)
			project.file = {
				model:		modelFiles.reduce(indexBy("$file_rel"),{})
				,view:		files.filter(f=>f.$file_type=="view"   ).reduce(indexBy("$file_rel"),{})
				,explore:	files.filter(f=>f.$file_type=="explore").reduce(indexBy("$file_rel"),{})
				,manifest
				};
			break;
		default: throw new Error("Unrecognized file output argument: "+fileOutput);
		}
	return project
	}
