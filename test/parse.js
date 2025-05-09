const TestRunner = require('test-runner')
const runner = new TestRunner()
const deepExpect = require("./lib/deep-expect.js")
const lookmlParser_parse = require("../lib/parse/index.js")
const util = require("util")

const tests = [
{	name:	"blank",
	input:	'',
	exp:	{}
	},
{	name:	"just a comment",
	input:	'# my comment ',
	exp:	{}
	},
{	name:	"top-level include",
	input:	'include: "a"',
	exp:	{include:"a"}
	},
{	name:	"top-level includes",
	input:	'include: "a" include: "b"',
	exp:	{include:["a","b"]}
	},
{	name:	"plain view",
	input:	"view: foo {}",
	exp:	{view:{foo:{}}}
	},
{	name:	"explore in a model (v4: no longer a special case)",
	input:	"explore: bar {}",
	options: {model: "foo"},
	exp:	{explore:{bar:{}}}
	},
{	name:	"conditional comments",
	input:	`
		# PARSE-ME!
		# foo: "bar"
	`,
	options: {conditionalCommentString:"PARSE-ME!"},
	exp: {foo:"bar"}
	},
{	name	:"conditional comments (compact)",
	input:	`
		view: my_view {
			#PARSE-ME! foo: "bar"
			bat: "baz"
		}
	`,
	options: {conditionalCommentString:"PARSE-ME!"},
	exp: {view: {my_view: {foo:"bar", bat:"baz"}}}
	},
]
const utOpt = {compact:false, maxArrayLength:3, depth:8, breakLength:60 }

console.log("\n### parse ###")
tests.forEach( test =>
		runner.test(test.name, () =>{
				var parsed = lookmlParser_parse(test.input, test.options)
				var results = deepExpect(test.exp)(parsed)
				if(results.length){
					throw ("\n"+results.join("\n")
							+"\n\n## Received: ##\n"
							+util.inspect(parsed,utOpt)
							+"\n\n## Expected: ##\n"
							+util.inspect(test.exp,utOpt)
						)
				}
				return "ok"

			})
	)
