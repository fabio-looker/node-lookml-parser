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
					recurse(parseContents);
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

function recurse(obj) {
	if (typeof(obj) !== 'object') {
		return
	}
	
	if (['dimension', 'measure'].includes(obj._type)) {
		let propertiesThatMayContainFields = /^(sql|html)/
		let propertiesThatAreFields = ['label_from_parameter', 
											'drill_fields', 
											'start_location_field',
											'end_location_field',
											'suggest_dimension',
											'order_by_field',
											'required_fields',
											'list_field',
											'filters'];
		let references;
		for (const [key, val] of Object.entries(obj)) {
			if (propertiesThatAreFields.includes(key)) {
				if (key === 'filters') {
					// Iterate through array of filters when there is more than one. Example:
					// 	{ type: 'count',
					// 	 	 filters: [ [Object], [Object] ],
					// 	 	 _measure: 'count',
					// 	 	 _type: 'measure',
					// 	 	 _n: 1,
					// 	 	 _view: 'foo' }
					if (Array.isArray(obj['filters'])) {
						for (const filter of obj['filters']) {
							references = (references||[]).concat(filter.field)
						}
					} else {
						// if one filter, reference is in 'field'
						references = (references||[]).concat(obj['filters'].field)
					}
				} else {
					// for properties that are fields but not filters the value is a list
					references = (references||[]).concat(val)
				}
			} else if (propertiesThatMayContainFields.test(key)) {
				let pattern = /\s*(?:\$\{|\{\{|\{%)+\s*((?!TABLE)([^.{}]+)(\.[^.{}]+)*)\s*(?:$|%\}|\})+/g
				let match;
				while ((match = pattern.exec(val)) !== null) {
					references = (references||[]).concat(match[1])
				}
			}
		}

		obj._references = references
	}

	for (const val of Object.values(obj)) {
		recurse(val);
	}
}
