const { parseCliArgs } = require('./flags.js')
const { startRepl, startErrorRepl } = require('./repl.js')
const parseFiles = require('../parse-files')

async function run(args = process.argv) {
	const { parseFilesOptions, interactive, whitespace } = parseCliArgs(args)
	try {
		const result = await parseFiles(parseFilesOptions)
		if (interactive) {
			startRepl(result)
		} else {
			console.log(JSON.stringify(result, undefined, whitespace))
		}
		return result
	} catch (errResult) {
		if (interactive) {
			startErrorRepl(errResult)
		} else {
			console.error(JSON.stringify(errResult, undefined, whitespace))
		}
		throw errResult
	}
}

module.exports = {
	run,
	parseCliArgs,
	startRepl,
	startErrorRepl
}
