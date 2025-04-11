
module.exports = function deepSet(object, path, value) {
	if (typeof path == 'string') {
		path = path.split('.')
		}
	if (path===undefined || path===null) {
		throw new Error("deepSet path is required")
		}
	path = path.filter(Boolean)
	return _deepSet(object, path, value);
	}

function _deepSet(object, path, value) {
	if(path.length === 0 ){
		throw new Error("deepSet path must not be empty")
		}
	let head = path[0];
	if (path.length === 1) {
		return object[safe(head)] = value
		}
	let tail = path.slice(1);
	if(object[safe(head)] === undefined){
		if(isNaN(head)){
			object[safe(head)] = {}
			}
		else {
			object[safe(head)] = []
			}
		}
	return _deepSet(object[safe(head)], tail, value);
	}

function safe(prop){
	if(['__proto__', 'prototype', 'constructor'].includes(prop)
	){return '$'+prop}
	return prop
	}