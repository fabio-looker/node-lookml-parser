const defaultObjectTypes = ['explore','view']



module.exports = transformations_applyExtensionsRefinements

/** Applies declarations from extensions and refinements to objects within models
 * @param {string[]} objectTypes the types of objects to be checked for extensions/refinements. Defaults to ['explore','view'].
 */
function transformations_applyExtensionsRefinements(project, {
		objectTypes = defaultObjectTypes,
		indexRefinementsExtensions = false
	}={}){
	if(!project){
		return project //add warnings
		}
	if(!project.model || typeof project.model !== 'object'){
		return project //add warnings
		}

	if(indexRefinementsExtensions){
		project.indexRefinementsExtensions = project.indexRefinementsExtensions || {}
	}

	// Iterate into the models in project.model, and then into the object types (explore, view) within the model
	for(let m of Object.keys(project.model)){
		let model = project.model[m]
		let modelFiles = coerceArray(model.$file_path).map(full => full.replace(/\.lkml$/,""))
		let containerMap = {}
		if (indexRefinementsExtensions && project.file) {
			for (let fIdx = 0; fIdx < modelFiles.length; fIdx++) {
				const fPath = modelFiles[fIdx]
				const fileObj = project.file[fPath] || project.file[fPath + '.lkml']
				if (!fileObj) continue
				for (const objType of objectTypes) {
					const col = fileObj[objType]
					if (!col || typeof col !== 'object') continue
					for (const [cName, cVal] of Object.entries(col)) {
						const mapKey = `${objType}.${cName}`
						if (cName[0] === '+') {
							if (!containerMap[mapKey]) containerMap[mapKey] = []
							const list = coerceArray(cVal)
							for (let localIdx = 0; localIdx < list.length; localIdx++) {
								containerMap[mapKey].push({
									fileIdx: fIdx,
									pathInFile: list.length > 1 || Array.isArray(cVal) ? [objType, cName, localIdx] : [objType, cName]
								})
							}
						} else {
							containerMap[mapKey] = [{
								fileIdx: fIdx,
								pathInFile: [objType, cName]
							}]
						}
					}
				}
			}
		}

		for(let objectType of objectTypes){
			let collection = model[objectType]
			if(!collection){continue}

			// We'll temporarily store new versions of the objects in a separate place, so as to not "double apply" any extensions
			const newObjects = {}

			// First we'll search for objects that need to be updatd
			for(let key of Object.keys(collection)){
				if(key[0]=="+"){
					//Don't need to initiate any searches from refinements
					continue
					}
				let object = collection[key]
				if(object.extension == 'required'){
					//Don't need to initiate any searches from abstract objects
					continue
					}
				// Find objects to apply
				const {objectsToApply, sourcesToApply, info} = findObjectsToApply(object,[objectType,key],model)

				//Do something with info messages?
				//console.log({path:`${m}.${objectType}.${key}`,info})

				// Apply discovered objects into the newObject
				if(objectsToApply.length<=1){
					continue
					}
				const newObject = objectsToApply.reduce(merge,{})

				if(indexRefinementsExtensions && sourcesToApply){
					const participatingContainers = sourcesToApply.map(item => {
						const [sType, sName, sOffset] = item.path
						const sMapKey = `${sType}.${sName}`
						const containerLoc = sName[0] === '+'
							? containerMap[sMapKey]?.[sOffset] || { fileIdx: 0, pathInFile: item.path }
							: containerMap[sMapKey]?.[0] || { fileIdx: 0, pathInFile: item.path }
						return {
							object: item.object,
							fileIdx: containerLoc.fileIdx,
							pathInFile: containerLoc.pathInFile
						}
					})

					const containerKey = pathToString(['model', m, objectType, key])
					project.indexRefinementsExtensions[containerKey] = participatingContainers.map(c => [c.fileIdx, ...c.pathInFile])

					for (const c of participatingContainers) {
						function indexObjectProps(obj, currentPropPath = []) {
							if (!obj || typeof obj !== 'object') return
							for (const [k, v] of Object.entries(obj)) {
								if (k[0] === '$') continue
								const propPath = [...currentPropPath, k]
								const fullKey = pathToString(['model', m, objectType, key, ...propPath])
								if (!project.indexRefinementsExtensions[fullKey]) {
									project.indexRefinementsExtensions[fullKey] = []
								}
								project.indexRefinementsExtensions[fullKey].push([c.fileIdx, ...c.pathInFile, ...propPath])
								if (v && typeof v === 'object' && !Array.isArray(v)) {
									indexObjectProps(v, propPath)
								}
							}
						}
						indexObjectProps(c.object)
					}
				}

				//Save it to the temporary collection
				newObjects[key] = newObject
				}
			
			// Now that we've compiled all the updated versions of the objects, merge them back into the project/model
			for(let key of Object.keys(newObjects)){
				collection[key] = newObjects[key]
				}			
			}
		}
	}

function merge(baseObject, addObject){
	let newObject = {...baseObject}
	for(let key of Object.keys(addObject)){
		if(['__proto__','prototype','constructor'].includes(key)){
			// This should not be possible because all keys/properties in the LookML parser are encoded by a function that prevents these keys
			throw new Exception(`Attempted to set disallowed key ${key} from object ${addObject.$name || '(anonymous)'}`)
		}
		let baseVal = baseObject[key]
		let addVal = addObject[key]
		let newVal

		//Special cases
		if(key === "extension" && addVal === "required"){
			// Do not carry forward `extension:required
			continue
		}
		if(key === "$name" && addVal[0] === "+"){
			// Refinements do not override the $name of an object
			continue
		}

		// Generic handling
		if(Array.isArray(baseVal)){
			//TODO: run a test in Looker for extending array-like objects since I'm not 100% sure that this is the right functionality
			newVal = baseVal.concat(newVal)
			}
		else if(baseVal && typeof baseVal === 'object' && addVal && typeof addVal === 'object'){
			newVal = merge(baseVal, addVal)
			}
		else{
			newVal = addVal
			}
		newObject[key] = newVal
		}
	return newObject
	}

function findObjectsToApply(root,rootPath,model){
	if(!root){throw "root required"}
	if(!rootPath){throw "rootPath required"}
	if(!model){throw "model required"}
	if(!model[rootPath[0]]){
		throw (`model must contain objects of same type as root. ${pathToString(rootPath)} has implied type ${rootPath[0]},`
			+` and model has keys: ${Object.keys(model).filter(k=>k[0]!=='$').join(', ')}`)
		}
	const visited = {}
	const results = recurse(root,rootPath,model,visited)
	const info = results.filter(o=>typeof o === 'string')
	const items = results.filter(o=>typeof o !== 'string')
	const objectsToApply = items.map(i => i && i.object !== undefined ? i.object : i)
	const sourcesToApply = items.map(i => i && i.path ? i : { object: i, path: rootPath })
	return {info, objectsToApply, sourcesToApply}

	function recurse(root,rootPath,model,visited){
		const [type,name,offset] = rootPath

		// Mark the path for this object as visited
		visited[pathToString(rootPath)] = true

		// Make a list of paths for extensions referenced from this object
		let shallowExtensionPaths = (root.extends || []).flat().map(e=>[type,e])

		// Make a list of paths for refinements that reference this object
		let shallowRefinementPaths = 
			name[0]=="+" ? [] // Don't attempt to find refinements if the current root is already a refinement
			: (model[type]["+"+name]||[]).map((r,ri)=>[type,"+"+name,ri])
		
	
		let shallowPaths = [
			...shallowExtensionPaths,
			root,
			...shallowRefinementPaths
			]
		
		// Recurse into each of the extending/refining objects to get a 
		let deepPathsOrInfo = shallowPaths.map(p=>{
			if(p===root){return {object: root, path: rootPath}}
			if(visited[pathToString(p)]){
				return `Info: Skipping already visited ${pathToString(p)}, referenced from ${pathToString(rootPath)}`
				}
			let target = get(model, p)
			if(!target){
				return `Info: ${pathToString(p)}, referenced from ${pathToString(rootPath)} does not exist`
				}
			return recurse(target, p, model, visited)
			})
			.reduce(flatten,[])
		
		
		return deepPathsOrInfo
		}
	}

function pathToString(path){
	return path
		.filter(part=>part!=='')
		.map(p=>(''+p).replace(/\\/g,"\\\\").replace(/\./g,"\\."))
		.join('.')
	}
function stringToPath(str){
	return str
		.split(/(?<!\\)\./)
		.filter(part=>part!=='')
		.map(part => parseInt(part) || part)
		.map(part=>part.replace(/\\D/g,'.').replace(/\\\\/g,"\\'"))
	}
function get(obj, path){
	if(typeof path == "string"){path = stringToPath(path)}
	if(path.length==0){return obj}
	const head = path[0]
	const tail = path.slice(1)
	return get(obj[head],tail)
	}
function flatten(a,b){return a.concat(b)}
function coerceArray(x){
	if(x === undefined){return []}
	if(Array.isArray(x)){return x}
	return [x]
	}