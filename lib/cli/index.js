const { parseCliArgs } = require('./flags.js')
const { startRepl, startErrorRepl } = require('./repl.js')
const parseFiles = require('../parse-files')
const CustomConsole = require('../common/custom-console.js')

async function run(args = process.argv, options = {}) {
	const { parseFilesOptions, interactive, whitespace } = parseCliArgs(args)
	const mergedOptions = { ...parseFilesOptions, ...options }
	const cliConsole = new CustomConsole(mergedOptions.console)
	try {
		const result = await parseFiles(mergedOptions)
		if (interactive) {
			startRepl(result)
		} else {
			cliConsole.log(JSON.stringify(result, undefined, whitespace))
		}
		return result
	} catch (errResult) {
		if (interactive) {
			startErrorRepl(errResult)
		} else {
			cliConsole.error(JSON.stringify(errResult, undefined, whitespace))
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
