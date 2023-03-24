const recursiveRemoveProperty = require('./recursive-remove-property.js')
module.exports = function dropFileAdditional(project){
	recursiveRemoveProperty(project,"$file_rel")
	recursiveRemoveProperty(project,"$file_name")
	recursiveRemoveProperty(project,"$file_type")
	}
