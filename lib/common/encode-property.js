module.exports = function encodeProperty(prop){
	if(typeof prop !== 'string' && prop !== parseInt(prop)){
		throw "Property ("+prop+") must be a string or integer"
		}
	if(prop[0]==='$'
	|| ['__proto__', 'prototype', 'constructor'].includes(prop)
	){return '$'+prop}
	return prop
	}