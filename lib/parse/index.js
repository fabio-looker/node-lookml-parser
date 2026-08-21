const encodeProperty = require("../common/encode-property")
const lookmlParser = require("./parser.generated.js")
const { transformAst } = require("./transform-ast.js")

function prepareStringToParse(stringToParse, conditionalCommentString) {
	if (conditionalCommentString) {
		if (conditionalCommentString.match(/[\.\{\}\*\+\?\^\$\[\]\(\)\t\n\r \\]/)) {
			throw new Error("conditionalCommentString must not include any whitsepace or RegEx special characters")
		}
		var insertRegex = new RegExp(
			"(\\n|^)\\s*#[ \\t]*"
			+ conditionalCommentString
			+ "[^\\n]*"
			+ "((\\n\\s*#[^\\n]*)*)", "g"
		)
		var replaceRegex = new RegExp(
			`(\\n|^)(\\s*)(#([ \\t]*${conditionalCommentString}[ \\t]?|[ \\t]?))?`,
			"g"
		)
		stringToParse = stringToParse.replace(
			insertRegex,
			(match, start, block) => match.replace(replaceRegex, "$1$2")
		)
	}
	return stringToParse
}

function handleParseError(e, stringToParse) {
	const toString = () => "Parse error@" + (e.location && e.location.start.line + "," + e.location.start.column) + " " + (e.message || e.toString())
	return {
		toString,
		toJSON: () => JSON.stringify(toString()),
		exception: e,
		...(e.location ? {
			context: stringToParse.split("\n").map((l, i) => '' + (i + 1) + ":\t" + l).slice(e.location.start.line - 4, e.location.end.line + 2).join("\n")
		} : {})
	}
}

function lookmlParser_parseAst(stringToParse, { conditionalCommentString } = {}) {
	stringToParse = prepareStringToParse(stringToParse, conditionalCommentString)
	try {
		return lookmlParser.parse(stringToParse)
	} catch (e) {
		throw handleParseError(e, stringToParse)
	}
}

function lookmlParser_parse(stringToParse, { conditionalCommentString } = {}) {
	stringToParse = prepareStringToParse(stringToParse, conditionalCommentString)
	try {
		const ast = lookmlParser.parse(stringToParse)
		return transformAst(ast)
	} catch (e) {
		throw handleParseError(e, stringToParse)
	}
}

lookmlParser_parse.parseAst = lookmlParser_parseAst
lookmlParser_parse.ast = lookmlParser_parseAst

module.exports = lookmlParser_parse
module.exports.parseAst = lookmlParser_parseAst