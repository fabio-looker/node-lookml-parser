const encodeProperty = require("../common/encode-property")
const lookmlParser = require("./parser.generated.js")
const { transformAst } = require("./transform-ast.js")

function validateConditionalCommentString(conditionalCommentString) {
	if (conditionalCommentString) {
		if (conditionalCommentString.match(/[\.\{\}\*\+\?\^\$\[\]\(\)\t\n\r \\]/)) {
			throw new Error("conditionalCommentString must not include any whitsepace or RegEx special characters")
		}
	}
}

function handleParseError(e, stringToParse) {
	const ccTag = e.$conditionalComment || e.conditionalCommentTag
	const tagPrefix = ccTag ? `in conditional comment '# ${ccTag}' ` : ""
	const toString = () => "Parse error " + tagPrefix + "@" + (e.location && e.location.start.line + "," + e.location.start.column) + " " + (e.message || e.toString())
	const ccContext = ccTag ? `In conditional comment '# ${ccTag}' (line ${e.location ? e.location.start.line : 1}):\n` : ""
	return {
		toString,
		toJSON: () => JSON.stringify(toString()),
		exception: e,
		...(e.location ? {
			context: ccContext + stringToParse.split("\n").map((l, i) => '' + (i + 1) + ":\t" + l).slice(Math.max(0, e.location.start.line - 4), e.location.end.line + 2).join("\n")
		} : {})
	}
}

function lookmlParser_parseAst(stringToParse, { conditionalCommentString } = {}) {
	validateConditionalCommentString(conditionalCommentString)
	try {
		return lookmlParser.parse(stringToParse)
	} catch (e) {
		throw handleParseError(e, stringToParse)
	}
}

function lookmlParser_parse(stringToParse, { conditionalCommentString } = {}) {
	validateConditionalCommentString(conditionalCommentString)
	try {
		const ast = lookmlParser.parse(stringToParse)
		return transformAst(ast, { conditionalCommentString })
	} catch (e) {
		throw handleParseError(e, stringToParse)
	}
}

lookmlParser_parse.parseAst = lookmlParser_parseAst
lookmlParser_parse.ast = lookmlParser_parseAst

module.exports = lookmlParser_parse
module.exports.parseAst = lookmlParser_parseAst