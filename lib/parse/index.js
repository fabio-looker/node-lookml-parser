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
	if (e && (e.code === 'DUPLICATE_SINGULAR_PROPERTY' || e.name === 'LookMLCardinalityError')) {
		if (stringToParse && !e.context && e.location) {
			e.context = stringToParse.split("\n").map((l, i) => '' + (i + 1) + ":\t" + l).slice(Math.max(0, e.location.start.line - 4), e.location.end.line + 2).join("\n")
		}
		return e
	}
	const ccTag = e.$conditionalComment || e.conditionalCommentTag
	const tagPrefix = ccTag ? `in conditional comment '# ${ccTag}' ` : ""
	const locStr = e.location ? `@${e.location.start.line},${e.location.start.column}` : ""
	const rawMsg = e.message || String(e)
	const message = `Parse error ${tagPrefix}${locStr} ${rawMsg}`.trim()

	const toString = () => message
	const lineNum = e.location ? e.location.start.line : (e._baseLine || 1)
	const ccContext = ccTag ? `In conditional comment '# ${ccTag}' (line ${lineNum}):\n` : ""
	const contextSnippet = e.location ? ccContext + stringToParse.split("\n").map((l, i) => '' + (i + 1) + ":\t" + l).slice(Math.max(0, e.location.start.line - 4), e.location.end.line + 2).join("\n") : undefined

	return {
		code: e.code || 'SYNTAX_ERROR',
		message,
		...(e.location ? { line: e.location.start.line, column: e.location.start.column } : {}),
		...(contextSnippet ? { context: contextSnippet } : {}),
		toString,
		toJSON: () => (typeof e.toJSON === 'function' ? e.toJSON() : message),
		exception: e
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

function lookmlParser_parseRaw(stringToParse, options = {}) {
	const { conditionalCommentString } = options || {}
	validateConditionalCommentString(conditionalCommentString)
	try {
		const ast = lookmlParser.parse(stringToParse, options)
		return transformAst(ast, { ...options, buildStrings: false })
	} catch (e) {
		throw handleParseError(e, stringToParse)
	}
}

function lookmlParser_parse(stringToParse, options = {}) {
	const {
		conditionalCommentString,
		strings = true,
		dropStrings = false,
		positions = false,
		addPositions = false,
		getPositions,
		ast: astFlag = false,
		includeAst = false
	} = options || {}

	const wantStrings = strings !== false && dropStrings !== true
	const wantPositions = Boolean(positions || addPositions || getPositions)
	const wantAst = Boolean(astFlag || includeAst)
	const needsStrings = wantStrings || wantPositions

	validateConditionalCommentString(conditionalCommentString)
	try {
		const ast = lookmlParser.parse(stringToParse, options)
		let result = transformAst(ast, { ...options, buildStrings: needsStrings })
		if (wantAst) {
			result.$ast = ast
		}
		if (!wantStrings && result.$strings) {
			delete result.$strings
		}
		return result
	} catch (e) {
		throw handleParseError(e, stringToParse)
	}
}

lookmlParser_parse.parseAst = lookmlParser_parseAst
lookmlParser_parse.parseRaw = lookmlParser_parseRaw
lookmlParser_parse.ast = lookmlParser_parseAst

module.exports = lookmlParser_parse
module.exports.parseAst = lookmlParser_parseAst
module.exports.parseRaw = lookmlParser_parseRaw
module.exports.handleParseError = handleParseError

