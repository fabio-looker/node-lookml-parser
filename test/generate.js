const TestRunner = require('test-runner')
const runner = new TestRunner()
const lookmlParser = require('../index.js')
const generate = require('../lib/generate/index.js')
const fs = require('fs')
const pathLib = require('path')

console.log("\n### generate mutations, additions & deletions ###")

const testCasesDir = pathLib.join(__dirname, 'generate-test-cases')
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

tests.forEach(test => {
	runner.test(test.name, () => {
		let targetObj
		if (typeof test.input === 'string' || Array.isArray(test.input)) {
			const inputStr = Array.isArray(test.input) ? test.input.join('\n') : test.input
			targetObj = lookmlParser.parse(inputStr, test.parseOptions || test.options)
		} else if (typeof test.input === 'object' && test.input !== null) {
			targetObj = JSON.parse(JSON.stringify(test.input))
		} else {
			throw new Error(`Invalid test input: ${test.input}`)
		}

		if (test.deepSet && typeof test.deepSet === 'object') {
			for (const [pathStr, val] of Object.entries(test.deepSet)) {
				setByPath(targetObj, pathStr, val)
			}
		}

		if (Array.isArray(test.deepDelete)) {
			for (const pathStr of test.deepDelete) {
				deleteByPath(targetObj, pathStr)
			}
		}

		if (test.error) {
			let didThrow = false
			try {
				generate(targetObj, test.generateOptions || test.options)
			} catch (e) {
				didThrow = true
			}
			if (!didThrow) {
				throw new Error(`Expected generate() to throw an Error for test '${test.name}', but it did not throw.`)
			}
			return "ok"
		}

		const generated = generate(targetObj, test.generateOptions || test.options)
		const expectedStr = Array.isArray(test.expected) ? test.expected.join('\n') : test.expected

		if (generated !== expectedStr) {
			throw new Error(
				`Mismatch for test '${test.name}':\n` +
				`-- Expected (${expectedStr.length} chars) --\n${expectedStr}\n` +
				`-- Received (${generated.length} chars) --\n${generated}`
			)
		}

		return "ok"
	})
})

function setByPath(obj, pathStr, value) {
	const parts = pathStr.split('.')
	let curr = obj
	for (let i = 0; i < parts.length - 1; i++) {
		const key = parts[i]
		if (curr[key] === undefined || curr[key] === null) {
			curr[key] = {}
		}
		curr = curr[key]
	}
	curr[parts[parts.length - 1]] = value
}

function deleteByPath(obj, pathStr) {
	const parts = pathStr.split('.')
	let curr = obj
	for (let i = 0; i < parts.length - 1; i++) {
		const key = parts[i]
		if (!curr || typeof curr !== 'object') return
		curr = curr[key]
	}
	if (curr && typeof curr === 'object') {
		delete curr[parts[parts.length - 1]]
	}
}
