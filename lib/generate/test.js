const TestRunner = require('test-runner')
const runner = new TestRunner()

const lookmlParser_parse = require("../parse/index.js")
const lookmlParser_generate = require("./index.js")
const util = require("util")

const file = `
include: "a.lkml"
include: "b.lkml"

view: foo {
	derived_table: {
		# Triggers with my dg
		datagroup_trigger: my_dg
		sql: SELECT 1 as id ;;
	}
	dimension: id {} #Comment 2
}
explore: foo {
	filters: [id: "1"] 
	#TODO...   ^ this
}
`

runner.test("Complex LookML file round-trips",()=>{
	const lkml = lookmlParser_parse(file)
	const roundtrip = lookmlParser_generate(lkml)
	if(roundtrip !== file){
		console.error(roundtrip)
		throw "Roundtrip mismatch"
	}
	return "ok"
	})
