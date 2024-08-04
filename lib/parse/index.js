const peg = require("pegjs")
const path = require("path")
const fs = require("fs")
const encodeProperty = require("../common/encode-property")
const parser = require("pegjs/lib/parser")
const lookmlGrammar = fs.readFileSync(path.join(__dirname,"lookml.peg"),{encoding:'utf-8'})
const lookmlParser = peg.generate(
	lookmlGrammar
	//, {trace:true} //For debugging
	)


module.exports = function lookmlParser_parse(stringToParse, {
		conditionalCommentString,
		model
	} = {}) {
		if(conditionalCommentString){
			if(conditionalCommentString.match(/[\.\{\}\*\+\?\^\$\[\]\(\)\t\n\r \\]/)){
				throw new Error("conditionalCommentString must not include any whitsepace or RegEx special characters")
			}
			var insertRegex = new RegExp(
					"(\\n|^)\\s*#[ \\t]*"
					+conditionalCommentString
					+"[^\\n]*"
					+"((\\n\\s*#[^\\n]*)*)","g"
				)
			var replaceRegex = new RegExp(
				`(\\n|^)\\s*#([ \\t]*${conditionalCommentString}[ \\t]?)?`,
				"g"
			)
			stringToParse = stringToParse.replace(
					insertRegex,
					(match,start,block)=>match.replace(replaceRegex,"\n")
				)
			}
		try{
			if(model){
				if(typeof model !== 'string'){throw "`model` parameter must be a string"}
				// For now, we have two code paths unfortunately
				// [Legacy compatibility] If the model name is a valid LookML name, we wrap the string with it. This preserves the `$model` property
				//    automatcially assigned deeply within objects in the model, by the assignSuper logic baked into the peg
				// [Expanded flexiblity] If the model name is not a valid LookML name, this used to be unsupported and would throw. Now we support it,
				//    by wrapping the result into a model object having any name, although without the `$model` properties
				// Eventually these paths should be consolidated to the latter code path, once the 'assignSuper' transformation 
				// is extracted from the peg file, and can be applied separately to the return value of this parse function call. (The latter code path
				// also has the benefit that it will not capture extraneous strings now that string capture is supported)
				if(model.match(/^[-+_a-zA-Z0-9\.]+$/)){
					return lookmlParser.parse("model: "+model+" {\n"+stringToParse+"\n}\n");
					}
				else {
					return {
						model:{
							[encodeProperty(model)]: {
								...lookmlParser.parse(stringToParse),
								$type: 'model',
								$name: model
								}
							}
						}
					}	
				}
			else { //No model
				return lookmlParser.parse(stringToParse)
				}
			}
		catch(e){
			const toString = ()=>"Parse error@"+(e.location && e.location.start.line+","+e.location.start.column)+" "+(e.message||e.toString()) 
			throw {	toString,
					toJSON:()=>JSON.stringify(toString()),
					exception: e,
					...(e.location?{
						context:stringToParse.split("\n").map((l,i)=>''+(i+1)+":	"+l).slice(e.location.start.line-4,e.location.end.line+2).join("\n")
						}:{})
					}
		}
	}