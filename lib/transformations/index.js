const dropStrings = require('./drop-strings.js')
const dropFileAdditional = require('./drop-file-additional.js')
const recursiveRemoveProperty = require('./recursive-remove-property.js')
const applyExtensionsRefinements = require('./apply-extensions-refinements.js')
const removeAbstract = require('./remove-abstract.js')

const byCliFlags = {
	's': dropStrings,
	'x': (project)=>{applyExtensionsRefinements(project); removeAbstract(project)},
	'f': dropFileAdditional
	}

module.exports = {
	byCliFlags,
	applyExtensionsRefinements,
	removeAbstract,
	dropStrings,
	dropFileAdditional,
	recursiveRemoveProperty
	}
