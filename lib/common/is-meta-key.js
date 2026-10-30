module.exports = function isMetaKey(key) {
	return typeof key === 'string' && key[0] === '$' && key[1] !== '_'
}
