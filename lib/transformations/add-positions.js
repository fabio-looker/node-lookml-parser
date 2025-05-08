const deepGet = require("../common/deep-get.js")
const {getPositionsRecurse} = require("../positions/get-positions.js")

module.exports = transformations_addPositions

/** Given a project object with a `file` and optionally a `model`, will add a `positions` index
 * 
 * @param {object} project
 * @param {object} trace An object with boolean properties indicating whether specific types of tracing should be logged. Possible keys: `includes`
 */
function transformations_addPositions(project,{
	trace={}
	}={}){
	
	if(!project.file){
		throw new Error("`project` argument must be a LookML project with the 'by-name' file representatio")
		}	
	
	let positions = {}
	let errors = []

	// First create position data for files, then move on to models later
	positions.file = {}
	for(let [f,file] of Object.entries(project.file || {})){
		if(trace.positions){console.log(`\n📂 File: ${f}` + (file.$strings?"":" - No $strings"))}
		if(!file.$strings){continue}
		let {$errors, ...filePositions} = getPositionsRecurse(file,0,0,['$',`file['${f}']`],0,trace)
		positions.file[safe(f)] = filePositions
		if($errors){errors.push(...$errors.map(err =>({$file_path:f,message:err })))}
		}

	// Use the files' position data to populate positions for model objects
	positions.model = {}
	for(let [m,model] of Object.entries(project.model || {})){
		if(trace.positions){console.log(`\n📘 Model: ${m}`)}
		let filePaths = coerceArray(model.$file_path).map(full => full.replace(/\.lkml$/,""))
		let {$errors, ...modelPositions} = recurseModels(
			model, [`model`,m], filePaths, positions.file, trace, 
			)
		positions.model[safe(m)] = modelPositions
		}
		
	
	// Add position and error data to project
	project.positions = positions
	if(errors.length){
		project.errors = project.errors ?? []
		project.errors.push(...errors)
		}
	}

function recurseModels(context, valuePath, modelFiles=[], filePositions, trace, d=0, lastMatchedFileIdx=0){
	let logPadding = (new Array(d+2)).join("  ")
	let traceLog = trace.positions
		? (x)=>{console.log(logPadding + x)}
		: ()=>{}
	traceLog("$."+valuePath.join("."))

	let $p, positionsNotFound
	//Find the position of the context (for levels deeper than model root)
	if(!context){traceLog("- No such context")}
	else if(valuePath.length<=2){traceLog("- Skipping $p for root model")}
	else if(typeof context == "object" && !context.$type && !Array.isArray(context)){
		traceLog(`- Skipping $p for presumed collection: ${logtype(context)}`)
		}
	else {
		let pathFromModel = valuePath.slice(2)
		let fLen = modelFiles.length
		//traceLog(`- Searching in ${fLen} files`)
		for(let fOffset=0; fOffset<fLen; fOffset++){
			// Check starting from the last matched index, since that is most likely to be the right file 
			let f = (lastMatchedFileIdx + fOffset) % fLen
			let fPath = modelFiles[f].replace()
			let filePositionData = filePositions[fPath]
			let maybeObjectPositionData = deepGet(filePositionData,pathFromModel)
			
			// Future version: Add a search through refinements and objects from which the participating objects extend

			if(maybeObjectPositionData !== undefined){
				lastMatchedFileIdx = f
				$p = [f, ...(maybeObjectPositionData.$p ?? [])]
				traceLog(`- Found in ${f}: ${fPath}`)
				break
				}
			}
		if(!$p){
			positionsNotFound = true
			traceLog(`- Not found`)
			}
		}

	let children = {}
	let errors = []

	// Recurse into the positions of the children
	if(typeof context === "object" && !positionsNotFound){
		for(let [k,val] of Object.entries(context)){
			if(k[0]==="$"){
				traceLog(`@ ${k} : Skipping metadata key`)
				continue
				}
			traceLog(`@ ${k} : ${logtype(val)}`)
			let refPositions = recurseModels(
				val, [...valuePath, k], modelFiles, filePositions, trace, d+1, lastMatchedFileIdx
				)
			if(refPositions.$errors){
				errors.push(...refPositions.$errors)
				}
			children[safe(k)] = refPositions
			}
		}

	if($p){children.$p = $p}
	if(errors.length){children.$errors = errors}
	return children
	}


function logtype(x){
	return Array.isArray(x) ? 'array'
		: x === null ? 'null'
		: typeof x === "object" ? `object(${Object.keys(x).slice(0,6).join(",")})` 
		: typeof x
	}

function safe(prop){
	if(['__proto__', 'prototype', 'constructor'].includes(prop)
	){return '$'+prop}
	return prop
	}

function coerceArray(x){
	if(Array.isArray(x)){return x}
	if(x === undefined){return []}
	return [x]
	}
