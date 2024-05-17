const recursiveRemoveProperty = require("./recursive-remove-property.js")
const path = require("path")
const indexBy = require("../common/index-by.js")

module.exports = transformations_assembleModels

/** Given a project with a `file` object, finds model files, follows include statements from them, and adds the results to a model object
 * 
 * @param {object} trace An object with boolean properties indicating whether specific types of tracing should be logged. Possible keys: `includes`
 */
function transformations_assembleModels(project,{
	trace={}
	}={}){
	if(!project){
		return project //add warnings
		}
	if(!project.file || typeof project.file !== 'object'){
		return project //add warnings
		}

	const files = Object.values(project.file)
	const modelFiles = files.filter(f=>f.$file_type=="model" && f.model)
	if(trace.includes){
		console.log("Files: ",files.map(f=>f.$file_path))
		console.log("Models: ",modelFiles.map(f=>f.$file_path))
		}
	const models = modelFiles.map(mf=>{
		try{ return iterateIncludes(mf, files, trace) }
		catch(err){return {$name:mf.$name, error:err.toString()}}			
		})

	project.model = Object.values(models).reduce(indexBy("$name"),{})
	return project
	}

function iterateIncludes(modelFile, files, trace){
	var toMerge = []
	var remaining = [modelFile]
	var included =[]
	if(trace.includes){console.log("Starting from model: ",modelFile.$file_name)}
	while(remaining.length){
			let current = remaining.shift()
			if( typeof current == "string"){
					let currentPattern = current
					if(trace.includes){console.log("Searching: "+current)}
					let matchedFiles = 
							files
							.filter(f=>f.$file_path.match(new RegExp(currentPattern,"u")))
					let toAdd = matchedFiles
							.filter(f=>!included.includes(f.$file_path))
					if(trace.includes){console.log("  > New matches: "+toAdd.length)}
					let dupes = matchedFiles
							.filter(f=> included.includes(f.$file_path))
					if(trace.includes && dupes.length){console.log("  > \x1b[33mDupe matches\x1b[0m: ",dupes.map(f=>f.$file_path))}
					remaining.unshift(...toAdd)
				}
			if( typeof current == "object" ){
					let currentFile = current
					let currentPath = currentFile.$file_path
					if(included.includes(currentPath)){
							if(trace.includes){console.log("  > \x1b[33mSkipping as duplicate\x1b[0m")}
							continue
						}
					if(trace.includes){console.log("\x1b[2mIncluding\x1b[0m: "+currentPath)}
					included.push(currentPath)

					// Remove $strings (from cloned contents) before assembling
					// (could be kept in the future, but need to think through corner cases)
					currentFile = recursiveRemoveProperty(
						JSON.parse(JSON.stringify(currentFile)),
						"$strings"
						)
					if(currentFile.$file_type=="model" && currentFile.model){
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
	// First, convert all relative, project-root (/), and project import (//) patterns into project-root, without a leading slash
	if(str[0] === "/"){
		if(str[1] == "/"){
			// Project import
			str = "imported_projects/" + str.slice(2)
			}
		else {
			// Project root
			str = str.slice(1)
			}
		}
	else {
		// Relative path
		if(from !== "."){str = from + "/" + str}
	}

	//Next resolve all ".." expressions within the project
	for(let r = /[^\/]+\/\.\.\//; str.match(r); str = str.replace(r,'')){}
	
	// "Convert" the pattern into a regex
	return "^"+str
		.replace(/[.${}^[\]]/g,ch=>('\\'+ch)) //Things which would need to be escped in regex to be literals
		.replace(/\*/g,"[^/]*") //* is splat, but not for directories
		.replace(/\[\^\/\]\*\[\^\/\]\*(\/\[\^\/\]\*|\/\[\^\/\]\*\[\^\/\]\*)*/g,".*") 
			//** is splat, including directories
		.replace(/\.(view|model|explore)$/,".$1.lkml") //Types that are implicitly .lkml
		// I assume dashboards get an implict extension too, but they're out of scope here
		+"$"
	}
function unique(x,i,arr){return arr.indexOf(x)==i}
function flatten(a,b){return a.concat(b)}
function peek(x){console.log(x); return x}
function merge(...objs){
		const defined = val => val!==undefined
		const has = key => obj => obj[key]!==undefined
		return objs
		.map(o=>Object.keys(o))
		.reduce(flatten,[])
		.filter(unique)
		.reduce((merged,key)=>({
				...merged,
				[key]: key === "$name"	
					? objs.find(has(key))[key] // Always take the first model's name (in case of a model including another model)
					: objs.map(o=>o[key]).filter(defined).filter(unique).length===1	//Only one unique value?
						? objs.find(has(key))[key]									//Use the unique value
						: objs.filter(has(key)).every(o=>objectIsMergeable(o[key])) 	// Oherwise, all mergeable collections?
							? merge(...objs.filter(has(key)).map(o=>o[key])) 			// Merge them
							: objs.filter(has(key)).map(o=>o[key]).reduce(flatten,[])	// Make an array of them
			}),{})
	}
function objectIsMergeable(obj){
	//Make sure the object is not a value (like a `view:foo {}` or `derived_table: {...}` )
	return obj && typeof obj == "object" && !obj.$type && !Array.isArray(obj)
	}