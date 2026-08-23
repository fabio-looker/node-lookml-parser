const encodeProperty = require("../common/encode-property")
const pegParser = require("./parser.generated.js")

function escapeRegExp(str) {
	return str.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
}

function transformAst(astNode, options = {}) {
	if (!astNode) return {}
	if (astNode.type === 'lookml' || astNode.type === 'file') {
		const extraDecls = options._extraDecls || []
		const opts = { ...options }
		delete opts._extraDecls
		const declarations = [
			...extraDecls,
			...(astNode.declarations || []).map(decl => transformDeclaration(decl, opts))
		]
		const { collection, $strings } = groupDeclarations(declarations, opts)
		return { ...collection, $strings }
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

		let _4Raw = (declNode.syntax?._4 || []).map(extractString)
		let _5Raw = (declNode.syntax?._5 || []).map(extractString)

		let extraInnerDecls = []

		if (conditionalCommentString) {
			const res4 = extractConditionalCommentSubItems(_4Raw, conditionalCommentString)
			_4Raw = res4.remainingTrivia
			extraInnerDecls.push(...res4.subItems)

			const res5 = extractConditionalCommentSubItems(_5Raw, conditionalCommentString)
			_5Raw = res5.remainingTrivia
			extraInnerDecls.push(...res5.subItems)
		}

		const res = transformAst(declNode.value, { ...options, _extraDecls: extraInnerDecls })
		const { $strings: innerStrings, ...innerCollection } = res

		if (innerCollection && typeof innerCollection === 'object') {
			try {
				Object.defineProperty(innerCollection, '$type', { value: declNode.declarationType, enumerable: true, writable: true, configurable: true })
				if (declNode.name) {
					Object.defineProperty(innerCollection, '$name', { value: declNode.name, enumerable: true, writable: true, configurable: true })
				}
			} catch (e) {}
		}

		const _1 = (declNode.syntax?._1 || []).map(extractString)
		const _2 = (declNode.syntax?._2 || []).map(extractString)
		const _3 = (declNode.syntax?._3 || []).map(extractString)
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

function groupDeclarations(declarations, options = {}) {
	const collection = {}
	const $strings = {}
	let leadingTrivia = []

	const declsToProcess = []
	for (const item of declarations) {
		if (!item) continue
		if (item.isTrivia) {
			leadingTrivia.push(item.value)
		} else {
			if (options.conditionalCommentString && leadingTrivia.length) {
				const res = extractConditionalCommentSubItems(leadingTrivia, options.conditionalCommentString)
				leadingTrivia = res.remainingTrivia
				declsToProcess.push(...res.subItems)
			}
			attachLeadingTrivia(item.$s_decl, leadingTrivia)
			leadingTrivia = []
			declsToProcess.push(item)
		}
	}

	if (options.conditionalCommentString && leadingTrivia.length) {
		const res = extractConditionalCommentSubItems(leadingTrivia, options.conditionalCommentString)
		leadingTrivia = res.remainingTrivia
		declsToProcess.push(...res.subItems)
	}

	const unnamedTypeCardinality = {}
	const namedTypeCardinality = {}
	for (const decl of declsToProcess) {
		const typeKey = encodeProperty(decl.$type)
		if (decl.$name) {
			const nameKey = encodeProperty(decl.$name)
			if (!namedTypeCardinality[typeKey]) namedTypeCardinality[typeKey] = {}
			namedTypeCardinality[typeKey][nameKey] = (namedTypeCardinality[typeKey][nameKey] || 0) + 1
		} else {
			unnamedTypeCardinality[typeKey] = (unnamedTypeCardinality[typeKey] || 0) + 1
		}
	}

	const $s = []

	for (const decl of declsToProcess) {
		const typeKey = encodeProperty(decl.$type)

		if (decl.$name) {
			const nameKey = encodeProperty(decl.$name)
			if (!collection[typeKey]) {
				collection[typeKey] = {}
				$strings[typeKey] = {}
			}
			if (namedTypeCardinality[typeKey][nameKey] > 1 || nameKey[0] === '+') {
				if (!collection[typeKey][nameKey]) {
					collection[typeKey][nameKey] = []
					$strings[typeKey][nameKey] = []
				}
				const idx = collection[typeKey][nameKey].length
				collection[typeKey][nameKey].push(decl.$value)
				$strings[typeKey][nameKey].push(decl.$s_decl)
				$s.push([typeKey, nameKey, idx])
			} else {
				collection[typeKey][nameKey] = decl.$value
				$strings[typeKey][nameKey] = decl.$s_decl
				$s.push([typeKey, nameKey])
			}
			decorateConditionalComment(decl.$s_decl, decl.$conditionalComment)
		} else if (unnamedTypeCardinality[typeKey] > 1) {
			if (!collection[typeKey]) {
				collection[typeKey] = []
				$strings[typeKey] = []
			}
			const idx = collection[typeKey].length
			collection[typeKey].push(decl.$value)
			$strings[typeKey].push(decl.$s_decl)
			$s.push([typeKey, idx])
			decorateConditionalComment(decl.$s_decl, decl.$conditionalComment)
		} else {
			collection[typeKey] = decl.$value
			$strings[typeKey] = decl.$s_decl
			$s.push([typeKey])
			decorateConditionalComment(decl.$s_decl, decl.$conditionalComment)
		}
	}

	if (leadingTrivia.length) {
		$s.push(...leadingTrivia)
	}

	$strings.$s = $s

	return { collection, $strings }
}

function extractString(node) {
	if (!node) return ""
	if (typeof node === 'string') return node
	if (node.value) return extractString(node.value)
	return ""
}

function extractConditionalCommentSubItems(triviaArray, tag) {
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
					const res = transformAst(ast)
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
		} else if (Array.isArray(last)) {
			sDecl.push('\n')
		}
	} else if (typeof sDecl === 'object') {
		const tail = sDecl.$s
		if (Array.isArray(tail) && tail.length) {
			const last = tail[tail.length - 1]
			if (typeof last === 'string' && !last.endsWith('\n')) {
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

module.exports = {
	transformAst,
	transformDeclaration,
	transformElement,
	groupDeclarations
}
