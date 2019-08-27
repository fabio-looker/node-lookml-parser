!function(){
		const lookmlParser = {parse: require ('../parse')}
		const glob = require("glob")
		const Promise = require('bluebird')
		const fs = require("fs")
		const path = require("path")
		const readp = Promise.promisify(fs.readFile)
		const globp = Promise.promisify(glob)
		const defaultConsole = console
		const defaultSource = "**/{*.model,*.explore,*.view,manifest}.lkml"

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
			}={}){
				const inputFilePaths = await globp(source||defaultSource, {
					cwd,
					...globOptions
					})
				if(Array.isArray(console)){console = mockConsole(console)}
				if(!inputFilePaths.length){
						if(source){console.warn("Warning: No input files were matched for pattern "+source)}
						else{console.warn("Warning: No input files were matched. (Use argument --input=... or source)")}
					}
				const files = await Promise.map(inputFilePaths, async (_file_path,fp)=>{
						let typeRegex = /\.?([-_a-zA-Z0-9]+)(\.lkml|\.lookml)?$/i
						const _file_name = path.basename(_file_path).replace(typeRegex,'')
						const _file_type = (path.basename(_file_path) .match(typeRegex)||[])[1]
						const _file_rel = _file_path.replace(typeRegex,'')
						var file,result;
						try{
								file = await readp(path.join(cwd||process.cwd(),_file_path),readFileOptions)
								result = lookmlParser.parse(file,{
										conditionalCommentString,
										model:_file_type=="model"?_file_name:undefined
									})
							}catch(e){result = {error:e}}
						return {...result,
								_file_path, _file_rel, _file_name, _file_type
							}
					},{concurrency: readFileConcurrency})
				const modelFiles = files.filter(f=>f._file_type=="model" && f.model)
				
				if(trace.includes){console.log("Files: ",files.map(f=>f._file_path))}
				const models = modelFiles.map(mf=>iterateIncludes(mf, files, trace))

				let filesOut
				switch(fileOutput){
					case 'none':
						filesOut = {}
						break;
					case 'by-name':
						filesOut = {file:files.reduce(indexBy(f=>[f._file_rel,f._file_type].filter(Boolean).join('.')), {})}
						break
					case 'array':
						filesOut = {files}
						break
					case 'by-type': 
					case undefined:
						filesOut={file:{
							model:		modelFiles.reduce(indexBy("_file_rel"),{})
							,view:		files.filter(f=>f._file_type=="view"   ).reduce(indexBy("_file_rel"),{})
							,explore:	files.filter(f=>f._file_type=="explore").reduce(indexBy("_file_rel"),{})
							,manifest:	files.find(f=>f._file_type=="manifest")
							}}
						break
					default: throw new Error("Unrecognized file output argument: "+fileOutput);
					}

				return {
						...(files.some(f=>f.error)?{
							errors:files.filter(f=>f.error),
							errorReport:()=>console.log(files.filter(f=>f.error).map(f=>
								 "\n"+f._file_path
								+"\n"+f.error.toString()
								+"\n"+(f.error.context||"")
								).join("\n"))
							}:{}),
						...filesOut,
						model: Object.values(models).reduce(indexBy("_model"),{})
					}
			}

		function iterateIncludes(modelFile, files, trace){
				var toMerge = []
				var remaining = [modelFile]
				var included =[]
				if(trace.includes){console.log("Starting from model: ",modelFile._file_name)}
				while(remaining.length){
						let current = remaining.shift()
						if( typeof current == "string"){
								let currentPattern = current
								if(trace.includes){console.log("Searching: "+current)}
								let matchedFiles = 
										files
										.filter(f=>f._file_path.match(new RegExp(currentPattern,"u")))
								let toAdd = matchedFiles
										.filter(f=>!included.includes(f._file_path))
								if(trace.includes){console.log("  > New matches: "+toAdd.length)}
								let dupes = matchedFiles
										.filter(f=> included.includes(f._file_path))
								if(trace.includes && dupes.length){console.log("  > \x1b[33mDupe matches\x1b[0m: ",dupes.map(f=>f._file_path))}
								remaining.unshift(...toAdd)
							}
						if( typeof current == "object" ){
								let currentFile = current
								let currentPath = currentFile._file_path
								if(included.includes(currentPath)){
										if(trace.includes){console.log("  > \x1b[33mSkipping as duplicate\x1b[0m")}
										continue
									}
								if(trace.includes){console.log("\x1b[2mIncluding\x1b[0m: "+currentPath)}
								included.push(currentPath)
								//if(trace.includes){console.log("  > Included: "+file._file_path)}
								if(currentFile._file_type=="model" && currentFile.model){
										currentFile={...currentFile,...Object.values(currentFile.model)[0]}
										delete currentFile.model
									}
								let includes = coerceArray(currentFile.include)
								let patterns = includes
									.map(inc=>lookerpattern2Regex(inc,path.dirname(currentPath)))
								if(trace.includes && includes.length){
									console.log("  > Includes:", includes )
									console.log("  > Queued: ", patterns)
									}
								remaining.unshift(...patterns)
								toMerge.push(currentFile)	
							}
					}
			
			return merge(...toMerge)
		}
		function coerceArray(x){
			if(x===undefined){return []}
			if(x instanceof Array){return x.slice()}
			return [x]
		}
		function lookerpattern2Regex(str, from){
				// Not sure what the official spec is for Looker file match patterns, but I know *, so that will do for now
				return "^"+str
									.replace(/^(?!\/)/,(from=='.')?'':from+'/') // If no leading slash, then relative match
									.replace(/^\//,'') //Leading slash not needed in regex
									.replace(/[.${}^[\]]/g,ch=>('\\'+ch)) //Things which would be literals
									.replace(/\*/g,"[^/]*") //* is splat, but not for directories
									.replace(/\[\^\/\]\*\[\^\/\]\*(\/\[\^\/\]\*|\/\[\^\/\]\*\[\^\/\]\*)*/g,".*") 
										//** is splat, including directories
									.replace(/\.(view|model|explore)$/,".$1.lkml") //Types that are implicitly .lkml
									// I assume dashboards get an implict extension too, but they're out of scope here
									+"$"
			}
		function unique(x,i,arr){return arr.indexOf(x)==i}
		function flatten(a,b){return a.concat(b)}
		function indexBy(key){
			return (typeof key=="function"
				? (obj,x,i) => ({...obj, [key(x)]:x})
				: (obj,x,i) => ({...obj, [x[key]]:x})
				)
			}
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
