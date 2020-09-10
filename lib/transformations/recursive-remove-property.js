module.exports = function recursiveRemoveProperty(obj,removeProp){
	if(!removeProp){return obj}
	_recursiveRemoveProperty(obj,removeProp)
	return obj
	}

function _recursiveRemoveProperty(obj,removeProp){
	if(!obj){return}
	if(Array.isArray(obj)){
		for(let arrayItem of obj){
			_recursiveRemoveProperty(arrayItem,removeProp)
			}
		return
		}
	for(let prop in obj){
		if(!obj.hasOwnProperty(prop)){continue}
		if(prop === removeProp){
			delete obj[prop]
			continue
			}
		if(typeof obj[prop] === "object"){
			_recursiveRemoveProperty(obj[prop],removeProp)
			}
		}

	}