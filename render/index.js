!function(){
		const path = require("path")
		const fs = require("fs")
		const queryObj = require("dot-wild").get
		const lookmlParser = peg.generate(fs.readFileSync(path.join(__dirname,"lookml.peg"),{encoding:'utf-8'}))
		const lookmlProperties = {
			include: {multiplesAsRepetition:true},
			//? fields: {multiplesAsArray???},
			value_format_name: {stringAsAtom:true},
			value_format: {stringAsQuoted:true}
		}
		module.exports = function lookmlParser_render(obj, {
				intoContainingString = "",
				objectQuery = "",
				renderKeyword = "RENDER",
				commentUnknown = true
			}) {
				if(!renderKeyword || renderKeyword.match(/[`~!@#$%^&*()_+={}\[\]|\\:;“’<,>.?๐฿\s]/){
						throw "Render keyword must not contain any Regex Special Characters";
					}
				const objectToRender = objectQuery ? queryObj(obj, objectQuery) : obj
				if(intoContainingString){
						return "TODO"
					}
				const withoutPriorRenders = intoContainingString
						.replace(new RegExp(
								"([^|\\n][\\t| ]*#\\s*)START "+renderKeyword+"([^\\n]*)"
								+"(\\n[^\\n]*)*"
								+   "(\\n[\\t| ]*#\\s*)END "+renderKeyword+"[^\\n]*","g")
								,"$1"+renderKeyword+"$2"
							)
				const withMismatchedPriorsWarned = withoutPriorRenders
						.replace(new  RegExp(
								"(([^|\\n][\\t| ]*#\\s*)START "+renderKeyword+"([^\\n]*))"
								+"((\\n[^\\n]*)*)"
								+"$","g")
								,"$1\n# WARNING: No matching END comment found$4"
							)
				const rendered = withMismatchedPriorsWarned
						.replace(
								new RegExp("([^|\\n][\\t| ]*#\\s*)"+renderKeyword+"([ \\t]+([^\\n]*))?","g"),
								(...matches)=>
										matches[1]+"START "+renderKeyword+(matches[2]||"")
										+ 
										+matches[1]+"END "+renderKeyword
				return rendered
			}
		
		function _render(obj, indentation=""){
				var i = indent(indentation), iindentation=indentation+"\t",ii=indent(iindentation)
				return Object.entries(obj).map([key,val]=>{
							#CONTINUE HERE
							if(obj[key+'s']){return ""} //Defer to the array version, since we can only use one
							if(key.slice(-1)=='s' && 
							if(val instanceof String){
									if(key.match(/^sql[_$]/) || key.match(/^html[_$]/){
											return i(key+": "+value+";;")
										}
									if(
								}
							if(val instanceof Array)
					}
			}
		function indent(indentation){return str=>str.split("\n").map(l=>indentation+l).join("\n")}
	}()