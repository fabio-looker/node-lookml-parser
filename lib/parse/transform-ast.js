const encodeProperty = require("../common/encode-property")

function transformAst(astNode) {
	if (!astNode) return {}
	if (astNode.type === 'lookml' || astNode.type === 'file') {
		const declarations = (astNode.declarations || []).map(transformDeclaration)
		return groupDeclarations(declarations)
	}
	return {}
}

function transformDeclaration(declNode) {
	if (!declNode) return null
	if (typeof declNode === 'string') {
		return declNode
	}
	if (declNode.type === 'whitespace' || declNode.type === 'comment') {
		return declNode.value
	}
	if (declNode.type === 'object') {
		const el = transformAst(declNode.value)
		const { $strings, ...innerValue } = el
		const _1 = (declNode.syntax?._1 || []).map(extractString)
		const _2 = (declNode.syntax?._2 || []).map(extractString)
		const _3 = (declNode.syntax?._3 || []).map(extractString)
		const _4 = (declNode.syntax?._4 || []).map(extractString)
		const _5 = (declNode.syntax?._5 || []).map(extractString)

		return {
			$type: declNode.declarationType,
			...(declNode.name ? { $name: declNode.name } : {}),
			$value: innerValue,
			$strings: ["@$type", ..._1, ":", ..._2, (declNode.name ? "@$name" : ""), ..._3, "{", ..._4, ...($strings || []), ..._5, "}"].filter(Boolean)
		}
	}
	if (declNode.type === 'block') {
		const el = transformElement(declNode.value)
		const _1 = (declNode.syntax?._1 || []).map(extractString)
		return {
			$type: declNode.declarationType,
			$value: el.$value,
			$strings: [declNode.declarationType, ..._1, ":", ...el.$strings].filter(Boolean)
		}
	}
	if (declNode.type === 'generic') {
		const el = transformElement(declNode.value)
		const _1 = (declNode.syntax?._1 || []).map(extractString)
		const _2 = (declNode.syntax?._2 || []).map(extractString)
		return {
			$type: declNode.declarationType,
			$value: el.$value,
			$strings: [declNode.declarationType, ..._1, ":", ..._2, ...el.$strings].filter(Boolean)
		}
	}
	return null
}

function transformElement(elNode) {
	if (!elNode) return { $value: undefined, $strings: [] }

	if (elNode.type === 'empty_list') {
		const _ = (elNode.syntax?._ || []).map(extractString)
		return {
			$value: [],
			$strings: ["[", ..._, "]"].filter(Boolean)
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

		const itemStrings = rawItems.map(([_1, bodyElNode, _2, trailing, _3], i) => {
			const bodyEl = transformElement(bodyElNode)
			const _1s = (_1 || []).map(extractString)
			const _2s = (_2 || []).map(extractString)
			const _3s = (_3 || []).map(extractString)
			return [`${i}`, ..._1s, ...bodyEl.$strings, ..._2s, trailing, ..._3s].filter(Boolean)
		})

		return {
			$value: value,
			$strings: [
				"[",
				..._0,
				...leading,
				...itemStrings.flat(),
				..._last,
				"]"
			].filter(Boolean)
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

		const entryStrings = rawEntries.map(([_1, key, _2, colon, _3, bodyElNode, _4, comma, _5]) => {
			const bodyEl = transformElement(bodyElNode)
			const _1s = (_1 || []).map(extractString)
			const _2s = (_2 || []).map(extractString)
			const _3s = (_3 || []).map(extractString)
			const _4s = (_4 || []).map(extractString)
			const _5s = (_5 || []).map(extractString)
			return [`${key}`, ..._1s, key, ..._2s, colon, ..._3s, ...bodyEl.$strings, ..._4s, comma, ..._5s].filter(Boolean)
		})

		return {
			$value: value,
			$strings: [
				"[",
				..._0,
				...leading,
				...entryStrings.flat(),
				..._last,
				"]"
			].filter(Boolean)
		}
	}

	if (elNode.type === 'double_semi_block') {
		return {
			$value: elNode.value,
			$strings: ["@", ";;"]
		}
	}

	if (elNode.type === 'string') {
		return {
			$value: elNode.value,
			$strings: ['"', "@", '"']
		}
	}

	if (elNode.type === 'atom') {
		return {
			$value: elNode.value,
			$strings: ["@"]
		}
	}

	return { $value: undefined, $strings: [] }
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

	const $strings = []
	const unnamedTypeCount = new Map()
	const refinementCount = new Map()

	declarations.forEach(function addDeclarationStringsToStrings(p) {
		try {
			if (!p || !Array.isArray(p.$strings)) {
				// Not a declaration (or element), i.e. whitespace & comments
				if (p !== null && p !== undefined) {
					$strings.push(p)
				}
				return
			}

			// Value is its own collection, it will have strings within it and we just want to reference it
			if (isObject(p.$value)) {
				if (p.$name) { // Named parameter, e.g. a view or dimension
					if (p.$name[0] === '+') { // Refinement
						const count = (refinementCount.get(p.$type + ":" + p.$name) || 0) + 1
						refinementCount.set(p.$type + ":" + p.$name, count)
						$strings.push(`@${p.$type}.${p.$name}.${count - 1}`)
						return
					}
					else {
						$strings.push(`@${p.$type}.${p.$name}`)
						return
					}
				}
				// Cardinality 1
				if (unnamedTypeCardinality[encodeProperty(p.$type)] === 1) {
					$strings.push(`@${p.$type}`)
					return
				}
				// Cardinality 2+
				else {
					const count = (unnamedTypeCount.get(p.$type) || 0) + 1
					unnamedTypeCount.set(p.$type, count)
					$strings.push(`@${p.$type}.${count - 1}`)
					return
				}
			}
			if (Array.isArray(p.$value)) {
				if (unnamedTypeCardinality[encodeProperty(p.$type)] > 1) {
					// Not allowed in LookML AFAIK, and not representable by our AST
				}
			}
			// Primitive parameter, group strings into a sub-array for atomic handling
			{
				// Cardinality 1 / Primitive
				if (unnamedTypeCardinality[encodeProperty(p.$type)] === 1) {
					$strings.push([`${p.$type}`, ...p.$strings])
					return
				}
				// Cardinality 2+
				else {
					const count = (unnamedTypeCount.get(p.$type) || 0) + 1
					unnamedTypeCount.set(p.$type, count)
					$strings.push([`${p.$type}.${count - 1}`, ...p.$strings])
					return
				}
			}
		} catch (exception) { console.error({ declarations, p, $strings, exception }) }
	})

	const collection = {}
	declarations.forEach(function addParamValueToCollection(param) {
		try {
			if (!param || typeof param !== 'object') return
			const { $strings, $type, $name, $value } = param
			const safeType = $type && encodeProperty($type)
			const safeName = $name && encodeProperty($name)
			if (!$type) {
				return
			}
			let annotatedValue = $value
			if (isObject($value)) {
				annotatedValue = {
					$strings,
					$type,
					$name,
					...$value
				}
			}
			if ($name) { // Named Parameter, use an object/hashmap
				collection[safeType] = collection[safeType] || {}
				if ($name[0] === '+') { // Refinement
					collection[safeType][safeName] = collection[safeType][safeName] || []
					collection[safeType][safeName].push(annotatedValue)
					return
				}
				// Non-refinement
				collection[safeType][safeName] = annotatedValue
				return
			}
			// Unnamed parameter, use a single value or array of values
			if (unnamedTypeCardinality[safeType] == 1) {
				collection[safeType] = annotatedValue
				return
			}
			collection[safeType] = collection[safeType] || []
			collection[safeType].push(annotatedValue)

		}
		catch (exception) { console.error({ declarations, param, collection, exception }) }
	})
	return { ...collection, $strings }
}

function isObject(o) { return o && typeof o == "object" && !o.push }

module.exports = {
	transformAst,
	transformDeclaration,
	transformElement,
	groupDeclarations
}
