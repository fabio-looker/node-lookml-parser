const minimist = require('minimist')

function parseCliArgs(args) {
	const argv = Array.isArray(args) ? args : process.argv
	const cliArgs = minimist(argv.slice(
		argv[0] == "lookml-parser" ? 1 : 2
	))

	// Handle legacy -x / --transform flag if string is passed (e.g. -x sxf)
	const transformStr = typeof cliArgs.transform === 'string' ? cliArgs.transform : (typeof cliArgs.x === 'string' ? cliArgs.x : null)

	let strings = Boolean(cliArgs.strings || cliArgs.s)
	let legacyFileMetadata = Boolean(cliArgs['legacy-file-metadata'] || (typeof cliArgs.f === 'boolean' && cliArgs.f))
	let modelAssembly = cliArgs.models !== undefined ? Boolean(cliArgs.models) : (cliArgs.m !== undefined ? Boolean(cliArgs.m) : true)
	let extensions = cliArgs.extensions !== undefined ? Boolean(cliArgs.extensions) : (typeof cliArgs.x === 'boolean' ? cliArgs.x : true)
	let positions = Boolean(cliArgs.positions || cliArgs.p)
	let ast = Boolean(cliArgs.ast || cliArgs.a)

	if (transformStr !== null) {
		for (const char of transformStr.split('')) {
			if (char === 's') strings = true
			if (char === 'f') legacyFileMetadata = true
			if (char === 'x') extensions = true
			if (char === 'm') modelAssembly = true
			if (char === 'p') positions = true
			if (char === 'a') ast = true
		}
	}

	const fileOutput = cliArgs['file-output'] || (typeof cliArgs.f === 'string' ? cliArgs.f : 'by-name')
	const input = cliArgs.input || cliArgs.i
	const conditionalCommentString = cliArgs['conditional-comment'] || cliArgs.c
	const interactive = Boolean(cliArgs.interactive)
	const whitespace = cliArgs.whitespace
	const trace = (cliArgs.trace || cliArgs.t || '').split(",").filter(Boolean).reduce((idx, x) => ({ ...idx, [x]: true }), {})

	return {
		parseFilesOptions: {
			input,
			conditionalCommentString,
			fileOutput,
			modelAssembly,
			extensions,
			strings,
			legacyFileMetadata,
			positions,
			ast,
			trace
		},
		interactive,
		whitespace,
		cliArgs
	}
}

module.exports = {
	parseCliArgs
}
