const TestRunner = require('test-runner')
const runner = new TestRunner()
const deepExpect = require("./lib/deep-expect.js")
const lookmlParser_parse = require("../lib/parse/index.js")
const util = require("util")
const fs = require('fs')
const pathLib = require('path')

const testCasesDir = pathLib.join(__dirname, 'parse-test-cases')
const tests = fs.readdirSync(testCasesDir)
	.filter(file => file.endsWith('.json'))
	.sort()
	.map(file => {
		const spec = JSON.parse(fs.readFileSync(pathLib.join(testCasesDir, file), 'utf8'))
		return {
			name: spec.name || pathLib.basename(file, '.json'),
			...spec
		}
	})

const utOpt = {compact:false, maxArrayLength:3, depth:8, breakLength:60 }

console.log("\n### parse ###")
tests.forEach( test =>
		runner.test(test.name, () =>{
				var parsed = lookmlParser_parse(test.input, test.options)
				if({}.polluted !== undefined){
					throw "Prototype pollution occurred"
				}
				var expected = test.expected || test.exp
				var results = deepExpect(expected)(parsed)
				if(results.length){
					throw ("\n"+results.join("\n")
							+"\n\n## Received: ##\n"
							+util.inspect(parsed,utOpt)
							+"\n\n## Expected: ##\n"
							+util.inspect(expected,utOpt)
						)
				}
				return "ok"

			})
	)
