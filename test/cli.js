const TestRunner = require('test-runner')
const runner = new TestRunner()
const pathLib = require('path')
const { parseCliArgs } = require('../lib/cli/flags.js')
const cli = require('../lib/cli')

console.log("\n### CLI flags & adapters ###")

runner.test("parseCliArgs defaults: strings=false, legacyFileMetadata=false, modelAssembly=true, extensions=true", () => {
	const parsed = parseCliArgs(['node', 'cli.js', '-i', 'foo.lkml'])
	const opts = parsed.parseFilesOptions
	if (opts.strings !== false) throw new Error(`Expected strings=false in CLI default, got ${opts.strings}`)
	if (opts.legacyFileMetadata !== false) throw new Error(`Expected legacyFileMetadata=false in CLI default, got ${opts.legacyFileMetadata}`)
	if (opts.modelAssembly !== true) throw new Error(`Expected modelAssembly=true in CLI default, got ${opts.modelAssembly}`)
	if (opts.extensions !== true) throw new Error(`Expected extensions=true in CLI default, got ${opts.extensions}`)
	if (opts.positions !== false) throw new Error(`Expected positions=false in CLI default, got ${opts.positions}`)
	if (opts.ast !== false) throw new Error(`Expected ast=false in CLI default, got ${opts.ast}`)
	return "ok"
})

runner.test("parseCliArgs short flags -s, -f, -p, -a enable positive feature flags", () => {
	const parsed = parseCliArgs(['node', 'cli.js', '-i', 'foo.lkml', '-s', '-f', '-p', '-a'])
	const opts = parsed.parseFilesOptions
	if (opts.strings !== true) throw new Error("Expected strings=true with -s")
	if (opts.legacyFileMetadata !== true) throw new Error("Expected legacyFileMetadata=true with -f")
	if (opts.positions !== true) throw new Error("Expected positions=true with -p")
	if (opts.ast !== true) throw new Error("Expected ast=true with -a")
	return "ok"
})

runner.test("parseCliArgs handles legacy string combinations in -x sxf", () => {
	const parsed = parseCliArgs(['node', 'cli.js', '-i', 'foo.lkml', '-x', 'sxf'])
	const opts = parsed.parseFilesOptions
	if (opts.strings !== true) throw new Error("Expected strings=true from -x sxf")
	if (opts.legacyFileMetadata !== true) throw new Error("Expected legacyFileMetadata=true from -x sxf")
	if (opts.extensions !== true) throw new Error("Expected extensions=true from -x sxf")
	return "ok"
})

runner.test("cli.run parses files with CLI defaults (omitting $strings and legacy file metadata)", async () => {
	const testPath = pathLib.join(__dirname, '../test-projects/001-simple-model/*.lkml')
	const result = await cli.run(['node', 'cli.js', '-i', testPath])
	if (!result.file) throw new Error("Expected project.file in result")
	for (const [key, fileObj] of Object.entries(result.file)) {
		if (fileObj.$strings !== undefined) throw new Error(`Expected $strings to be undefined on ${key}`)
		if (fileObj.$file_rel !== undefined) throw new Error(`Expected $file_rel to be undefined on ${key}`)
		if (!fileObj.$file_path) throw new Error(`Expected $file_path to be preserved on ${key}`)
	}
	return "ok"
})

runner.test("cli.run with -s and -f includes $strings and legacy file metadata", async () => {
	const testPath = pathLib.join(__dirname, '../test-projects/001-simple-model/*.lkml')
	const result = await cli.run(['node', 'cli.js', '-i', testPath, '-s', '-f'])
	if (!result.file) throw new Error("Expected project.file in result")
	for (const [key, fileObj] of Object.entries(result.file)) {
		if (!fileObj.$strings) throw new Error(`Expected $strings to be present on ${key}`)
		if (!fileObj.$file_rel) throw new Error(`Expected $file_rel to be present on ${key}`)
		if (!fileObj.$file_name) throw new Error(`Expected $file_name to be present on ${key}`)
		if (!fileObj.$file_type) throw new Error(`Expected $file_type to be present on ${key}`)
		if (!fileObj.$file_path) throw new Error(`Expected $file_path to be present on ${key}`)
	}
	return "ok"
})

runner.test("parseCliArgs detects --validation-mode flag", () => {
	const parsed = parseCliArgs(['node', 'cli.js', '-i', 'foo.lkml', '--validation-mode'])
	if (parsed.parseFilesOptions.validationMode !== true) throw new Error("Expected validationMode=true for --validation-mode")
	return "ok"
})

runner.test("cli.run with --validation-mode outputs validation mode summary and restricted keys", async () => {
	const testPath = pathLib.join(__dirname, '../test-projects/001-simple-model/*.lkml')
	const result = await cli.run(['node', 'cli.js', '-i', testPath, '--validation-mode'])
	if (result.model !== undefined) throw new Error("Expected result.model to be undefined in CLI validation mode")
	if (!result.info || !result.info.some(i => i.type === 'summary')) {
		throw new Error("Expected summary in result.info")
	}
	for (const [key, fileObj] of Object.entries(result.file)) {
		if (Object.keys(fileObj).length !== 0) throw new Error(`Expected empty file obj for clean file, got ${JSON.stringify(fileObj)}`)
	}
	return "ok"
})
