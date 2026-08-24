const repl = require('repl')
const util = require('util')

function startRepl(result) {
	if (result && result.errors) {
		result.errorReport = errorReporter(result)
	}
	const r = repl.start({
		writer: x =>
			util
				.inspect(x, { depth: 1, colors: true })
				// Truncate long strings
				.replace(/: "([^"]{60})[^"]+"/, ': "$1..."')
				// Collapse some levels
				.replace(/(\n\s+([_a-zA-Z$][_0-9a-zA-Z$]*)?:)\s+([_a-zA-Z$][_0-9a-zA-Z$]* {)/g, "$1 $2")
	})
	Object.assign(r.context, result || {})
	console.info("\x1b[32mSuccess!\x1b[0m Evaluate any of the following"
		+ "\n\t"
		+ Object.keys(result || {})
			.map(s => s.match(/error|warning/) ? "\x1b[33m" + s + "\x1b[0m" : s)
			.map(s => typeof result[s] == "function"
				? s + (result[s].toString().match(/\([^)]*\)/) || [""])[0]
				: s)
			.join(", ")
	)
	return r
}

function startErrorRepl(errResult) {
	const r = repl.start()
	r.context.error = errResult
	console.info("\x1b[31mError.\x1b[0m Evaluate `error` for details")
	return r
}

function errorReporter(project) {
	return function errorReport() {
		console.log(project.errors?.map(err =>
			err?.$file_path
			+ "\n" + [
				err?.message,
				err?.error?.toString(),
				err?.error?.context
			].filter(Boolean).join("\n")
		).join("\n\n"))
		return "Error report logged."
	}
}

module.exports = {
	startRepl,
	startErrorRepl,
	errorReporter
}
