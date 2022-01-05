const TestRunner = require('test-runner')
const runner = new TestRunner()

const lookmlParser_parse = require("../parse/index.js")
const lookmlParser_generate = require("./index.js")
const util = require("util")

console.log("\n### generate ###")

const file = `
include: "a.lkml"
include: "b.lkml"

view: foo {
	derived_table: {
		# Triggers with my dg
		datagroup_trigger: my_dg
		sql: SELECT 1 as id ;;
		# Wont break on "sorts"
		# sorts: [id: asc, some_field: desc]
	}
	dimension: id {} #Comment 2
}

explore: foo {
	fields: [foo.id, bar.baz, ALL_FIELDS*]
	filters: [
		# id: "1", # Filters in odd places
		# derived_column: "foo"
	] 
	
}
`

runner.test("Complex LookML file round-trips",()=>{
	const obj = lookmlParser_parse(file)
	const roundtrip = lookmlParser_generate(obj)
	if(roundtrip !== file){
		console.error(roundtrip)
		throw "Roundtrip mismatch"
	}
	return "ok"
	})
