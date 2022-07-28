const TestRunner = require('test-runner')
const runner = new TestRunner({sequential:true})
const deepExpect = require("./lib/deep-expect.js")
const lookmlParser_parseFiles = require("../lib/parse-files/index.js")
const util = require("util")
const fs = require('fs')
const pathLib = require('path')
const defaultConsole = console
const testProjectsLocation = pathLib.join(__dirname,'../test-projects')

const getSpec = function read(path){
	try{
		let file = fs.readFileSync(pathLib.join(testProjectsLocation,path,'test.json'),{encoding:'utf8'})
		return JSON.parse(file)}
	catch(e){
		console.error({path, error:e})
		return {}
		}
	}

const paths = fs
	.readdirSync(testProjectsLocation,{withFileTypes:true})
	.filter(ent=>ent.isDirectory())
	.filter(ent=>ent.name && ent.name[0]!=='.')
	.map(ent=>ent.name)

const utOpt = {compact:false, maxArrayLength:3, depth:12, breakLength:60 }

!async function(){

	console.log("\n### parse-files ###")
	for(let path of paths){
			let test = getSpec(path)
			let opts = {cwd: pathLib.join(testProjectsLocation,path), ...test.parseFileOptions||{}}
			if(opts.console){opts.console = mockConsole(opts.console)}
			try{
				runner.test(test.name||path, async () => {
						let project = await lookmlParser_parseFiles(opts)
						if(project.error){
							throw "Parse error: "+util.inspect(project.error)
							}
						if({}.polluted !== undefined){
							throw "Prototype pollution occurred"
							}
						if(test.expected){
							let results = deepExpect(test.expected)(project)
							if(results.length){
								throw ("\n"+results.join("\n")
										+"\n\n## Received: ##\n"
										+util.inspect(parsed,utOpt)
										+"\n\n## Expected: ##\n"
										+util.inspect(test.exp,utOpt)
									)
							}
						}
						return "ok"
					})
				}
			catch(e){console.error(e)}
		}
	}()

function mockConsole(consoleSpec){
	let allowedMethods = consoleSpec
	let console = {}
	for(let method of ['log','warn','error']){
		if(allowedMethods.includes(method)){
			console[method] = defaultConsole[method].bind(defaultConsole)
			}
		else {
			console[method] = noop
			}
		}
	return console
	}
function noop(){}
