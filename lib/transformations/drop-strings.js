const recursiveRemoveProperty = require('./recursive-remove-property.js')
module.exports = function dropStrings(project){
	return recursiveRemoveProperty(project,"$strings")
	}