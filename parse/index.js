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
				return lookmlParser.parse(stringToParse)
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