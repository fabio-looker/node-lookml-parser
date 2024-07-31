let jsYaml
// let priorDependencyError

module.exports = function maybeYamlParse(stringToParse){
	try{
		jsYaml = require('js-yaml')
		const result = jsYaml.load(stringToParse)
		return result
		}
	catch(e){
		if(e.message.includes()){
			throw e.message+". js-yaml is an optional dependency, and must be explicitly installed to parse yaml-based files, such as LookML Dashboards."
			}
		throw e.message
		}
	}
