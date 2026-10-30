const recursiveRemoveProperty = require("./recursive-remove-property.js")
const path = require("path")
const indexBy = require("../common/index-by.js")

const UNQUALIFIED_CONSTANT_REGEX = /@\{([a-zA-Z0-9_]+)\}/g
const META_KEYS_NO_QUALIFY = new Set([
	"$file_path",
	"$file_rel",
	"$file_name",
	"$file_type",
	"$type",
	"$name",
	"$ast",
	"$strings",
	"include",
	"errors",
	"info"
])

module.exports = transformations_assembleModels

function isModelFile(f) {
	if (!f || typeof f !== "object") return false
	if (f.$file_path) {
		return /\.model\.(lkml|lookml)$/i.test(f.$file_path)
	}
	return f.$file_type == "model"
}

function getModelName(f) {
	if (f && f.$file_name) return f.$file_name
	if (f && f.$file_path) {
		return path.basename(f.$file_path).replace(/\.(model\.)?(lkml|lookml)$/i, "")
	}
	return undefined
}

function qualifyConstantString(str, projectName) {
	if (typeof str !== "string" || !str.includes("@{")) return str
	return str.replace(UNQUALIFIED_CONSTANT_REGEX, `@{//${projectName}/$1}`)
}

function qualifyImportedConstants(node, projectName) {
	if (typeof node === "string") {
		return qualifyConstantString(node, projectName)
	}
	if (!node || typeof node !== "object") {
		return node
	}
	if (Array.isArray(node)) {
		return node.map(item => qualifyImportedConstants(item, projectName))
	}
	const result = {}
	for (const [key, val] of Object.entries(node)) {
		if (META_KEYS_NO_QUALIFY.has(key) || key.startsWith("$")) {
			result[key] = val
			continue
		}
		result[key] = qualifyImportedConstants(val, projectName)
	}
	return result
}

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
	const modelFiles = files.filter(f=>isModelFile(f))
	if(trace.includes){
		console.log("Files: ",files.map(f=>f.$file_path))
		console.log( "Models: ",modelFiles.map(f=>f.$file_path))
		}
	const models = modelFiles.map(mf=>{
		try{ return iterateIncludes(mf, files, trace) }
		catch(err){
			if(trace.includes){console.error(err)}
			return {$name:getModelName(mf), error:err.toString()}
			}			
		})
	project.model = Object.values(models).reduce(indexBy("$name"),{})
	return project
	}

function iterateIncludes(modelFile, files, trace){
	var toMerge = []
	var remaining = [modelFile]
	var included =[]
	const modelName = getModelName(modelFile)
	if(trace.includes){console.log(`\n\n🏁🏁🏁\n🏁🏁🏁 Starting from model: ${modelName}\n🏁🏁🏁\n`)}
	while(remaining.length){
			let current = remaining.shift()
			if( typeof current == "string"){
					let currentPattern = current
					if(trace.includes){console.log("🔎 Searching: "+current)}
					let matchedFiles = 
							files
							.filter(f=>f.$file_path.match(new RegExp(currentPattern,"u")))
					let toAdd = matchedFiles
							.filter(f=>!included.includes(f.$file_path))
					if(trace.includes){console.log(`  > ${toAdd.length?"\x1b[32m":"\x1b[90m"}New matches: ${arr2Str(toAdd.map(f=>f.$file_path))}\x1b[0m`)}
					let dupes = matchedFiles
							.filter(f=> included.includes(f.$file_path))
					if(trace.includes && dupes.length){console.log(`  > \x1b[90mDupe matches: ${arr2Str(dupes.map(f=>f.$file_path))}\x1b[0m`)}
					remaining.unshift(...toAdd)
				}
			if( typeof current == "object" ){
					let currentFile = current
					let currentPath = currentFile.$file_path
					if(included.includes(currentPath)){
							if(trace.includes){console.log("  > \x1b[90mSkipping as duplicate\x1b[0m: "+currentPath)}
							continue
						}
					if(trace.includes){console.log("📥 \x1b[2mIncluding\x1b[0m: "+currentPath)}
					included.push(currentPath)

					// Remove $strings (from cloned contents) before assembling
					// (could be kept in the future, but need to think through corner cases)
					currentFile = recursiveRemoveProperty(
						JSON.parse(JSON.stringify(currentFile)),
						"$strings"
						)
					if(isModelFile(currentFile) && currentFile.model){
							currentFile={...currentFile,...Object.values(currentFile.model)[0]}
							delete currentFile.model
						}
					const importedMatch = currentPath && currentPath.match(/^(?:\.\/)?imported_projects\/([^/]+)\//)
					if (importedMatch) {
						currentFile = qualifyImportedConstants(currentFile, importedMatch[1])
					}
					let includes = coerceArray(currentFile.include)
					let patterns = includes
						.map(inc=>lookerpattern2Regex(inc,path.dirname(currentPath)))
					if(trace.includes && includes.length){
						console.log(`  > \x1b[90mIncludes: ${arr2Str(includes)}\x1b[0m`)
						console.log(`  > Q4Search: ${arr2Str(patterns)}`)
						}
					remaining.unshift(...patterns)
					toMerge.push(currentFile)	
				}
		}
	if(trace.includes){console.log(`Include queue empty, finishing ${modelName}`)}
	
	return {
		$type: "model",
		$name: modelName,
		...merge(...toMerge)
		}

	function arr2Str(arr){
		return ""+arr.length+arr.map(s=>"\n   "+s).join("")
		}
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
			const isFromImportedProject = from.match(/^imported_projects\/([^\/]+)/)
			if(isFromImportedProject){
				// Project root path from within the context of an imported project
				str = "imported_projects/"+isFromImportedProject[1]+ str
			}
			else {
				// Project root path from the context of the base project
				str = str.slice(1)
				}
			}
		}
	else {
		// Relative path
		if(from !== "."){str = from + "/" + str}
	}

	//Next resolve all ".." expressions within the project
	for(let r = /[^\/]+\/\.\.\//; str.match(r); str = str.replace(r,'')){}
	const isImportedProject = str.startsWith("imported_projects/")
	
	// Convert implicit extensions
	str = str
		.replace(/\.(view|model|explore)$/,".$1.lkml") //Types that are implicitly .lkml
		.replace(/\.(dashboard)$/,".$1.lookml") //Types that are implicitly .lookml

	// Escape special regex characters except *
	str = str.replace(/[.${}^[\]()+?|\\]/g, ch => '\\' + ch)

	// Convert ** and * wildcards into regex pattern
	str = str
		.replace(/\/\*\*\//g, "__SLASH_STARSTAR_SLASH__")
		.replace(/^\*\*\//g, "__STARSTAR_SLASH__")
		.replace(/\/\*\*$/g, "__SLASH_STARSTAR__")
		.replace(/^\*\*$/g, "__STARSTAR__")
		.replace(/\*\*/g, "__ANY__")
		.replace(/\*/g, "[^/]*")
		.replace(/__SLASH_STARSTAR_SLASH__/g, "(?:/.*)?/")
		.replace(/__STARSTAR_SLASH__/g, "(?:.*/)?")
		.replace(/__SLASH_STARSTAR__/g, "(?:/.*)?")
		.replace(/__STARSTAR__/g, ".*")
		.replace(/__ANY__/g, ".*")

	return "^" + (isImportedProject ? "" : "(?!imported_projects/)") + str + "$"
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