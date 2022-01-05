const dropStrings = require('./drop-strings.js')
const recursiveRemoveProperty = require('./recursive-remove-property.js')

const byCliFlags = {
	's':dropStrings,
	}

module.exports = {
	byCliFlags,
	dropStrings,
	recursiveRemoveProperty
	}