const TestRunner = require('test-runner')
const runner = new TestRunner({sequential:true})
const differ = require("deep-object-diff")
const lookmlParser_parseFiles = require("../../index.js")
const util = require("util")
const fs = require('fs')
const pathLib = require('path')
const defaultConsole = console
const getSpec = function read(path){
	try{
		let file = fs.readFileSync(__dirname+'/'+path+'/test.json',{encoding:'utf8'})
		return JSON.parse(file)}
	catch(e){
		console.error(e)
		return {}
		}
	}

const paths = fs
	.readdirSync(__dirname,{withFileTypes:true})
	.filter(ent=>ent.isDirectory())
	.filter(ent=>ent.name && ent.name[0]!=='.')
	.map(ent=>ent.name)

const utOpt = {compact:false, maxArrayLength:3, depth:8, breakLength:60 }

!async function(){
	for(let path of paths){
			let test = getSpec(path)
			let opts = {cwd: __dirname+'/'+path, ...test.parseFileOptions||{}}
			if(opts.console){opts.console = mockConsole(opts.console)}
			try{
				runner.test(test.name||path, async () => {
						//process.chdir(__dirname+'/'+path)
						let project = await lookmlParser_parseFiles(opts)
						if(project.error){throw "Parse error: "+util.inspect(project.error)}
						if(test.expected){
							let diff = differ.detailedDiff(project,test.expected)
							let hasAdded = Object.keys(diff.added).length
							let hasUpdated = Object.keys(diff.updated).length
							if(!hasAdded && !hasUpdated){
								return "ok"
							}
							//console.log(project.model)
							throw ("Missing or mismatched properties"
									+(hasAdded?"\n  Missing: "+util.inspect(diff.added,utOpt):"")
									+(hasUpdated?"\n  Mismatched: "+util.inspect(diff.updated,utOpt):"")
								)
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