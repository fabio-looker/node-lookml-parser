const TestRunner = require('test-runner')
const runner = new TestRunner()
const lookmlParser = require('../index.js')
const deepExpect = require('./lib/deep-expect.js')
const pathLib = require('path')
const util = require('util')

const utOpt = { compact: false, maxArrayLength: 5, depth: 12, breakLength: 60 }

console.log("\n### parseAst & $ast transformations ###")

runner.test("parseAst returns AST structure for a basic view", () => {
	const input = `
		# Sample comment
		view: foo {
			sql_table_name: my_table ;;
			hidden: yes
			fields: [id, name]
		}
	`
	const ast = lookmlParser.parseAst(input)
	const expected = {
		type: "lookml",
		declarations: [
			{ type: "whitespace", value: "\n\t\t" },
			{ type: "comment", value: "# Sample comment\n" },
			{ type: "whitespace", value: "\t\t" },
			{
				type: "object",
				declarationType: "view",
				name: "foo",
				value: {
					type: "lookml",
					declarations: [
						{
							type: "block",
							declarationType: "sql_table_name",
							value: {
								type: "double_semi_block",
								value: " my_table "
							},
							syntax: {
								_1: []
							}
						},
						{ type: "whitespace", value: "\n\t\t\t" },
						{
							type: "generic",
							declarationType: "hidden",
							value: {
								type: "atom",
								value: true,
								raw: "yes"
							},
							syntax: {
								_1: [],
								_2: [{ type: "whitespace", value: " " }]
							}
						},
						{ type: "whitespace", value: "\n\t\t\t" },
						{
							type: "generic",
							declarationType: "fields",
							value: {
								type: "list",
								items: [
									{ type: "atom", value: "id", raw: "id" },
									{ type: "atom", value: "name", raw: "name" }
								],
								syntax: {
									_0: [],
									_last: []
								}
							},
							syntax: {
								_1: [],
								_2: [{ type: "whitespace", value: " " }]
							}
						},
						{ type: "whitespace", value: "\n\t\t" }
					]
				},
				syntax: {
					_1: [],
					_2: [{ type: "whitespace", value: " " }],
					_3: [{ type: "whitespace", value: " " }],
					_4: [{ type: "whitespace", value: "\n\t\t\t" }],
					_5: []
				}
			},
			{ type: "whitespace", value: "\n\t" }
		]
	}

	const results = deepExpect(expected)(ast)
	if (results.length) {
		throw (
			"\n" + results.join("\n") +
			"\n\n## Received: ##\n" + util.inspect(ast, utOpt) +
			"\n\n## Expected: ##\n" + util.inspect(expected, utOpt)
		)
	}
	return "ok"
})

runner.test("parseFiles does not include $ast by default", async () => {
	const project = await lookmlParser.parseFiles({
		cwd: pathLib.join(__dirname, '../test-projects/001-simple-model')
	})
	const fileKeys = Object.keys(project.file || {})
	if (!fileKeys.length) {
		throw new Error("Expected parsed files in project")
	}
	for (const key of fileKeys) {
		if (project.file[key].$ast !== undefined) {
			throw new Error(`Expected $ast to be undefined by default on ${key}`)
		}
	}
	return "ok"
})

runner.test("parseFiles includes $ast when transformations.includeAst is true", async () => {
	const project = await lookmlParser.parseFiles({
		cwd: pathLib.join(__dirname, '../test-projects/001-simple-model'),
		transformations: {
			applyExtensionsRefinements: true,
			removeAbstract: true,
			includeAst: true
		}
	})
	const fileKeys = Object.keys(project.file || {})
	if (!fileKeys.length) {
		throw new Error("Expected parsed files in project")
	}
	let astCount = 0
	for (const key of fileKeys) {
		if (project.file[key].$ast) {
			astCount++
			if (project.file[key].$ast.type !== 'lookml') {
				throw new Error(`Expected $ast on ${key} to be of type 'lookml'`)
			}
		}
	}
	if (astCount === 0) {
		throw new Error("Expected at least one file to have $ast attached")
	}
	return "ok"
})
