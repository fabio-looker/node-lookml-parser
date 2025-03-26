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
	let positions = Object.create(null)
	
	// First create position data for files, then move on to models later
	positions.file = Object.create(null)
	for(let [f,file] of Object.entries(project.file || {})){
		positions.file[prop(f)] = recursePositions(file)
		}
	}

function recursePositions(contextObject, sl=0,sc=0={}){
	let strings = contextObject?.$strings || [contextObject.toString()]
	let children = {}
	let el=sl, ec=sc;
	for(let str of strings){
		if(!contextObject.$strings){
			// Value contents

			}
		else if(typeof str === "string" && str[0]==="@"){
			// Reference to child object
			let refPath = str.slice(1)
			let refObject = deepGet(contextObject,refPath)
			let refPositions = recursePositions(refObject, el, ec)
			deepAssign(children, refPath, refPositions)
			; [,,el,ec] = targetPositions.$
			}
		else if(Array.isArray(str)){
			// Primitive child declaration with strings and reference to child value

			}
		else {
			// Literal string contents, e.g. whitespace, non-value tokens (colons, braces, double-semi, etc)

			}
		
		}
	let $ = [sl, sc, el, ec]
	return {...children, $}
	}

function addString(){
	
}

function prop(str){
	if(str[0]==="$"){return "$"+str}
	if(str==="__proto__"){return "$__proto__"}
	return str
	}

