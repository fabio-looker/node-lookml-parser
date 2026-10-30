const assembleModels = require('./assemble-models.js')
const dropStrings = require('./drop-strings.js')
const dropFileAdditional = require('./drop-file-additional.js')
const recursiveRemoveProperty = require('./recursive-remove-property.js')
const applyExtensionsRefinements = require('./apply-extensions-refinements.js')
const removeAbstract = require('./remove-abstract.js')
const addPositions = require('./add-positions.js')
const applyConstants = require('./apply-constants.js')

const byCliFlags = {
	'm': assembleModels,
	's': dropStrings,
	'x': (project) => { applyExtensionsRefinements(project); removeAbstract(project) },
	'f': dropFileAdditional,
	'p': addPositions,
	'c': applyConstants,
	'a': (project) => project
}

module.exports = {
	byCliFlags,
	assembleModels,
	applyExtensionsRefinements,
	removeAbstract,
	dropStrings,
	dropFileAdditional,
	recursiveRemoveProperty,
	addPositions,
	applyConstants
}

