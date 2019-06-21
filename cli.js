#! /usr/bin/env node
const cliArgs = require('minimist')(process.argv.slice(
		process.argv[0]=="lookml-parser"
		?1 //e.g. lookml-parser --bla
		:2 //e.g. node cli.js --bla
	))
const parser = require("./index.js")
const util = require("util")
var r,repl = cliArgs.interactive && require("repl")
var trace = (cliArgs.trace || cliArgs.t || '').split(",").reduce((idx,x)=>({...idx, [x]:true}),{})

parser.parseFiles({
		source: cliArgs.input || cliArgs.i,
		conditionalCommentString: cliArgs['conditional-comment'] || cliArgs.c,
		console,
		trace
	}).then((result)=>{
		if(repl){
				r = repl.start({writer:x=>
						util
						.inspect(x,{depth:1,colors:true})
						// Truncate long strings
						.replace(/: "([^"]{60})[^"]+"/,': "$1..."')
						//Collapse some levels
						.replace(/(\n\s+([_a-zA-Z$][_0-9a-zA-Z$]*)?:)\s+([_a-zA-Z$][_0-9a-zA-Z$]* {)/g,"$1 $2")
					})
				Object.assign(r.context,result)
				console.info("\x1b[32mSuccess!\x1b[0m Evaluate any of the following: "
						+Object.keys(result)
						.map(s=>s.match(/error|warning/)?"\x1b[33m"+s+"\x1b[0m":s)
						.map(s=> typeof result[s] == "function"
								? s+(result[s].toString().match(/\([^)]*\)/)||[""])[0]
								: s)
						.join(", ")
					)
			}else{
				console.log(JSON.stringify(result, undefined, cliArgs.whitespace))
			}
	}).catch((result)=>{
		if(repl){
				r = repl.start()
				r.context.error = result
				console.info("\x1b[31mError.\x1b[0m Evaluate `error` for details")
			}else{
				console.error(JSON.stringify(result, undefined, cliArgs.whitespace))
			}
	})
