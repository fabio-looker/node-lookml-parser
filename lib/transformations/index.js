const dropStrings = require('./drop-strings.js')
const recursiveRemoveProperty = require('./recursive-remove-property.js')


const cliFlags = {
	's':dropStrings,
	}

module.exports = {
	cliFlags,
	dropStrings,
	recursiveRemoveProperty
	}