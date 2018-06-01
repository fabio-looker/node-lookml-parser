const glob = require("glob")
const fs = require("fs")
const path = require("path")
const peg = require("pegjs")
const Promise = require('bluebird')
const lookmlParser = peg.generate(fs.readFileSync(path.join(__dirname,"lookml.peg"),{encoding:'utf-8'}))
const flatten = (a,b) => a.concat(b)
const indexBy = (key) => (obj,x,i) => Object.assign(obj,{[x[key]]:x})
const readp = Promise.promisify(fs.readFile)
const globp = Promise.promisify(glob)

exports.parse = lookmlParser.parse
exports.parseFiles = async function parse({
 		source =  "*.{view,model,explore}.lkml"
		,globOptions = {}
		,readFileOptions = {encoding:'utf-8'}
		,readFileConcurrency = 4
		,conditionalCommentString
		,console = console
	}){
		const inputFilePaths = await globp(source,globOptions)
		if(!inputFilePaths.length){
				console.warn("Warning: No input files were matched. (Use argument --input=... )")
			}
		if(conditionalCommentString){
				// Should this be available in the string version too? Maybe...
				var insertRegex = new RegExp(
						"(\\n|^)\\s*#[ \\t]*"
						+conditionalCommentString
						+"[ \\t]*((\\n\\s*#[^\\n]*)*)","g"
					)
			}
		const files = await Promise.map(inputFilePaths, async (filepath,fp)=>{
				var file,result;
				try{
						file = await readp(filepath,readFileOptions)
						if(insertRegex){
								file = file.replace(
										insertRegex,
										(match,start,block)=>block.replace(/\n\s*#/g,"\n")
									)
							}
						result = lookmlParser.parse(file)
					}
				catch(e){result = {error:e}}
				return Object.assign(result,{
						_file_path:filepath
						,_file_name:(path.basename(filepath).match(/([^.]+)\.([a-z]+)\.lkml/)||[])[1]
						,_file_type:(path.basename(filepath).match(/([^.]+)\.([a-z]+)\.lkml/)||[])[2]
					})
			},{concurrency: readFileConcurrency})
		return {
				files,
				file: {
						model:   files.filter(f=>f._file_type=="model"  ).reduce(indexBy("_file_name"),{})
						,view:   files.filter(f=>f._file_type=="view"   ).reduce(indexBy("_file_name"),{})
						,explore:files.filter(f=>f._file_type=="explore").reduce(indexBy("_file_name"),{})
					}
			}
	}
