const dropStrings = require('./drop-strings.js')
const recursiveRemoveProperty = require('./recursive-remove-property.js')
const applyExtensionsRefinements = require('./apply-extensions-refinements.js')
const removeAbstract = require('./remove-abstract.js')

const byCliFlags = {
	's':dropStrings,
	}

module.exports = {
	byCliFlags,
	applyExtensionsRefinements,
	removeAbstract,
	dropStrings,
	recursiveRemoveProperty
	}
