// Generates the LookML parser from lookml.peg.
//
// Generating at build/publish time rather than at import time keeps the package
// usable when it is bundled into an artifact that has no node_modules at
// runtime (bun --compile, pkg, nexe, Node SEA, serverless bundles): a bundler
// inlines required JS, but not a data file read via fs at runtime.
const fs = require("fs")
const path = require("path")
const peg = require("pegjs")

const GRAMMAR = path.join(__dirname, "..", "lib", "parse", "lookml.peg")
const OUT     = path.join(__dirname, "..", "lib", "parse", "parser.generated.js")

const source = peg.generate(fs.readFileSync(GRAMMAR, {encoding: "utf-8"}), {
	output: "source",
	format: "commonjs",
})

fs.writeFileSync(OUT, "// GENERATED FROM lookml.peg BY scripts/build-parser.js -- DO NOT EDIT\n" + source)
console.log("generated " + path.relative(path.join(__dirname, ".."), OUT))
