const encodeProperty = require('./encode-property.js');

module.exports = function indexBy(key){
	return (typeof key=="function"
		? (obj,x,i) => ({...obj, [encodeProperty(key(x))]:x})
		: (obj,x,i) => ({...obj, [encodeProperty(x[key])]:x})
		)
	}
