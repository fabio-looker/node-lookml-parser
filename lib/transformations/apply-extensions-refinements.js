const defaultObjectTypes = ['explore','view']



module.exports = transformations_applyExtensionsRefinements

/** Applies declarations from extensions and refinements to objects within models
 * @param {string[]} objectTypes the types of objects to be checked for extensions/refinements. Defaults to ['explore','view'].
 * @param {number} maxObjectCache Maximum number of objects to cache/memoize for performance reasons. Defaults to 1000.
 */
function transformations_applyExtensionsRefinements(project, {
		objectTypes = defaultObjectTypes,
		maxObjectCache = 1000
	}){

	// Extensions first? Refinements first? Make a graph?
	for(let m of project.model){
		let model = project.model[m]
		for(let objectType of objectTypes){
			let collection = model[objectType]
			for(let key of collection){
				if(key[0]!="+"){
					//Don't need to initiate any searches from refinements
					continue
					}
				let object = collection[key]

				}
		}
	}
}

function breadthFirstPaths(root,model){
		if(!root){throw "Root required"}
		if(!model){throw "model required"}
		if(!model[root.$type]){throw "model must contain objects of same type as root"}
		const paths = recurseBreadthFirstPaths(root,model)
		// Dedupe step?
		return paths
	}

function recurseBreadthFirstPaths(root,model){
	let rootPath = [root.$type, root.$name]
	let shallowExtensionPaths = (root.extends||[])
		.map(e=>[root.$type,e])
	let shallowRefinementPaths = (model[root.$type]["+"+root.$name]||[])
		.map((r,ri)=>[root.$type,"+"+root.$name,ri])
	let shallowPaths = [
		...extensionPaths,
		...refinementPaths
		]
	let deepPathsOrErrors = shallowPaths.map(p=>{
		let target = deref(p)
		if(!target){
			return `Error: ${p.join('.')}, referenced from ${rootPath.join('.')} does not exist`
			}
		return recurseBreadthFirstPaths(target, model)
		})
	}
