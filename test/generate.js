const TestRunner = require('test-runner')
const runner = new TestRunner()
const lookmlParser = require('../index.js')
const generate = require('../lib/generate/index.js')

console.log("\n### generate mutations, additions & deletions ###")

// TODO: Add tests around mutating $name
// TODO: Add tests illustrating how to rename an object such that its string data is still preserved
// TODO: Test mutating a string that came from an atom into a value that cannot be parsed as an atom
// TODO: Test mutating a string that came from a quoted string into a value that needs escaping to be parsed as a quoted string
// TODO: Test mutating a string that came from a double-semi block into a value that needs escaping to be parsed as a double-semi block
// TODO (MAJOR/DESIGN): Consider the interaction between conditional comments and $strings/generate()

runner.test("mutate string value preserves whitespace and formatting", () => {
	const input = `
		view: foo {
			sql_table_name: old_schema.old_table ;;
		}
	`
	const parsed = lookmlParser.parse(input)
	parsed.view.foo.sql_table_name = "new_schema.new_table"
	const generated = generate(parsed)
	const expected = `
		view: foo {
			sql_table_name: new_schema.new_table ;;
		}
	`
	if (generated !== expected) {
		throw new Error(`Expected:\n${JSON.stringify(expected)}\nReceived:\n${JSON.stringify(generated)}`)
	}
	return "ok"
})

runner.test("interleaved comments are preserved", () => {
	const input = `
		explore: foo { #Object
			from:
			# Value
			view
		}
	`
	const parsed = lookmlParser.parse(input)
	parsed.explore.foo.from = "view2"
	const generated = generate(parsed)
	const expected = `
		explore: foo { #Object
			from:
			# Value
			view2
		}
	`
	if (generated !== expected) {
		throw new Error(`Expected:\n${JSON.stringify(expected)}\nReceived:\n${JSON.stringify(generated)}`)
	}
	return "ok"
})

runner.test("mutate boolean value to false formats as no", () => {
	const input = `
		view: foo {
			hidden: yes
		}
	`
	const parsed = lookmlParser.parse(input)
	parsed.view.foo.hidden = false
	const generated = generate(parsed)
	const expected = `
		view: foo {
			hidden: no
		}
	`
	if (generated !== expected) {
		throw new Error(`Expected:\n${JSON.stringify(expected)}\nReceived:\n${JSON.stringify(generated)}`)
	}
	return "ok"
})

runner.test("delete property omits it from generated output", () => {
	const input = `
		view: foo {
			sql_table_name: my_table ;;
			hidden: yes
		}
	`
	const parsed = lookmlParser.parse(input)
	delete parsed.view.foo.hidden
	const generated = generate(parsed)
	const expected = `
		view: foo {
			sql_table_name: my_table ;;
		}
	`
	if (generated !== expected) {
		throw new Error(`Expected:\n${JSON.stringify(expected)}\nReceived:\n${JSON.stringify(generated)}`)
	}
	return "ok"
})

runner.test("nulling a property explicitly omits it from generated output", () => {
	const input = `
		view: foo {
			sql_table_name: my_table ;;
			hidden: yes
		}
	`
	const parsed = lookmlParser.parse(input)
	parsed.view.foo.hidden = null
	const generated = generate(parsed)
	const expected = `
		view: foo {
			sql_table_name: my_table ;;
		}
	`
	if (generated !== expected) {
		throw new Error(`Expected:\n${JSON.stringify(expected)}\nReceived:\n${JSON.stringify(generated)}`)
	}
	return "ok"
})

runner.test("adding a new property formats and inserts it", () => {
	const input = `
		view: foo {
			sql_table_name: my_table ;;
		}
	`
	const parsed = lookmlParser.parse(input)
	parsed.view.foo.label = "My User View"
	const generated = generate(parsed)
	if (!generated.includes('label: "My User View"')) {
		throw new Error(`Expected generated output to contain new label property:\n${generated}`)
	}
	return "ok"
})
