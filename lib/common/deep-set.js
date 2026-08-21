
const encodeProperty = require('./encode-property.js')

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
	let safeHead = encodeProperty(head);
	if (path.length === 1) {
		return object[safeHead] = value
		}
	let tail = path.slice(1);
	if(object[safeHead] === undefined){
		if(isNaN(head)){
			object[safeHead] = {}
			}
		else {
			object[safeHead] = []
			}
		}
	return _deepSet(object[safeHead], tail, value);
	}