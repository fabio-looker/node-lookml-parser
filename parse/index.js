/* eslint-disable require-jsdoc */
!function(){
		const peg = require("pegjs")
		const path = require("path")
		const fs = require("fs")
		const lookmlParser = peg.generate(fs.readFileSync(path.join(__dirname,"lookml.peg"),{encoding:'utf-8'}))
		module.exports = function lookmlParser_parse(stringToParse, {
				conditionalCommentString,
				model
			} = {}) {
				if(conditionalCommentString){
						var insertRegex = new RegExp(
								"(\\n|^)\\s*#[ \\t]*"
								+conditionalCommentString
								+"[ \\t]*((\\n\\s*#[^\\n]*)*)","g"
							)
						stringToParse = stringToParse.replace(
								insertRegex,
								(match,start,block)=>block.replace(/\n\s*#/g,"\n")
							)
					}
				if(model){
					if(!model.match(/^[_a-zA-Z0-9]+$/)){throw "Unsupported model name: "+model+". Model names must be alphanumeric or underscores only";}
					stringToParse = "model: "+model+" {\n"+stringToParse+"\n}\n";
				}
				try{
					parseContents = lookmlParser.parse(stringToParse);
					recurse(parseContents, value => {
						if(['dimension', 'measure', 'dimension_group', 'filter', 'filters'].includes(value._type)) {
							references = []

						/* Dimensions:
							sql: ${view.field} & ${field}  & {% parameter PARAMETER_NAME %} & 
							html: {{_field._name}} & {{ _access_filters['company.name'] }} & {{ _filters['view.field'] }} 
							drill_fields: [field | view.field]
							start_location_field:
							end_location_field:
							label_from_parameter:
							order_by_field:
							required_fields:
							sql_end:
							sql_start:
							sql_longitude:
							sql_latitude:
							suggest_dimension:

						  Measures:
							label_from_parameter: view.parameter | parameter
							sql: sql: ${view.field} & ${field}  & {% parameter PARAMETER_NAME %} 
							drill_fields: [field | view.field]
							filters: { field: } 
							html:
							list_field
							required_fields
							suggest_dimension


							TBD: 'parameter'
						*/
						value._references = [];
						[value.sql,
							value.sql_start,
							value.sql_end,
							value.sql_longitude,
							value.sql_latitude,
							value.html].forEach((param) => {
							if (!param) { 
								return;
							} else {
								let match = param
									.replace(/\b\d+\.\d+\b/g, '')
									.match(/(^|\$\{|\{\{|\{%)\s*(([^.{}]+)(\.[^.{}]+)+)\s*($|%\}|\})/);
								
								// Ensure a string is always returned, even if there are no matches
								let parts = ((match||[])[2]||''); 

								// If nothing matches, move on. Otherwise add reference to _references
								if (!parts.length) {
									return;
								} else {
									value._references.push(parts);
								}
							}
						});
						
						// need to match:
						[value.drill_fields, 
							value.label_from_parameter, // field | view.field
							value.start_location_field, // field | view.field
							value.end_location_field, // field | view.field
							value.suggest_dimension, // field 
							value.order_by_field, // field
							value.required_fields, // [field1, field2, set*] // TODO: address use case where a set is passed in.
							value.list_field, // field
							value.field // in filtered measures. field | view.field  
							].forEach((param) => {
								if (!param) {
									// Case when LookML parameter does not exist
									return;
								} else if (Array.isArray(param)) {
									// Case when LookML parameter contains a list
								} else {
									// Case when LookML parameter contains just one string
								}
							})
					}
				})
					return parseContents
				}catch(e){
					throw {	toString:()=>"Parse error@"+(e.location && e.location.start.line+","+e.location.start.column)+" "+e.message,
							...e, 
							...(e.location?{
								context:stringToParse.split("\n").map((l,i)=>''+(i+1)+":	"+l).slice(e.location.start.line-4,e.location.end.line+2).join("\n")
								}:{})
							} 
				}
			}
}()

function recurse(obj, fn) {
	fn(obj);

	if (typeof(obj) !== 'object') {
		return;
	}

	for (const val of Object.values(obj)) {
		recurse(val, fn);
	}
};
