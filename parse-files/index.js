!function(){
		const lookmlParser = {parse: require ('../parse')}
		const glob = require("glob")
		const Promise = require('bluebird')
		const fs = require("fs")
		const path = require("path")
		const readp = Promise.promisify(fs.readFile)
		const globp = Promise.promisify(glob)
		
		exports = module.exports = async function lookmlParser_parseFiles({
				source =  "*.{view,model,explore}.lkml"
				,globOptions = {}
				,readFileOptions = {encoding:'utf-8'}
				,readFileConcurrency = 4
				,conditionalCommentString
				,console = console
			}){
				const inputFilePaths = await globp(source,globOptions)
				if(!inputFilePaths.length){
						console.warn("Warning: No input files were matched. (Use argument --input=... )")
					}
				const files = await Promise.map(inputFilePaths, async (_file_path,fp)=>{
						const _file_name = path.basename(_file_path).replace(/\.([-_a-zA-Z0-9]+)(\.lkml|\.lookml)?$/i,'')
						const _file_type = (path.basename(_file_path) .match(/\.([-_a-zA-Z0-9]+)(\.lkml|\.lookml)?$/i)||[])[1]
						const _file_rel = path.relative(globOptions.cwd||process.cwd(),_file_path) //To be used for pattern matching
						var file,result;
						try{
								file = await readp(_file_path,readFileOptions)
								result = lookmlParser.parse(file,{
										conditionalCommentString,
										model:_file_type=="model"?_file_name:undefined
									})
							}catch(e){result = {error:e}}
						return {...result,
								_file_path, _file_rel, _file_name, _file_type
							}
					},{concurrency: readFileConcurrency})
				const modelFiles = files.filter(f=>f._file_type=="model" && f.models)
				const models = modelFiles.map(f=>f.models[0]).map(m=>iterateIncludes(m))

				return {
						...(files.some(f=>f.error)?{errors:files.filter(f=>f.error)}:{}),
						files,
						file: {
								model:   modelFiles.reduce(indexBy("_file_name"),{})
								,view:   files.filter(f=>f._file_type=="view"   ).reduce(indexBy("_file_name"),{})
								,explore:files.filter(f=>f._file_type=="explore").reduce(indexBy("_file_name"),{})
							},
						models,
						model: models.reduce(indexBy("_model"),{})
					}
			}

		function iterateIncludes(model){
				//Note: TC Recursion is not optimized by V8, so I made this thing :-/
				var twoStates=[{include:model, prior:model}]
				for(var i=0;twoStates[i]!=twoStates[not(i)];i=not(i)){
						twoStates[not(i)] = recurIncludes(twoStates[i])
					}
				console.log(i)
				console.log(twoStates[i])
				return twoStates[i].prior
				function recurIncludes(args){const {include=[], prior={}, /*included=[]*/} = args;
						console.log(include)
						const includes = coerceArray(include)
						const current = includes[0]
						if(current==undefined){return args}
						const rest = includes.slice(1)
						const nextIncludes =
								coerceArray(current.include)
								.map(pattern=>files.filter(f=>lookerpattern2Regex(pattern).match(f._file_name)))
								.reduce(flatten)
								.concat(rest)
								.filter(unique)
								//TODO: Filter already included for corner-case circular includes
						return {//recurIncludes(
								include:nextIncludes,
								prior:{
									...prior,
									...(current._file_type=="model" && current.models ? current.models[0]:current)
								}
								//included:included.concat(current) // included
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
		function flatten(a,b){return a.concat(b)}
		function indexBy(key){return (obj,x,i) => ({...obj, [x[key]]:x})}
	}()

