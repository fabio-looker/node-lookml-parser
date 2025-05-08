const TestRunner = require('test-runner')
const runner = new TestRunner()
const deepExpect = require("./lib/deep-expect.js")
const lookmlParser_parse = require("../lib/parse/index.js")
const lookmlParser_getPositions = require("../lib/positions/get-positions.js").getPositions
const util = require("util")

const tests = [
{	name:	"one-liner",
	input:	"view: foo {}",
	exp:	{view:{foo:{$p:[0,0,0,12]}}}
	},
{	name:	"few-liner",
	input:	`
		view: foo {
			sql_table_name:
				Bobby"; --
			;;
		}
	`,
	exp:	{view:{foo:{
		$p:[1,2,5,3],
		sql_table_name: {$p: [2,3,4,5]}
		}}}
	},
{	name:	"refinements",
	input:	`
		view: foo { sql_table_name: bar;; }
		view: +foo { sql_table_name: baz;; }
		view: +foo { sql_table_name: bat;; }
	`,
	exp:	{view:{
		foo:{$p:[1,2,1,37], sql_table_name: {$p: [1,14,1,35]}},
		['+foo']:[
			{$p:[2,2,2,38], sql_table_name: {$p: [2,15,2,36]}},
			{$p:[3,2,3,38], sql_table_name: {$p: [3,15,3,36]}},
			]
		}}
	}
]
const utOpt = {compact:false, maxArrayLength:3, depth:8, breakLength:60 }

console.log("\n### getPositions ###")
tests.forEach( test =>
		runner.test(test.name, () =>{
				var parsed = lookmlParser_parse(test.input, test.options)
				var positions = lookmlParser_getPositions(parsed)
				var results = deepExpect(test.exp)(positions)
				if(results.length){
					throw ("\n"+results.join("\n")
							+"\n\n## Received: ##\n"
							+util.inspect(positions,utOpt)
							+"\n\n## Expected: ##\n"
							+util.inspect(test.exp,utOpt)
						)
				}
				return "ok"

			})
	)
