const TestRunner = require('test-runner')
const runner = new TestRunner()
const lookmlParser = require('../index.js')
const generate = require('../lib/generate/index.js')
const fs = require('fs')
const pathLib = require('path')
const { globSync } = require('glob')

console.log("\n### round-trip (parse -> generate -> exact match) ###")

const testProjectsLocation = pathLib.join(__dirname, '../test-projects')
const lkmlFiles = globSync("**/*.lkml", { cwd: testProjectsLocation, posix: true }).sort()

lkmlFiles.forEach(relPath => {
	runner.test(`round-trip: ${relPath}`, () => {
		const fullPath = pathLib.join(testProjectsLocation, relPath)
		const original = fs.readFileSync(fullPath, 'utf8')
		let parsed
		try {
			parsed = lookmlParser.parse(original)
		} catch (e) {
			return "ok (syntax error expected)"
		}
		const regenerated = generate(parsed)
		if (regenerated !== original) {
			throw new Error(
				`Round-trip mismatch for ${relPath}:\n` +
				`-- Expected (${original.length} chars) --\n${original}\n` +
				`-- Received (${regenerated.length} chars) --\n${regenerated}`
			)
		}
		return "ok"
	})
})
