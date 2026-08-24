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
	if (e && e.exception) {
		return e
	}
	if (e && e.name === 'LookMLCardinalityError') {
		if (stringToParse && !e.context && e.location) {
			e.context = stringToParse.split("\n").map((l, i) => '' + (i + 1) + ":\t" + l).slice(Math.max(0, e.location.start.line - 4), e.location.end.line + 2).join("\n")
		}
		return e
	}
	const ccTag = e.$conditionalComment || e.conditionalCommentTag
	const tagPrefix = ccTag ? `in conditional comment '# ${ccTag}' ` : ""
	const toString = () => "Parse error " + tagPrefix + "@" + (e.location && e.location.start.line + "," + e.location.start.column) + " " + (e.message || e.toString())
	const lineNum = e.location ? e.location.start.line : (e._baseLine || 1)
	const ccContext = ccTag ? `In conditional comment '# ${ccTag}' (line ${lineNum}):\n` : ""
	return {
		name: e.name || 'ParseError',
		toString,
		toJSON: () => (typeof e.toJSON === 'function' ? e.toJSON() : JSON.stringify(toString())),
		exception: e,
		...(e.location ? {
			context: ccContext + stringToParse.split("\n").map((l, i) => '' + (i + 1) + ":\t" + l).slice(Math.max(0, e.location.start.line - 4), e.location.end.line + 2).join("\n")
		} : {})
	}
}

function lookmlParser_parseAst(stringToParse, options = {}) {
	const { conditionalCommentString } = options || {}
	validateConditionalCommentString(conditionalCommentString)
	try {
		return lookmlParser.parse(stringToParse, options)
	} catch (e) {
		throw handleParseError(e, stringToParse)
	}
}

function lookmlParser_parse(stringToParse, options = {}) {
	const { conditionalCommentString } = options || {}
	validateConditionalCommentString(conditionalCommentString)
	try {
		const ast = lookmlParser.parse(stringToParse, options)
		return transformAst(ast, options)
	} catch (e) {
		throw handleParseError(e, stringToParse)
	}
}

lookmlParser_parse.parseAst = lookmlParser_parseAst
lookmlParser_parse.ast = lookmlParser_parseAst

module.exports = lookmlParser_parse
module.exports.parseAst = lookmlParser_parseAst
module.exports.handleParseError = handleParseError
