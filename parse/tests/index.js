const TestRunner = require('test-runner')
const runner = new TestRunner()
const differ = require("deep-object-diff")
const lookmlParser_parse = require("../index.js")
const util = require("util")

const tests = [
{	name:	"top-level include",
	input:	`include: "a"`,
	exp:	{include:"a"}
	},
{	name:	"top-level includes", 
	input:	`include: "a" include: "b"`, 
	exp:	{include:["a","b"]}
	},
{	name:	"plain view", 
	input:	`view: foo {}`,
	exp:	{view:{foo:{_view:"foo",_type:"view",_n:0}},views:[{_view:"foo",_type:"view",_n:0}]}
	}
]
const utOpt = {compact:false, maxArrayLength:3, depth:8, breakLength:60 }
tests.forEach( test =>
		runner.test(test.name, () =>{
				let diff = differ.detailedDiff(lookmlParser_parse(test.input),test.exp)
				let hasAdded = Object.keys(diff.added).length
				let hasUpdated = Object.keys(diff.updated).length
				if(!hasAdded && !hasUpdated){
					return "ok"
				}
				throw ("Missing or mismatched properties"
						+(hasAdded?"\n  Missing: "+util.inspect(diff.added,utOpt):"")
						+(hasUpdated?"\n  Mismatched: "+util.inspect(diff.updated,utOpt):"")
					)
			})
	)
