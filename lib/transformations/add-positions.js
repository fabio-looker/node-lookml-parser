const deepGet = require("../common/deep-get.js")
const deepSet = require("../common/deep-set.js")
const encodeProperty = require("../common/encode-property.js")

module.exports = transformations_addPositions

/** Given a project object with a `file` and optionally a `model`, will add a `positions` index
 * 
 * @param {object} project
 * @param {object} trace An object with boolean properties indicating whether specific types of tracing should be logged. Possible keys: `includes`
 */
function transformations_addPositions(project,{
	trace={}
	}={}){
	let positions = {}
	let errors = []

	// First create position data for files, then move on to models later
	positions.file = {}
	for(let [f,file] of Object.entries(project.file || {})){
		if(trace.positions){console.log(`\n📂 File: ${f}` + (file.$strings?"":" - No $strings"))}
		if(!file.$strings){continue}
		let {$errors, ...filePositions} = recurseStrings(file,1,1,['$',`file['${f}']`],0,trace)
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
	if(errors){
		project.errors = project.errors ?? []
		project.errors.push(...errors)
		}
	}

function recurseStrings(context, sl=1,sc=1, logPath=["$"], d=0, trace, valueContainer, valuePath){
	let logPadding = (new Array(d+2)).join("  ")
	let traceLog = trace.positions
		? (x)=>{console.log(logPadding + x)}
		: ()=>{}
	traceLog(`${logPath.join(".")}`)
	let contextIsStringsNode = Boolean(context?.$strings || context?.substrings)
	let elements = 
		context?.$strings
		?? context?.substrings
		?? [context]
	if(context?.$strings){
		valueContainer = context
		valuePath = []
		}
	traceLog(`- ctx: ${logtype(context)}`)
	traceLog(`- ctx.$str: ${logtype(context?.$strings)}`)
	traceLog(`- ctx.substr: ${logtype(context?.substrings)}`)
	traceLog(`- valCtr: ${logtype(valueContainer)}`)
	traceLog(`- valPath: ${valuePath?.join(".")}`)
	traceLog(`- els: ${elements.length}`)

	let children = {}
	let errors = []
	let el=sl, ec=sc;
	for(let e of elements){
		if(contextIsStringsNode && isRef(e)){
			let refPath = Array.isArray(e)
				// Non-object child with combined strings and references to child value(s)
				? e[0].split(".")
				// Reference to child object
				: e.slice(1).split(".")
			let refValuePath = [...valuePath, ...refPath]
			let refContext = Array.isArray(e)
				? {substrings: e.slice(1)}
				: deepGet(valueContainer, refValuePath)
			traceLog(`@ '${refPath.join(".")}' -> ${refValuePath.join(".")} -> ${logtype(refContext)}`)
			let refPositions = recurseStrings(
				refContext, el, ec, [...logPath,...refPath], d+1, trace, valueContainer, refValuePath, children
				)
			let {$errors, $p} = refPositions
			if(refPath[0]){
				// ^ I could also report the position of the value itself, but it would require an additional abstraction
				// and be of marginal benefit compared to the position of the declaration as a whole, so I'll hold off			
				deepSet(children, refPath, refPositions)
				}
			if($errors){
				errors.push(...$errors)
				traceLog(`! Breaking due to returned error(s) at ${logPath.join(".")} + ${refPath.join(".")}`)
				break
				}
			if($p){
				[,,el,ec] = $p
				}
			}
		else {
			// Either:
			// - Context is a primitive value
			// - Context is an array from $strings, and this element is literal string contents
			// - Context has $strings, and this element is literal string contents, e.g. whitespace, non-value tokens (colons, braces, double-semi, etc)
			// - Context is an object, but does not have $strings (e.g. a file with a syntax error)
			if(typeof e === "undefined"){
				traceLog(`! Unexpected undefined at ${logPath.join(".")}`)
				errors.push(`addPositions is due to unexpected condition at ${logPath.join(".")}`)
				break
				}
			if(typeof e === "object"){
				//For example, this may be a file with a syntax error
				traceLog(`! Object without $strings at ${logPath.join(".")}. Keys: ${Object.keys(context)}`)
				errors.push(`addPositions is unable to add positions for object without $strings at ${logPath.join(".")}`)
				break
				}
			let str = 
				e === true ? "yes"
				: e === false ? "no"
				: e.toString() //Could be some other primitive like a number. 
			// Note: Although we might not have the exact right number of characters from the primitive.toString conversion,
			// (e.g. for a float?) it should at least be a 1-line value and thus have the right number of lines
			let lines = str.split(/\r\n|\r|\n/)
			let lastLine = lines[lines.length-1]
			el = el + lines.length - 1
			ec = (lines.length > 1 ? 0 : ec) + lastLine.length
			}
		}
	traceLog(`- ${elements?.length ?? "No"} els. ${sl},${sc} -> ${el},${ec}`)
	return {
		...children,
		...(errors.length
			? {$p: [sl,sc], $errors: errors}
			: {$p: [sl, sc, el, ec]}
			)
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
			// if(pathFromModel[0] === "connection"){
			// 	console.log(`\nf: ${f}`)
			// 	console.log(`fPath: ${fPath}`)
			// 	console.log(`filePositionData: ${logtype(filePositionData)}`)
			// 	console.log(`maybeObjectPositionData: ${logtype(maybeObjectPositionData)}`)
			// }
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

function isRef(el){
	return Array.isArray(el) || typeof el === "string" && el[0] === "@"
	}

function coerceArray(x){
	if(Array.isArray(x)){return x}
	if(x === undefined){return []}
	return [x]
	}
