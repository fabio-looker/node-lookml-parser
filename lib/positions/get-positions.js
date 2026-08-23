const encodeProperty = require("../common/encode-property.js")

module.exports = {
	getPositions,
	getPositionsRecurse
}

function getPositions(parsedLookmlFragment) {
	const stringsTree = parsedLookmlFragment?.$strings || parsedLookmlFragment
	return getPositionsRecurse(stringsTree, 0, 0, ["$"], 0, {}, parsedLookmlFragment)
}

function getPositionsRecurse(stringsNode, sl = 0, sc = 0, logPath = ["$"], d = 0, trace = {}, dataNode = undefined, parentKey = "") {
	let el = sl, ec = sc

	if (!stringsNode) {
		return { $p: [sl, sc, el, ec] }
	}

	if (typeof stringsNode === 'string') {
		const str = resolveToken(stringsNode, dataNode, parentKey)
		;[el, ec] = advancePosition(str, el, ec)
		return { $p: [sl, sc, el, ec] }
	}

	if (Array.isArray(stringsNode)) {
		let declStartLine = sl, declStartCol = sc
		let foundDeclStart = false
		for (const token of stringsNode) {
			const str = resolveToken(token, dataNode, parentKey)
			if (!foundDeclStart && !isTriviaString(str)) {
				foundDeclStart = true
				declStartLine = el
				declStartCol = ec
			}
			;[el, ec] = advancePosition(str, el, ec)
		}
		return { $p: [foundDeclStart ? declStartLine : sl, foundDeclStart ? declStartCol : sc, el, ec] }
	}

	const children = {}
	const seq = stringsNode.$s || []

	let declStartLine = sl, declStartCol = sc
	let foundDeclStart = false

	if (Array.isArray(seq)) {
		for (const item of seq) {
			if (typeof item === 'string') {
				const str = resolveToken(item, dataNode, parentKey)
				if (!foundDeclStart && !isTriviaString(str)) {
					foundDeclStart = true
					declStartLine = el
					declStartCol = ec
				}
				;[el, ec] = advancePosition(str, el, ec)
			} else if (Array.isArray(item)) {
				const [key, nameKeyOrIdx, idx] = item

				if (key === '$type' || key === '$name' || key === '$value') {
					const str = resolveToken(item, dataNode, parentKey)
					if (!foundDeclStart && !isTriviaString(str)) {
						foundDeclStart = true
						declStartLine = el
						declStartCol = ec
					}
					;[el, ec] = advancePosition(str, el, ec)
					continue
				}

				let childNode
				let childData

				if (nameKeyOrIdx !== undefined && idx !== undefined) {
					childNode = stringsNode[key]?.[nameKeyOrIdx]?.[idx]
					childData = dataNode?.[key]?.[nameKeyOrIdx]?.[idx]
				} else if (nameKeyOrIdx !== undefined) {
					childNode = stringsNode[key]?.[nameKeyOrIdx]
					childData = dataNode?.[key]?.[nameKeyOrIdx]
				} else {
					childNode = stringsNode[key]
					childData = dataNode?.[key]
				}

				if (childNode) {
					const encodedKey = encodeProperty(key)
					const childPos = getPositionsRecurse(childNode, el, ec, [...logPath, key], d + 1, trace, childData, key)

					if (nameKeyOrIdx !== undefined && idx !== undefined) {
						if (!children[encodedKey]) children[encodedKey] = {}
						if (!children[encodedKey][nameKeyOrIdx]) children[encodedKey][nameKeyOrIdx] = []
						children[encodedKey][nameKeyOrIdx][idx] = childPos
					} else if (nameKeyOrIdx !== undefined) {
						if (typeof nameKeyOrIdx === 'number') {
							if (!children[encodedKey]) children[encodedKey] = []
							children[encodedKey][nameKeyOrIdx] = childPos
						} else {
							if (!children[encodedKey]) children[encodedKey] = {}
							children[encodedKey][nameKeyOrIdx] = childPos
						}
					} else {
						children[encodedKey] = childPos
					}

					if (childPos.$p) {
						;[,, el, ec] = childPos.$p
					}
				}
			}
		}
	}

	return {
		...children,
		$p: [foundDeclStart ? declStartLine : sl, foundDeclStart ? declStartCol : sc, el, ec]
	}
}

function resolveToken(token, dataNode, parentKey) {
	if (typeof token === 'string') return token
	if (Array.isArray(token)) {
		const key = token[0]
		if (key === '$type') {
			return (dataNode && dataNode.$type) || (parentKey ? String(parentKey).replace(/^\$/, '') : '') || ''
		}
		if (key === '$name') {
			return (dataNode && dataNode.$name) || ''
		}
		if (key === '$value') {
			if (typeof dataNode === 'boolean') return dataNode ? 'yes' : 'no'
			return String(dataNode !== undefined && dataNode !== null ? dataNode : '')
		}
	}
	return ''
}

function isTriviaString(str) {
	return /^\s*$/.test(str) || str.startsWith("#")
}

function advancePosition(str, line, col) {
	if (!str) return [line, col]
	const lines = str.split(/\r\n|\r|\n/)
	const lastLine = lines[lines.length - 1]
	const nextLine = line + lines.length - 1
	const nextCol = (lines.length > 1 ? 0 : col) + lastLine.length
	return [nextLine, nextCol]
}
