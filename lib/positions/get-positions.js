const encodeProperty = require("../common/encode-property.js")

module.exports = {
	getPositions,
	getPositionsRecurse
}

function getPositions(parsedLookmlFragment) {
	const stringsTree = parsedLookmlFragment?.$strings || parsedLookmlFragment
	return getPositionsRecurse(stringsTree, 0, 0)
}

function getPositionsRecurse(stringsNode, sl = 0, sc = 0, logPath = ["$"], d = 0, trace = {}) {
	let el = sl, ec = sc

	if (!stringsNode) {
		return { $p: [sl, sc, el, ec] }
	}

	if (typeof stringsNode === 'string') {
		;[el, ec] = advancePosition(stringsNode, el, ec)
		return { $p: [sl, sc, el, ec] }
	}

	if (Array.isArray(stringsNode)) {
		const isObjectArray = stringsNode.some(item => item && typeof item === 'object')
		if (!isObjectArray) {
			let declStartLine = sl, declStartCol = sc
			let foundDeclStart = false
			for (const token of stringsNode) {
				if (typeof token === 'string') {
					if (!foundDeclStart && !isTriviaString(token)) {
						foundDeclStart = true
						declStartLine = el
						declStartCol = ec
					}
					;[el, ec] = advancePosition(token, el, ec)
				}
			}
			return { $p: [foundDeclStart ? declStartLine : sl, foundDeclStart ? declStartCol : sc, el, ec] }
		}

		const childrenArr = []
		let arrStartLine = sl, arrStartCol = sc
		let foundArrStart = false
		for (let i = 0; i < stringsNode.length; i++) {
			const itemNode = stringsNode[i]
			const itemPos = getPositionsRecurse(itemNode, el, ec, [...logPath, `${i}`], d + 1, trace)
			childrenArr.push(itemPos)
			if (itemPos.$p) {
				if (!foundArrStart) {
					foundArrStart = true
					arrStartLine = itemPos.$p[0]
					arrStartCol = itemPos.$p[1]
				}
				;[,, el, ec] = itemPos.$p
			}
		}
		childrenArr.$p = [foundArrStart ? arrStartLine : sl, foundArrStart ? arrStartCol : sc, el, ec]
		return childrenArr
	}

	const children = {}
	const headTokens = stringsNode.$s?.head || (Array.isArray(stringsNode.$s) ? stringsNode.$s : [])
	const tailTokens = stringsNode.$s?.tail || []

	let declStartLine = sl, declStartCol = sc
	let foundDeclStart = false

	for (const token of headTokens) {
		if (typeof token === 'string') {
			if (!foundDeclStart && !isTriviaString(token)) {
				foundDeclStart = true
				declStartLine = el
				declStartCol = ec
			}
			;[el, ec] = advancePosition(token, el, ec)
		}
	}

	for (const key of Object.keys(stringsNode)) {
		if (key === '$s') continue
		const childNode = stringsNode[key]
		const childPos = getPositionsRecurse(childNode, el, ec, [...logPath, key], d + 1, trace)
		children[encodeProperty(key)] = childPos
		if (childPos.$p) {
			;[,, el, ec] = childPos.$p
		} else if (Array.isArray(childPos) && childPos.$p) {
			;[,, el, ec] = childPos.$p
		}
	}

	for (const token of tailTokens) {
		if (typeof token === 'string') {
			;[el, ec] = advancePosition(token, el, ec)
		}
	}

	return {
		...children,
		$p: [foundDeclStart ? declStartLine : sl, foundDeclStart ? declStartCol : sc, el, ec]
	}
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
