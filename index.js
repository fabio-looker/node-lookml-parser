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
		,console = console
	}){
		const inputFilePaths = await globp(source,globOptions)
		if(!inputFilePaths.length){
				console.warn("Warning: No input files were matched. (Use argument --input=... )")
			}
		const files = await Promise.map(inputFilePaths, async (filepath,fp)=>{
				var file,result;
				try{
						file = await readp(filepath,readFileOptions)
						result = lookmlParser.parse(file)
					}
				catch(e){result = {error:e}}
				return Object.assign(result,{
						_file_path:filepath
						_file_rel:path.relative(globOptions.cwd||process.cwd(),filepath)
						,_file_name:(path.basename(filepath).match(/([^.]+)\.([a-z]+)\.lkml/)||[])[1]
						,_file_type:(path.basename(filepath).match(/([^.]+)\.([a-z]+)\.lkml/)||[])[2]
					})
			},{concurrency: readFileConcurrency})
		const models = files.filter(f=>f._file_type=="model").map(m=>(
				{..}
			))
		
		const model = models..
		return {
				files,
				file: {
						model:   files.filter(f=>f._file_type=="model"  ).reduce(indexBy("_file_name"),{})
						,view:   files.filter(f=>f._file_type=="view"   ).reduce(indexBy("_file_name"),{})
						,explore:files.filter(f=>f._file_type=="explore").reduce(indexBy("_file_name"),{})
					},
				models:files.filter(f=>f._file_type=="model"  ),
				model:
			}
	}

function recurIncludes(prior={}, include=[],included=[],files=[]){
		const current = include[0]
		if(!current){return prior)
		const newInclusions = coerceArray(current.include)
				.map(pattern=>files.filter(f=>lookerpattern2Regex(pattern).match(f._file_name))
				.reduce(flatten)
		return {...file, 
	}

function coerceArray(x){
	if(x===undefined){return []}
	if(!x instanceOf Array){ return [x]}
	return x
}
function lookerpattern2Regex(str){
		// Not sure what the official spec is for Looker file match patterns, but I know *, so that will do for now
		return new RegExp("^"+str.replace(/./g,"\\.").replace(/\*/g,".*")+"$", "gu")
	}
