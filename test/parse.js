const TestRunner = require('test-runner')
const runner = new TestRunner()
const deepExpect = require("./lib/deep-expect.js")
const lookmlParser_parse = require("../lib/parse/index.js")
const util = require("util")
const fs = require('fs')
const pathLib = require('path')

const testCasesDir = pathLib.join(__dirname, 'parse-test-cases')

function getTestFiles(dir) {
	let results = []
	const list = fs.readdirSync(dir, { withFileTypes: true })
	for (const entry of list) {
		const fullPath = pathLib.join(dir, entry.name)
		if (entry.isDirectory()) {
			results = results.concat(getTestFiles(fullPath))
		} else if (entry.isFile() && entry.name.endsWith('.json')) {
			results.push(fullPath)
		}
	}
	return results
}

const tests = getTestFiles(testCasesDir)
	.sort()
	.map(filePath => {
		const relativePath = pathLib.relative(testCasesDir, filePath)
		const defaultName = relativePath.slice(0, -5).replace(/\\/g, '/')
		const spec = JSON.parse(fs.readFileSync(filePath, 'utf8'))
		return {
			name: spec.name || defaultName,
			...spec
		}
	})

const utOpt = {compact:false, maxArrayLength:3, depth:8, breakLength:60 }

console.log("\n### parse ###")
tests.forEach( test =>
	runner.test(test.name, () => {
		if (test.error) {
			let didThrow = false
			let errObj = null
			try {
				const res = lookmlParser_parse(test.input, test.options)
				const errs = collectErrors(res)
				if (errs.length > 0) {
					errObj = errs[0]
				}
			} catch (e) {
				didThrow = true
				errObj = e
			}
			if (!errObj) {
				throw new Error(`Expected parse() to return/throw an error for test '${test.name}', but none was found.`)
			}

			if (test.errorType) {
				const actualType = errObj.name || errObj.errorType || (errObj.constructor && errObj.constructor.name)
				if (actualType !== test.errorType) {
					throw new Error(`Expected error type '${test.errorType}' for test '${test.name}', but received '${actualType}'.`)
				}
			}

			if (test.errorCode) {
				const actualCode = errObj.code
				if (actualCode !== test.errorCode) {
					throw new Error(`Expected error code '${test.errorCode}' for test '${test.name}', but received '${actualCode}'.`)
				}
			}

			if (test.errorProperty) {
				const actualProp = errObj.property
				if (actualProp !== test.errorProperty) {
					throw new Error(`Expected error property '${test.errorProperty}' for test '${test.name}', but received '${actualProp}'.`)
				}
			}

			if (test.expectedErrorJson) {
				let jsonVal
				if (typeof errObj.toJSON === 'function') {
					const raw = errObj.toJSON()
					jsonVal = typeof raw === 'string' ? JSON.parse(raw) : raw
				} else {
					jsonVal = JSON.parse(JSON.stringify(errObj))
				}
				var results = deepExpect(test.expectedErrorJson)(jsonVal)
				if (results.length) {
					throw new Error(`JSON serialized error did not match expected structure:\n` + results.join('\n'))
				}
			}

			if (test.errorContains) {
				const errMsg = (errObj && (errObj.context || errObj.message || (errObj.exception && String(errObj.exception)) || String(errObj))) || ''
				if (!errMsg.includes(test.errorContains)) {
					throw new Error(`Expected error message to contain '${test.errorContains}', but received:\n${errMsg}`)
				}
			}
			return "ok"
		}

		var parsed = lookmlParser_parse(test.input, test.options)
		if ({}.polluted !== undefined) {
			throw "Prototype pollution occurred"
		}
		var expected = test.expected || test.exp
		var results = deepExpect(expected)(parsed)
		if (results.length) {
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

function collectErrors(obj, visited = new Set()) {
	if (!obj || typeof obj !== 'object' || visited.has(obj)) return []
	visited.add(obj)
	let errs = []
	if (Array.isArray(obj.errors)) errs.push(...obj.errors)
	for (const key of Object.keys(obj)) {
		if (key === 'errors' || key[0] === '$') continue
		errs.push(...collectErrors(obj[key], visited))
	}
	return errs
}
