const encodeProperty = require("../common/encode-property")

function transformAst(astNode) {
	if (!astNode) return {}
	if (astNode.type === 'lookml' || astNode.type === 'file') {
		const declarations = (astNode.declarations || []).map(transformDeclaration)
		const { collection, $strings } = groupDeclarations(declarations)
		return { ...collection, $strings }
	}
	return {}
}

function transformDeclaration(declNode) {
	if (!declNode) return null
	if (typeof declNode === 'string') {
		return { isTrivia: true, value: declNode }
	}
	if (declNode.type === 'whitespace' || declNode.type === 'comment') {
		return { isTrivia: true, value: declNode.value }
	}
	if (declNode.type === 'object') {
		const res = transformAst(declNode.value)
		const { $strings: innerStrings, ...innerCollection } = res
		const _1 = (declNode.syntax?._1 || []).map(extractString)
		const _2 = (declNode.syntax?._2 || []).map(extractString)
		const _3 = (declNode.syntax?._3 || []).map(extractString)
		const _4 = (declNode.syntax?._4 || []).map(extractString)
		const _5 = (declNode.syntax?._5 || []).map(extractString)

		const innerTail = (innerStrings && innerStrings.$s?.tail) || (Array.isArray(innerStrings?.$s) ? innerStrings.$s : [])
		if (innerStrings) delete innerStrings.$s

		const $s_decl = {
			...innerStrings,
			$s: {
				head: [declNode.declarationType, ..._1, ":", ..._2, ...(declNode.name ? [declNode.name] : []), ..._3, "{", ..._4].filter(Boolean),
				tail: [...innerTail, ..._5, "}"].filter(Boolean)
			}
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
		const $s_decl = [declNode.declarationType, ..._1, ":", valueStr, ";;"].filter(Boolean)
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
			$s_decl = [declNode.declarationType, ..._1, ":", ..._2, ...elRes.$s_el].filter(Boolean)
		} else if (elRes.$s_el && typeof elRes.$s_el === 'object') {
			$s_decl = {
				...elRes.$s_el,
				$s: {
					head: [declNode.declarationType, ..._1, ":", ..._2, ...(elRes.$s_el.$s?.head || [])].filter(Boolean),
					tail: elRes.$s_el.$s?.tail || []
				}
			}
		} else {
			$s_decl = [declNode.declarationType, ..._1, ":", ..._2].filter(Boolean)
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
			$s: {
				head: ["[", ..._0, ...leading].filter(Boolean),
				tail: [..._last, "]"].filter(Boolean)
			}
		}

		rawItems.forEach(([_1, bodyElNode, _2, trailing, _3], i) => {
			const bodyEl = transformElement(bodyElNode)
			const _1s = (_1 || []).map(extractString)
			const _2s = (_2 || []).map(extractString)
			const _3s = (_3 || []).map(extractString)
			const itemTokens = Array.isArray(bodyEl.$s_el) ? bodyEl.$s_el : [bodyEl.$s_el]
			sObj[i] = [..._1s, ...itemTokens, ..._2s, ...(trailing ? [trailing] : []), ..._3s].filter(Boolean)
		})

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
			$s: {
				head: ["[", ..._0, ...leading].filter(Boolean),
				tail: [..._last, "]"].filter(Boolean)
			}
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
		})

		return {
			$value: value,
			$s_el: sObj
		}
	}

	if (elNode.type === 'double_semi_block') {
		return {
			$value: elNode.value,
			$s_el: [elNode.value, ";;"]
		}
	}

	if (elNode.type === 'string') {
		return {
			$value: elNode.value,
			$s_el: ['"', elNode.value, '"']
		}
	}

	if (elNode.type === 'atom') {
		return {
			$value: elNode.value,
			$s_el: [elNode.raw || elNode.value]
		}
	}

	return { $value: undefined, $s_el: [] }
}

function extractString(t) {
	if (typeof t === 'string') return t
	if (t && typeof t === 'object' && t.value !== undefined) return t.value
	return t
}

function groupDeclarations(declarations) {
	const unnamedTypeCardinality = declarations.reduce((counts, declaration) => {
		if (!declaration || !declaration.$type) { return counts }
		if (declaration.$name) { return counts }
		return {
			...counts,
			[encodeProperty(declaration.$type)]: (counts[encodeProperty(declaration.$type)] || 0) + 1
		}
	}, {})

	const collection = {}
	const stringsTree = { $s: { head: [], tail: [] } }
	let currentTrivia = []

	declarations.forEach(function processDecl(declaration) {
		if (!declaration) return
		if (declaration.isTrivia) {
			currentTrivia.push(declaration.value)
			return
		}
		const { $type, $name, $value, $s_decl } = declaration
		const safeType = $type && encodeProperty($type)
		const safeName = $name && encodeProperty($name)
		if (!safeType) return

		attachLeadingTrivia($s_decl, currentTrivia)
		currentTrivia = []

		let annotatedValue = $value
		if (isObject($value)) {
			annotatedValue = {
				$type,
				$name,
				...$value
			}
		}

		if ($name) { // Named parameter
			collection[safeType] = collection[safeType] || {}
			stringsTree[safeType] = stringsTree[safeType] || {}

			if ($name[0] === '+') { // Refinement
				collection[safeType][safeName] = collection[safeType][safeName] || []
				collection[safeType][safeName].push(annotatedValue)

				stringsTree[safeType][safeName] = stringsTree[safeType][safeName] || []
				stringsTree[safeType][safeName].push($s_decl)
				return
			}

			collection[safeType][safeName] = annotatedValue
			stringsTree[safeType][safeName] = $s_decl
			return
		}

		// Unnamed parameter
		if (unnamedTypeCardinality[safeType] === 1) {
			collection[safeType] = annotatedValue
			stringsTree[safeType] = $s_decl
			return
		}

		collection[safeType] = collection[safeType] || []
		collection[safeType].push(annotatedValue)

		stringsTree[safeType] = stringsTree[safeType] || []
		stringsTree[safeType].push($s_decl)
	})

	if (currentTrivia.length) {
		stringsTree.$s.tail.push(...currentTrivia)
	}

	return { collection, $strings: stringsTree }
}

function attachLeadingTrivia(s_decl, trivia) {
	if (!trivia || !trivia.length) return
	if (Array.isArray(s_decl)) {
		s_decl.unshift(...trivia)
	} else if (s_decl && typeof s_decl === 'object') {
		if (!s_decl.$s) { s_decl.$s = { head: [], tail: [] } }
		if (Array.isArray(s_decl.$s)) { s_decl.$s = { head: s_decl.$s, tail: [] } }
		s_decl.$s.head.unshift(...trivia)
	}
}

function isObject(o) { return o && typeof o == "object" && !o.push }

module.exports = {
	transformAst,
	transformDeclaration,
	transformElement,
	groupDeclarations
}
