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
		conditionalCommentString
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
				`(\\n|^)(\\s*)(#([ \\t]*${conditionalCommentString}[ \\t]?|[ \\t]?))?`,
				"g"
			)
			stringToParse = stringToParse.replace(
					insertRegex,
					(match,start,block)=>match.replace(replaceRegex,"$1$2")
				)
			}
		try{
			// if(model){
			// 	return {
			// 		model:{
			// 			[encodeProperty(model)]: {
			// 				...lookmlParser.parse(stringToParse),
			// 				$type: 'model',
			// 				$name: model
			// 				}
			// 			}
			// 		}
			// 	}
			// else { //No model
				return lookmlParser.parse(stringToParse)
			//	}
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