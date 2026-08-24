const RESERVED_KEYS = new Set(['$type', '$name', '$value', '$s', '$s_decl', '$ast', '$file_path', '$file_rel', '$file_name', '$file_type'])

module.exports = function encodeProperty(prop) {
	if (typeof prop !== 'string' && prop !== parseInt(prop)) {
		throw new Error("Property (" + prop + ") must be a string or integer (at lib/common/encode-property.js)")
	}
	if (['__proto__', 'prototype', 'constructor'].includes(prop)
		|| Object.prototype.hasOwnProperty.call(Object.prototype, prop)
		|| RESERVED_KEYS.has(prop)
		|| RESERVED_KEYS.has(String(prop).split('.')[0])
	) {
		return '$' + prop
	}
	return prop
}