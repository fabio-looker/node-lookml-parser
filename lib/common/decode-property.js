module.exports = function decodeProperty(prop) {
	if (typeof prop !== 'string') {
		if (prop === parseInt(prop)) {
			return prop
		} else {
			throw "Property (" + prop + ") must be a string or integer (at lib/common/decode-property.js)"
		}
	}
	if (prop.startsWith('$_')) {
		return prop.slice(2)
	}
	return prop
}
