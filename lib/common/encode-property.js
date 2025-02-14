module.exports = function encodeProperty(prop){
	if(typeof prop !== 'string' && prop !== parseInt(prop)){
		throw new Error("Property ("+prop+") must be a string or integer (at lib/common/encode-property.js)")
		}
	if(prop[0]==='$'
	|| ['__proto__', 'prototype', 'constructor'].includes(prop)
	){return '$'+prop}
	return prop
	}