const deepGet = require("../common/deep-get.js")
const encodeProperty = require("../common/encode-property.js")
const {getPositionsRecurse} = require("../positions/get-positions.js")

module.exports = transformations_addPositions

/** Given a project object with a `file` and optionally a `model`, will add a `positions` index
 * 
 * @param {object} project
 * @param {object} trace An object with boolean properties indicating whether specific types of tracing should be logged. Possible keys: `includes`
 */
function transformations_addPositions(project, options = {}) {
	const trace = options.trace || {}
	const fastPositions = options.fastPositions || false
	
	if(!project.file){
		throw new Error("`project` argument must be a LookML project with the 'by-name' file representation")
		}	
	
	let positions = {}
	let errors = []

	// First create position data for files, then move on to models later
	positions.file = {}
	if (project.file && (project.file.model || project.file.view || project.file.explore)) {
		for (const [type, fileGroup] of Object.entries(project.file)) {
			if (!fileGroup || typeof fileGroup !== 'object') continue
			for (const [relName, file] of Object.entries(fileGroup)) {
				if (!file || !file.$strings) continue
				const fKey = `${relName}.${type}`
				const {$errors, ...filePositions} = getPositionsRecurse(file.$strings, 0, 0, ['$', `file['${fKey}']`], 0, trace, file)
				positions.file[encodeProperty(fKey)] = filePositions
			}
		}
	} else {
		for (let [f, file] of Object.entries(project.file || {})) {
			if (trace.positions) { console.log(`\n📂 File: ${f}` + (file.$strings ? "" : " - No $strings")) }
			if (!file || !file.$strings) { continue }
			let { $errors, ...filePositions } = getPositionsRecurse(file.$strings, 0, 0, ['$', `file['${f}']`], 0, trace, file)
			positions.file[encodeProperty(f)] = filePositions
		}
	}

	// Use the files' position data to populate positions for model objects
	positions.model = {}
	for(let [m,model] of Object.entries(project.model || {})){
		if(trace.positions){console.log(`\n📘 Model: ${m}`)}
		let filePaths = coerceArray(model.$file_path).map(full => full.replace(/\.lkml$/,""))
		let {$errors, ...modelPositions} = recurseModels(
			model, [`model`,m], filePaths, positions.file, trace, 0, 0, fastPositions, model, project
			)
		positions.model[encodeProperty(m)] = modelPositions
		}
		
	
	// Add position and error data to project
	project.positions = positions
	if(errors.length){
		project.errors = project.errors ?? []
		project.errors.push(...errors)
		}
	}

function recurseModels(context, valuePath, modelFiles=[], filePositions, trace, d=0, lastMatchedFileIdx=0, fastPositions=false, model=context, project=undefined){
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
		const isContainerOrChild = pathFromModel.length >= 2 && (pathFromModel[0] === "view" || pathFromModel[0] === "explore")

		if (isContainerOrChild) {
			const type = pathFromModel[0]
			const name = pathFromModel[1]
			const propPath = pathFromModel.slice(2)
			const found = findPositionData(type, name, propPath, modelFiles, filePositions, model, project)
			if (found) {
				lastMatchedFileIdx = found.f
				$p = [found.f, ...(found.data.$p ?? [])]
				traceLog(`- Found in ${found.f}: ${modelFiles[found.f]}`)
			}
		} else {
			//traceLog(`- Searching in ${fLen} files`)
			for(let fOffset=0; fOffset<fLen; fOffset++){
				// Check starting from the last matched index, since that is most likely to be the right file 
				let f = (lastMatchedFileIdx + fOffset) % fLen
				let fPath = modelFiles[f].replace()
				let filePositionData = filePositions[fPath]
				let maybeObjectPositionData = deepGet(filePositionData,pathFromModel)

				if(maybeObjectPositionData !== undefined){
					lastMatchedFileIdx = f
					$p = [f, ...(maybeObjectPositionData.$p ?? [])]
					traceLog(`- Found in ${f}: ${fPath}`)
					break
					}
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
		if (Array.isArray(context) && context.length === 1 && typeof context[0] !== 'object') {
			let refPositions = recurseModels(context[0], valuePath, modelFiles, filePositions, trace, d+1, lastMatchedFileIdx, fastPositions, model, project)
			if (refPositions.$errors) errors.push(...refPositions.$errors)
			if (errors.length) refPositions.$errors = errors
			return refPositions
		}

		if (!fastPositions || valuePath.length < 4) {
			for(let [k,val] of Object.entries(context)){
				if(k[0]==="$"){
					traceLog(`@ ${k} : Skipping metadata key`)
					continue
					}
				traceLog(`@ ${k} : ${logtype(val)}`)
				let refPositions = recurseModels(
					val, [...valuePath, k], modelFiles, filePositions, trace, d+1, lastMatchedFileIdx, fastPositions, model, project
					)
				if(refPositions.$errors){
					errors.push(...refPositions.$errors)
					}
				children[encodeProperty(k)] = refPositions
				}
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

function coerceArray(x){
	if(Array.isArray(x)){return x}
	if(x === undefined){return []}
	return [x]
	}

function getExtendsChain(type, name, model, project, modelFiles, visited = new Set()) {
	if (visited.has(name)) return []
	visited.add(name)

	let extendsVal = model?.[type]?.[name]?.extends
	if (!extendsVal && project?.file && modelFiles) {
		for (const fPath of modelFiles) {
			const fileObj = project.file[fPath] || project.file[fPath + '.lkml']
			if (fileObj?.[type]?.[name]?.extends) {
				extendsVal = fileObj[type][name].extends
				break
			}
		}
	}

	if (!extendsVal) return []
	const chain = []
	for (const ext of coerceArray(extendsVal).flat()) {
		if (typeof ext === 'string') {
			chain.push(ext, ...getExtendsChain(type, ext, model, project, modelFiles, visited))
		}
	}
	return chain
}

function searchName(type, name, propPath, modelFiles, filePositions, preferDirect) {
	const fLen = modelFiles.length
	const direct = () => {
		for (let f = 0; f < fLen; f++) {
			const obj = filePositions[modelFiles[f]]?.[type]?.[name]
			if (obj !== undefined) {
				const match = propPath.length === 0 ? obj : deepGet(obj, propPath)
				if (match !== undefined) return { f, data: match }
			}
		}
	}
	const refs = () => {
		for (let f = fLen - 1; f >= 0; f--) {
			const refList = filePositions[modelFiles[f]]?.[type]?.['+' + name]
			if (refList) {
				const list = coerceArray(refList)
				for (let r = list.length - 1; r >= 0; r--) {
					const match = propPath.length === 0 ? list[r] : deepGet(list[r], propPath)
					if (match !== undefined) return { f, data: match }
				}
			}
		}
	}
	return preferDirect ? (direct() || refs()) : (refs() || direct())
}

function findPositionData(type, name, propPath, modelFiles, filePositions, model, project) {
	const preferDirect = propPath.length === 0
	let found = searchName(type, name, propPath, modelFiles, filePositions, preferDirect)
	if (!found && propPath.length > 0) {
		const chain = getExtendsChain(type, name, model, project, modelFiles)
		for (let i = chain.length - 1; i >= 0; i--) {
			found = searchName(type, chain[i], propPath, modelFiles, filePositions, false)
			if (found) break
		}
	}
	return found
}
