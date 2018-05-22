const glob = require("glob")
const fs = require("fs")
const path = require("path")
const peg = require("pegjs")
const Promise = require('bluebird')
const lookmlParser = peg.generate(fs.readFileSync(path.join(__dirname,"lookml.peg"),{encoding:'utf-8'}))
const flatten = (a,b) => a.concat(b)
const indexBy = (key) => (obj,x,i) => Object.assign(obj,{[x[key]]:x})
const readp = Promise.promisify(fs.readFile)
const globp = Promise.promisify(glob)

exports.parse = lookmlParser.parse
exports.parseFiles = async function parse({
 		source =  "*.{view,model,explore}.lkml"
		,globOptions = {}
		,readFileOptions = {encoding:'utf-8'}
		,readFileConcurrency = 4
		,console = console
	}){
		const inputFilePaths = await globp(source,globOptions)
		if(!inputFilePaths.length){
				console.warn("Warning: No input files were matched. (Use argument --input=... )")
			}
		const files = await Promise.map(inputFilePaths, async (_file_path,fp)=>{
				var file,result;
				try{
						file = await readp(_file_path,readFileOptions)
						result = lookmlParser.parse(file)
					}
				catch(e){result = {error:e}}
				const _file_name = path.basename(_file_path).replace(/\.([-_a-zA-Z0-9]+)(\.lkml|\.lookml)?$/i,'')
				const _file_type = (path.basename(_file_path) .match(/\.([-_a-zA-Z0-9]+)(\.lkml|\.lookml)?$/i)||[])[1]
				const _file_rel = path.relative(globOptions.cwd||process.cwd(),_file_path) //To be used for pattern matching
				return {...result,
						_file_path, _file_rel, _file_name, _file_type,
						...(_file_type=="model"?{_model:_file_name}:{})
					}
			},{concurrency: readFileConcurrency})
		const modelFiles = files.filter(f=>f._file_type=="model"   )
		const models = modelFiles.map(iterateIncludes)

		return {
				files,
				file: {
						model:   modelFiles.reduce(indexBy("_file_name"),{})
						,view:   files.filter(f=>f._file_type=="view"   ).reduce(indexBy("_file_name"),{})
						,explore:files.filter(f=>f._file_type=="explore").reduce(indexBy("_file_name"),{})
					},
				models,
				model:modelFiles.reduce(indexBy("_model"),{})
			}
	}

function annotatedModelFile(modelFile){
		return modelfile._file_type=="model"?{...modelFile, _model:modelFile._file_name}:modelFile
	}

function iterateIncludes(model){
		//Note: TC Recursion is not optimized by V8, so I made this thing :-/
		var twoStates=[{include:model}]
		for(var i=0;twoStates[i]!=twoStates[not(i)];i=not(i)){
				twoStates[not(i)] = recurIncludes(twoStates[i])
			}
		return twoStates[i]
		function recurIncludes(a){const {include=[], prior={}, included=[]} = a
				const includes = coerceArray(include)
				const current = includes[0]
				if(!current){return a}
				const rest = includes.slice(1)
				const nextIncludes = 
						coerceArray(current.include)
						.map(pattern=>files.filter(f=>lookerpattern2Regex(pattern).match(f._file_name)))
						.reduce(flatten)
						.concat(rest)
						.filter(unique)
				return {//recurIncludes(
						include:nextIncludes, //include
						prior:{...prior, ...current}, //prior
						included:included.concat(current) // included
					}
			}
		function not(i){return (i+1)%2}
	}

function coerceArray(x){
	if(x===undefined){return []}
	if(!x instanceof Array){ return [x]}
	return x
}
function lookerpattern2Regex(str){
		// Not sure what the official spec is for Looker file match patterns, but I know *, so that will do for now
		return new RegExp("^"+str.replace(/./g,"\\.").replace(/\*/g,".*")+"$", "gu")
	}
function unique(x,i,arr){return arr.indexOf(x)==i}