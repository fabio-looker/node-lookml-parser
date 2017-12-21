#! /usr/bin/env node
const cliArgs = require('minimist')(process.argv.slice(
		process.argv[0]=="lookml-parser"
		?1 //e.g. lookml-parser --bla
		:2 //e.g. node cli.js --bla
	))
const parser = require("./index.js")
const util = require("util")
var repl = cliArgs.interactive && require("repl")
var r

parser.parseFiles({
		source: cliArgs.input || cliArgs.i,
		console
	}).then((result)=>{
		if(repl){
				r = repl.start({writer:x=>
						util
						.inspect(x,{depth:1,colors:true})
						.replace(/: "([^"]{60})[^"]+"/,': "$1..."')
					})
				r.context.files = result.files
				r.context.file = result.file
				console.info("Success. Evaluate `files` for an array or `file` for an object...")
			}else{
				console.log(JSON.stringify(result, undefined, cliArgs.whitespace))
			}
	}).catch((result)=>{
		if(repl){
				r = repl.start()
				r.context.error = result
				console.info("Error. Evaluate `error` for details")
			}else{
				console.error(JSON.stringify(result, undefined, cliArgs.whitespace))
			}
	})