!function(){
		const lookmlParser = {parse: require ('../parse')}
		const glob = require("glob")
		const Promise = require('bluebird')
		const fs = require("fs")
		const path = require("path")
		const readp = Promise.promisify(fs.readFile)
		const globp = Promise.promisify(glob)

		exports = module.exports = async function lookmlParser_parseFiles({
				source =  "{*.model,*.explore,*.view,manifest}.lkml"
				,globOptions = {}
				,readFileOptions = {encoding:'utf-8'}
				,readFileConcurrency = 4
				,conditionalCommentString
				,console = console
				,trace = {}
			}){
				const inputFilePaths = await globp(source,globOptions)
				if(!inputFilePaths.length){
						console.warn("Warning: No input files were matched. (Use argument --input=... )")
					}
				const files = await Promise.map(inputFilePaths, async (_file_path,fp)=>{
						const _file_name = path.basename(_file_path).replace(/\.?([-_a-zA-Z0-9]+)(\.lkml|\.lookml)?$/i,'')
						const _file_type = (path.basename(_file_path) .match(/\.?([-_a-zA-Z0-9]+)(\.lkml|\.lookml)?$/i)||[])[1]
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
				const models = modelFiles.map(mf=>iterateIncludes(mf, files, trace))

				return {
						...(files.some(f=>f.error)?{
							errors:files.filter(f=>f.error),
							errorReport:()=>console.log(files.filter(f=>f.error).map(f=>
								 "\n"+f._file_path
								+"\n"+f.error.toString()
								+"\n"+(f.error.context||"")
								).join("\n"))
							}:{}),
						files,
						file: {
								model:   modelFiles.reduce(indexBy("_file_name"),{})
								,view:   files.filter(f=>f._file_type=="view"   ).reduce(indexBy("_file_name"),{})
								,explore:files.filter(f=>f._file_type=="explore").reduce(indexBy("_file_name"),{})
								,manifest:files.find(f=>f._file_type=="manifest")
							},
						models,
						model: models.reduce(indexBy("_model"),{})
					}
			}

		function iterateIncludes(modelFile, files, trace){
				var toMerge = []
				var remaining = [modelFile]
				var included =[]
				while(remaining.length){
						let current = remaining.shift()
						if( typeof current == "string"){
								if(trace.includes){console.log("Searching: "+current)}
								let pattern = lookerpattern2Regex(current)
								let matchedFiles = 
										files
										.filter(f=>f._file_path.match(pattern))
								let toAdd = matchedFiles
										.filter(f=>!included.includes(f._file_path))
								if(trace.includes){console.log("  > New matches: "+toAdd.length)}
								let dupes = matchedFiles
										.filter(f=> included.includes(f._file_path))
								if(trace.includes && dupes.length){console.log("  > \x1b[33mDupe matches\x1b[0m: ",dupes.map(f=>f._file_path))}
								remaining.unshift(...toAdd)
							}
						if( typeof current == "object" ){
								if(trace.includes){console.log("\x1b[2mIncluding\x1b[0m: "+current._file_path)}
								let file = current
								if(included.includes(file._file_path)){
										if(trace.includes){console.log("  > \x1b[33mSkipping as duplicate\x1b[0m")}
										continue
									}
								included.push(file._file_path)
								//if(trace.includes){console.log("  > Included: "+file._file_path)}
								if(file._file_type=="model" && file.models){
										file={...file,...file.models[0]}
										delete file.models
									}
								let includes = coerceArray(file.include)
								if(trace.includes && includes.length){console.log("  > Queued: ", includes)}
								remaining.unshift(...coerceArray(includes))
								toMerge.push(file)	
							}
					}
			
			return merge(...toMerge)
		}
		function coerceArray(x){
			if(x===undefined){return []}
			if(x instanceof Array){return x.slice()}
			return [x]
		}
		function lookerpattern2Regex(str){
				// Not sure what the official spec is for Looker file match patterns, but I know *, so that will do for now
				return new RegExp("^"+str
									.replace(/\./g,"\\.") //Dots are literals
									.replace(/\*/g,".*") //* is splat
									.replace(/\.(view|model|explore)$/,".$1.lkml") //Types that are implicitly .lkml
									// I assume dashboards get an explict extension too, but they're out of scope here
									+"$", "gu")
			}
		function unique(x,i,arr){return arr.indexOf(x)==i}
		function flatten(a,b){return a.concat(b)}
		function indexBy(key){return (obj,x,i) => ({...obj, [x[key]]:x})}
		function peek(x){console.log(x); return x}
		function merge(...objs){
				const has = key => obj => obj[key]!==undefined
				return objs
				.map(o=>Object.keys(o))
				.reduce(flatten,[])
				.filter(unique)
				.reduce((merged,key)=>({
						...merged,
						[key]: objs.filter(has(key)).length==1
								? objs.find(has(key))[key]
								: objs.filter(has(key)).every(o=>o[key].isMergeable)
									? merge(...objs.filter(has(key)).map(o=>o[key]))
									: objs.filter(has(key)).map(o=>o[key]).reduce(flatten,[])
					}),{})
			}

	}()
