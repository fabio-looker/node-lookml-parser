const encodeProperty = require("../common/encode-property")
const pegParser = require("./parser.generated.js")

function escapeRegExp(str) {
	return str.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
}

function countNewlines(str) {
	if (typeof str !== 'string') return 0
	let count = 0
	for (let i = 0; i < str.length; i++) {
		if (str[i] === '\n') count++
	}
	return count
}

function countNewlinesInTokens(tokens) {
	if (!tokens) return 0
	let count = 0
	if (Array.isArray(tokens)) {
		for (const t of tokens) {
			if (typeof t === 'string') count += countNewlines(t)
			else if (t && typeof t === 'object' && t.value) count += countNewlines(extractString(t))
		}
	} else if (typeof tokens === 'string') {
		count += countNewlines(tokens)
	}
	return count
}

function transformAst(astNode, options = {}) {
	if (!astNode) return {}
	if (astNode.type === 'lookml' || astNode.type === 'file') {
		const buildStrings = options.buildStrings !== undefined
			? Boolean(options.buildStrings)
			: (options.strings !== false && options.dropStrings !== true)
		const extraDecls = options._extraDecls || []
		const opts = { ...options, buildStrings }
		delete opts._extraDecls
		const baseLine = options._baseLine || 1
		const parentScope = options.parentScope || 'model'
		const declarations = [
			...extraDecls,
			...(astNode.declarations || []).map(decl => transformDeclaration(decl, opts))
		]
		const { collection, $strings, unknownInfo } = groupDeclarations(declarations, opts, baseLine)
		const result = buildStrings ? { ...collection, $strings } : { ...collection }

		if (unknownInfo && unknownInfo.length > 0) {
			const infoMap = new Map()
			for (const item of unknownInfo) {
				if (!infoMap.has(item.property)) {
					infoMap.set(item.property, item)
				}
			}
			result.info = Array.from(infoMap.values())
		}

		if (!options._isInner) {
			typeValidationAndNormalization(result, opts, parentScope)
		}

		return result
	}
	return {}
}

function transformDeclaration(declNode, options = {}) {
	if (!declNode) return null
	if (typeof declNode === 'string') {
		return { isTrivia: true, value: declNode }
	}
	if (declNode.type === 'whitespace' || declNode.type === 'comment') {
		return { isTrivia: true, value: declNode.value }
	}
	if (declNode.type === 'object') {
		const { conditionalCommentString } = options

		const _1 = (declNode.syntax?._1 || []).map(extractString)
		const _2 = (declNode.syntax?._2 || []).map(extractString)
		const _3 = (declNode.syntax?._3 || []).map(extractString)

		let _4Raw = (declNode.syntax?._4 || []).map(extractString)
		let _5Raw = (declNode.syntax?._5 || []).map(extractString)

		const baseLine = options._baseLine || 1

		let extraInnerDecls = []

		if (conditionalCommentString) {
			const res4 = extractConditionalCommentSubItems(_4Raw, conditionalCommentString, baseLine)
			_4Raw = res4.remainingTrivia
			extraInnerDecls.push(...res4.subItems)

			const res5 = extractConditionalCommentSubItems(_5Raw, conditionalCommentString, baseLine)
			_5Raw = res5.remainingTrivia
			extraInnerDecls.push(...res5.subItems)
		}

		const res = transformAst(declNode.value, { ...options, _isInner: true, _extraDecls: extraInnerDecls, _baseLine: baseLine })
		const { $strings: innerStrings, ...innerCollection } = res

		if (innerCollection && typeof innerCollection === 'object') {
			try {
				Object.defineProperty(innerCollection, '$type', { value: declNode.declarationType, enumerable: true, writable: true, configurable: true })
				if (declNode.name) {
					Object.defineProperty(innerCollection, '$name', { value: declNode.name, enumerable: true, writable: true, configurable: true })
				}
			} catch (e) {}
		}

		const _4 = _4Raw
		const _5 = _5Raw

		const innerS = (innerStrings && Array.isArray(innerStrings.$s)) ? innerStrings.$s : []
		if (innerStrings) delete innerStrings.$s

		const headTokens = [["$type"], ..._1, ":", ..._2, ...(declNode.name ? [["$name"]] : []), ..._3, "{", ..._4].filter(Boolean)
		const tailTokens = [..._5, "}"].filter(Boolean)

		const $s_decl = {
			...innerStrings,
			$s: [...headTokens, ...innerS, ...tailTokens]
		}

		return {
			$type: declNode.declarationType,
			...(declNode.name ? { $name: declNode.name } : {}),
			$value: innerCollection,
			$s_decl
		}
	}
	if (declNode.type === 'block') {
		const _1 = (declNode.syntax?._1 || []).map(extractString)
		const valueStr = declNode.value?.value || declNode.value || ""
		const $s_decl = [["$type"], ..._1, ":", ["$value"], ";;"].filter(Boolean)
		return {
			$type: declNode.declarationType,
			$value: valueStr,
			$s_decl
		}
	}
	if (declNode.type === 'generic') {
		const elRes = transformElement(declNode.value)
		const _1 = (declNode.syntax?._1 || []).map(extractString)
		const _2 = (declNode.syntax?._2 || []).map(extractString)

		let $s_decl
		if (Array.isArray(elRes.$s_el)) {
			$s_decl = [["$type"], ..._1, ":", ..._2, ...elRes.$s_el].filter(Boolean)
		} else if (elRes.$s_el && typeof elRes.$s_el === 'object') {
			$s_decl = {
				...elRes.$s_el,
				$s: [["$type"], ..._1, ":", ..._2, ...(Array.isArray(elRes.$s_el.$s) ? elRes.$s_el.$s : [])].filter(Boolean)
			}
		} else {
			$s_decl = [["$type"], ..._1, ":", ..._2].filter(Boolean)
		}

		return {
			$type: declNode.declarationType,
			$value: elRes.$value,
			$s_decl
		}
	}
	return null
}

function transformElement(elNode) {
	if (!elNode) return { $value: undefined, $s_el: [] }

	if (elNode.type === 'empty_list') {
		const _ = (elNode.syntax?._ || []).map(extractString)
		return {
			$value: [],
			$s_el: ["[" , ..._, "]"].filter(Boolean)
		}
	}

	if (elNode.type === 'list') {
		const _0 = (elNode.syntax?._0 || []).map(extractString)
		const leading = elNode.syntax?.leading
			? [...elNode.syntax.leading[0].map(extractString), elNode.syntax.leading[1]]
			: []
		const _last = (elNode.syntax?._last || []).map(extractString)

		const bodyRaw = elNode.syntax?.bodyRaw || []
		const tailRaw = elNode.syntax?.tailRaw ? [elNode.syntax.tailRaw] : []
		const rawItems = [...bodyRaw, ...tailRaw]

		const value = rawItems.map(([_1, itemElNode]) => transformElement(itemElNode).$value)

		const sObj = {
			$s: ["[", ..._0, ...leading].filter(Boolean)
		}

		rawItems.forEach(([_1, bodyElNode, _2, trailing, _3], i) => {
			const bodyEl = transformElement(bodyElNode)
			const _1s = (_1 || []).map(extractString)
			const _2s = (_2 || []).map(extractString)
			const _3s = (_3 || []).map(extractString)
			const itemTokens = Array.isArray(bodyEl.$s_el) ? bodyEl.$s_el : [bodyEl.$s_el]
			sObj[i] = [..._1s, ...itemTokens, ..._2s, ...(trailing ? [trailing] : []), ..._3s].filter(Boolean)
			sObj.$s.push([i])
		})

		sObj.$s.push(...[..._last, "]"].filter(Boolean))

		return {
			$value: value,
			$s_el: sObj
		}
	}

	if (elNode.type === 'map') {
		const _0 = (elNode.syntax?._0 || []).map(extractString)
		const leading = elNode.syntax?.leading
			? [...elNode.syntax.leading[0].map(extractString), elNode.syntax.leading[1]]
			: []
		const _last = (elNode.syntax?._last || []).map(extractString)

		const bodyRaw = elNode.syntax?.bodyRaw || []
		const tailRaw = elNode.syntax?.tailRaw ? [elNode.syntax.tailRaw] : []
		const rawEntries = [...bodyRaw, ...tailRaw]

		const value = rawEntries
			.map(([_1, key, _2, colon, _3, elNode]) => [key, transformElement(elNode).$value])
			.reduce((obj, [k, v]) => ({ ...obj, [k]: v }), {})

		const sObj = {
			$s: ["[", ..._0, ...leading].filter(Boolean)
		}

		rawEntries.forEach(([_1, key, _2, colon, _3, bodyElNode, _4, comma, _5]) => {
			const bodyEl = transformElement(bodyElNode)
			const _1s = (_1 || []).map(extractString)
			const _2s = (_2 || []).map(extractString)
			const _3s = (_3 || []).map(extractString)
			const _4s = (_4 || []).map(extractString)
			const _5s = (_5 || []).map(extractString)
			const itemTokens = Array.isArray(bodyEl.$s_el) ? bodyEl.$s_el : [bodyEl.$s_el]
			sObj[key] = [..._1s, key, ..._2s, colon, ..._3s, ...itemTokens, ..._4s, ...(comma ? [comma] : []), ..._5s].filter(Boolean)
			sObj.$s.push([key])
		})

		sObj.$s.push(...[..._last, "]"].filter(Boolean))

		return {
			$value: value,
			$s_el: sObj
		}
	}

	if (elNode.type === 'atom') {
		return {
			$value: elNode.value,
			$s_el: [["$value"]]
		}
	}

	if (elNode.type === 'string' || elNode.type === 'quoted_string') {
		const _1 = (elNode.syntax?._1 || []).map(extractString)
		const _2 = (elNode.syntax?._2 || []).map(extractString)
		return {
			$value: elNode.value,
			$s_el: ['"', ..._1, ["$value"], ..._2, '"'].filter(Boolean)
		}
	}

	return { $value: undefined, $s_el: [] }
}

function groupDeclarations(declarations, options = {}, baseLine = 1) {
	const collection = {}
	const $strings = {}
	const unknownInfo = []
	let leadingTrivia = []
	let currentLine = baseLine
	const buildStrings = options.buildStrings !== false

	const declsToProcess = []
	for (const item of declarations) {
		if (!item) continue
		if (item.isTrivia) {
			leadingTrivia.push(item.value)
		} else {
			if (options.conditionalCommentString && leadingTrivia.length) {
				const res = extractConditionalCommentSubItems(leadingTrivia, options.conditionalCommentString, currentLine)
				leadingTrivia = res.remainingTrivia
				declsToProcess.push(...res.subItems)
			}
			currentLine += countNewlinesInTokens(leadingTrivia)
			if (buildStrings) attachLeadingTrivia(item.$s_decl, leadingTrivia)
			leadingTrivia = []
			declsToProcess.push(item)
		}
	}

	if (options.conditionalCommentString && leadingTrivia.length) {
		const res = extractConditionalCommentSubItems(leadingTrivia, options.conditionalCommentString, currentLine)
		leadingTrivia = res.remainingTrivia
		declsToProcess.push(...res.subItems)
	}

	const $s = []

	for (const decl of declsToProcess) {
		const typeKey = encodeProperty(decl.$type)

		if (decl.$name) {
			const nameKey = encodeProperty(decl.$name)
			if (!collection[typeKey]) {
				collection[typeKey] = {}
				if (buildStrings) $strings[typeKey] = {}
			}
			if (!collection[typeKey][nameKey]) {
				collection[typeKey][nameKey] = []
				if (buildStrings) $strings[typeKey][nameKey] = []
			}
			const idx = collection[typeKey][nameKey].length
			collection[typeKey][nameKey].push(decl.$value)
			if (buildStrings) {
				$strings[typeKey][nameKey].push(decl.$s_decl)
				$s.push([typeKey, nameKey, idx])
				decorateConditionalComment(decl.$s_decl, decl.$conditionalComment)
			}
		} else {
			if (!collection[typeKey]) {
				collection[typeKey] = []
				if (buildStrings) $strings[typeKey] = []
			}
			const idx = collection[typeKey].length
			collection[typeKey].push(decl.$value)
			if (buildStrings) {
				$strings[typeKey].push(decl.$s_decl)
				$s.push([typeKey, idx])
				decorateConditionalComment(decl.$s_decl, decl.$conditionalComment)
			}
		}
	}

	if (buildStrings) {
		if (leadingTrivia.length) {
			$s.push(...leadingTrivia)
		}
		$strings.$s = $s
	}

	return { collection, $strings, unknownInfo }
}

function extractString(node) {
	if (!node) return ""
	if (typeof node === 'string') return node
	if (node.value) return extractString(node.value)
	return ""
}

function extractConditionalCommentSubItems(triviaArray, tag, baseLine = 1) {
	if (!triviaArray || !triviaArray.length) {
		return { remainingTrivia: [], subItems: [] }
	}

	const fullText = triviaArray.join('')
	const lines = fullText.split(/\r\n|\r|\n/)
	const remainingLines = []
	const subItems = []

	const tagRegex = new RegExp('^\\s*#[ \\t]*' + escapeRegExp(tag) + '(?:[ \\t]|$)(.*)$')

	let i = 0
	while (i < lines.length) {
		const line = lines[i]
		const matchTag = line.match(tagRegex)
		if (matchTag) {
			const tagLineIndex = i
			let commentBlock = [line]
			i++
			while (i < lines.length) {
				const nextLine = lines[i]
				const matchCommentLine = nextLine.match(/^\s*#[ \t]?(.*)$/)
				if (matchCommentLine && !tagRegex.test(nextLine)) {
					commentBlock.push(nextLine)
					i++
				} else {
					break
				}
			}

			const codeLines = []
			const inlineCode = matchTag[1] ? matchTag[1].trim() : ""
			const isCompact = inlineCode.length > 0 && commentBlock.length === 1
			if (inlineCode.length > 0) {
				codeLines.push(inlineCode)
			}
			for (let j = 1; j < commentBlock.length; j++) {
				const m = commentBlock[j].match(/^\s*#[ \t]?(.*)$/)
				codeLines.push(m ? m[1] : commentBlock[j])
			}

			const fragmentText = codeLines.join('\n')

			if (fragmentText.trim().length) {
				try {
					const ast = pegParser.parse(fragmentText)
					const res = transformAst(ast, { conditionalCommentString: tag, _baseLine: baseLine + tagLineIndex })
					const { $strings: subStrings, ...subCollection } = res

					for (const key of Object.keys(subCollection)) {
						if (key[0] === '$') continue
						const val = subCollection[key]
						const sDecl = subStrings[key]
						if (Array.isArray(val) && Array.isArray(sDecl)) {
							val.forEach((v, idx) => {
								const s = ensureTrailingNewline(sDecl[idx])
								if (isCompact) markCompact(s)
								subItems.push({
									$type: key,
									$value: v,
									$s_decl: s,
									$conditionalComment: tag
								})
							})
						} else if (isObject(val) && isObject(sDecl) && !sDecl.$s && !Array.isArray(sDecl)) {
							for (const nameKey of Object.keys(val)) {
								const namedVal = val[nameKey]
								const namedSDecl = sDecl[nameKey]
								const s = ensureTrailingNewline(namedSDecl)
								if (isCompact) markCompact(s)
								subItems.push({
									$type: key,
									$name: nameKey,
									$value: namedVal,
									$s_decl: s,
									$conditionalComment: tag
								})
							}
						} else {
							const s = ensureTrailingNewline(sDecl)
							if (isCompact) markCompact(s)
							subItems.push({
								$type: key,
								$value: val,
								$s_decl: s,
								$conditionalComment: tag
							})
						}
					}
				} catch (e) {
					const lineOffset = baseLine + tagLineIndex
					const prefixMatch = line.match(new RegExp('^(\\s*#[ \\t]*' + escapeRegExp(tag) + '(?:[ \\t]|$)[ \\t]*)'))
					const colOffset = prefixMatch ? prefixMatch[1].length : 0

					if (e && e.location && e.location.start) {
						const fragLine = e.location.start.line || 1
						e.location.start.line = lineOffset + (fragLine - 1)
						e.location.end.line = lineOffset + ((e.location.end.line || fragLine) - 1)

						if (fragLine === 1) {
							e.location.start.column = (e.location.start.column || 1) + colOffset - 2
							e.location.end.column = (e.location.end.column || 1) + colOffset - 2
						} else {
							const commentLine = commentBlock[fragLine - 1] || ""
							const cM = commentLine.match(/^\s*#[ \t]?/)
							const cPrefixLen = cM ? cM[0].length : 0
							e.location.start.column = (e.location.start.column || 1) + cPrefixLen
							e.location.end.column = (e.location.end.column || 1) + cPrefixLen
						}
					}

					if (e) {
						e.$conditionalComment = tag
						e.conditionalCommentTag = tag
					}
					throw e
				}
			}
		} else {
			remainingLines.push(line)
			i++
		}
	}

	return {
		remainingTrivia: remainingLines.length ? [remainingLines.join("\n")] : [],
		subItems
	}
}

function markCompact(sDecl) {
	if (!sDecl) return
	if (Array.isArray(sDecl)) {
		sDecl.$isCompact = true
	} else if (typeof sDecl === 'object') {
		sDecl.$isCompact = true
	}
}

function ensureTrailingNewline(sDecl) {
	if (!sDecl) return sDecl
	if (Array.isArray(sDecl)) {
		const last = sDecl[sDecl.length - 1]
		if (typeof last === 'string') {
			if (!last.endsWith('\n')) sDecl.push('\n')
		} else {
			sDecl.push('\n')
		}
	} else if (typeof sDecl === 'object') {
		const tail = sDecl.$s
		if (Array.isArray(tail) && tail.length) {
			const last = tail[tail.length - 1]
			if (typeof last === 'string') {
				if (!last.endsWith('\n')) tail.push('\n')
			} else {
				tail.push('\n')
			}
		}
	}
	return sDecl
}

function decorateConditionalComment(s_decl, tag) {
	if (!s_decl) return
	if (Array.isArray(s_decl)) {
		s_decl.$conditionalComment = tag
		return
	}
	if (typeof s_decl === 'object') {
		s_decl.$conditionalComment = tag
	}
}

function attachLeadingTrivia(s_decl, trivia) {
	if (!trivia || !trivia.length) return
	if (Array.isArray(s_decl)) {
		s_decl.unshift(...trivia)
	} else if (s_decl && typeof s_decl === 'object') {
		if (!s_decl.$s) { s_decl.$s = [] }
		if (Array.isArray(s_decl.$s)) {
			s_decl.$s.unshift(...trivia)
		}
	}
}

function isObject(o) { return o && typeof o == "object" && !o.push }

const { getSchemaProperty, LOOKML_SCHEMA } = require('../schema/lookml-schema.js')
const LookMLCardinalityError = require('../common/cardinality-error.js')

function typeValidationAndNormalization(obj, options = {}, parentScope = 'model', sNode) {
	if (!obj || typeof obj !== 'object') return

	const globalRepeatedSet = options.globalRepeatedKeys || new Set()
	const validationOpts = {
		cardinality: true,
		types: true,
		required: true,
		...(options.validation || {})
	}

	const scope = obj.$type || parentScope
	const $strings = sNode || obj.$strings

	// 1. Validate required properties for current scope
	if (validationOpts.required && scope && LOOKML_SCHEMA[scope]) {
		for (const [propKey, propSchema] of Object.entries(LOOKML_SCHEMA[scope])) {
			if (propSchema.required && (obj[propKey] === undefined || obj[propKey] === null)) {
				if (!obj.errors) obj.errors = []
				obj.errors.push({
					name: 'LookMLRequiredPropertyError',
					code: 'MISSING_REQUIRED_PROPERTY',
					property: propKey,
					message: `Required property "${propKey}" is missing in ${scope}.`
				})
			}
		}
	}

function isMetaKey(key) {
	return key === '$type' || key === '$name' || key === '$s' || key === '$s_decl' || key === '$ast' || key === '$file_path' || key === '$file_rel' || key === '$file_name' || key === '$file_type' || key === 'info' || key === 'errors'
}

	for (const key of Object.keys(obj)) {
		if (isMetaKey(key)) continue

		const schema = getSchemaProperty(scope, key)
		const globalRepeated = globalRepeatedSet.has(key)

		let isSingular
		if (schema) {
			isSingular = schema.cardinality === 'singular'
		} else if (globalRepeated) {
			isSingular = false
		} else {
			isSingular = true
		}

		const val = obj[key]

		if (val && typeof val === 'object' && !Array.isArray(val) && !val.$s) {
			const namedContainerTypes = new Set(['dimension', 'measure', 'filter', 'parameter', 'dimension_group', 'explore', 'view', 'join', 'datagroup', 'access_grant', 'action', 'derived_table', 'map_layer', 'named_value_format'])
			const isNamedContainer = namedContainerTypes.has(key)

			for (const nameKey of Object.keys(val)) {
				if (isMetaKey(nameKey)) continue
				const arr = val[nameKey]
				const isRefinement = nameKey.startsWith('+')

				if (!Array.isArray(arr)) continue

				if (isNamedContainer && arr.length > 1 && !isRefinement) {
					if (validationOpts.cardinality) {
						if (!obj.errors) obj.errors = []
						obj.errors.push(new LookMLCardinalityError(
							`Named object '${key}:${nameKey}' cannot be re-declared without refinement syntax (+)`,
							{ property: key, code: 'DUPLICATE_SINGULAR_PROPERTY' }
						))
					}
				}

				if (arr.length === 1 && (!isNamedContainer || !isRefinement)) {
					val[nameKey] = arr[0]
					if ($strings && $strings[key] && $strings[key][nameKey] && Array.isArray($strings[key][nameKey])) {
						$strings[key][nameKey] = $strings[key][nameKey][0]
					}
					if ($strings && Array.isArray($strings.$s)) {
						for (const sItem of $strings.$s) {
							if (Array.isArray(sItem) && sItem[0] === key && sItem[1] === nameKey && sItem[2] === 0) {
								sItem.pop()
							}
						}
					}
				}

				const children = Array.isArray(val[nameKey]) ? val[nameKey] : [val[nameKey]]
				const childS = $strings?.[key]?.[nameKey]
				for (let idx = 0; idx < children.length; idx++) {
					const child = children[idx]
					const curS = Array.isArray(childS) ? childS[idx] : childS
					typeValidationAndNormalization(child, options, key, curS)
				}
			}
		} else if (Array.isArray(val)) {
			if (isSingular) {
				if (val.length > 1) {
					if (validationOpts.cardinality) {
						if (!obj.errors) obj.errors = []
						obj.errors.push(new LookMLCardinalityError(
							`Property "${key}" is singular but was declared ${val.length} times.`,
							{ property: key, code: 'DUPLICATE_SINGULAR_PROPERTY' }
						))
					}
				}

				if (val.length === 1) {
					obj[key] = val[0]
					if ($strings && $strings[key] && Array.isArray($strings[key])) {
						$strings[key] = $strings[key][0]
					}
					if ($strings && Array.isArray($strings.$s)) {
						for (const sItem of $strings.$s) {
							if (Array.isArray(sItem) && sItem[0] === key && sItem[1] === 0) {
								sItem.pop()
							}
						}
					}
				}
			}

			if (validationOpts.types && schema && schema.type) {
				const checkVal = obj[key]
				if (!isValidType(checkVal, schema.type)) {
					if (!obj.errors) obj.errors = []
					obj.errors.push({
						name: 'LookMLTypeError',
						code: 'INVALID_PROPERTY_TYPE',
						property: key,
						message: `Property "${key}" expects type "${schema.type}", but received ${getActualType(checkVal)}.`
					})
				}
			}

			if (schema && schema.type === 'list') {
				continue
			}

			const children = Array.isArray(obj[key]) ? obj[key] : [obj[key]]
			const childS = $strings?.[key]
			for (let idx = 0; idx < children.length; idx++) {
				const child = children[idx]
				const curS = Array.isArray(childS) ? childS[idx] : childS
				typeValidationAndNormalization(child, options, key, curS)
			}
		}
	}
}

function isValidType(val, expectedType) {
	if (val === undefined || val === null) return true
	if (Array.isArray(val)) {
		return val.every(item => isValidType(item, expectedType))
	}
	switch (expectedType) {
		case 'boolean':
			return typeof val === 'boolean' || val === 'yes' || val === 'no' || val === 'true' || val === 'false'
		case 'number':
			return typeof val === 'number' || (!isNaN(Number(val)) && typeof val === 'string')
		case 'string':
			return typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean'
		case 'list':
			return Array.isArray(val) || typeof val === 'string'
		case 'object':
			return typeof val === 'object'
		case 'array':
			return Array.isArray(val)
		default:
			return true
	}
}

function getActualType(val) {
	if (Array.isArray(val)) return 'array'
	if (val === null) return 'null'
	return typeof val
}

module.exports = {
	transformAst,
	transformDeclaration,
	transformElement,
	groupDeclarations,
	typeValidationAndNormalization
}
