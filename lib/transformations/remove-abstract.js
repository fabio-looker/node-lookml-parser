// Placeholder - Will remove any reference that are "abstract" - refinements and extension:required declarations

const defaultObjectTypes = ['explore','view']

module.exports = transformations_removeAbstract

/** Removes any reference that are "abstract" - refinements and extension:required declarations
 * @param {string[]} objectTypes the types of objects to be checked for extensions/refinements. Defaults to ['explore','view'].
 */

function transformations_removeAbstract(project, {
		objectTypes = defaultObjectTypes
	}){
	if(!project){
		return project //add warnings?
		}
	if(!project.model || typeof project.model !== 'object'){
		return project //add warnings?
		}

	// Iterate into the models in project.model, and then into the object types (explore, view) within the model
	for(let m of Object.keys(project.model)){
		let model = project.model[m]
		for(let objectType of objectTypes){
			let collection = model[objectType]
			if(!collection){continue}
			for(let key of Object.keys(collection)){
				// Delete refinements
				if(key[0]=="+"){
					delete collection[key]
					}
				// Delete objects with extension: required
				let object = collection[key]
				if(collection[key] && collection[key].extension == 'required'){
					delete collection[key]
					}
				}
			}
		}
	}