module.exports = function generate(project) {
	if (typeof project === 'string') return project
	if (!project) return ''

	if (project.file && typeof project.file === 'object') {
		const out = []
		for (const [filePath, fileObj] of Object.entries(project.file)) {
			out.push(generateFile(fileObj))
		}
		return out.join('')
	}

	if (project.$strings) {
		return generateFile(project)
	}

	return ''
}

function generateFile(fileObj) {
	if (!fileObj) return ''
	const stringsTree = fileObj.$strings
	if (!stringsTree) {
		return ''
	}
	return generateNode(stringsTree, fileObj)
}

function generateNode(stringsNode, dataVal, parentKey) {
	if (dataVal === null || dataVal === undefined) {
		return ''
	}

	if (typeof stringsNode === 'string') {
		return stringsNode
	}

	if (Array.isArray(stringsNode)) {
		const isLeafTokenArray = stringsNode.every(t => typeof t === 'string')
		if (isLeafTokenArray) {
			return formatLeafTokens(stringsNode, dataVal)
		}
		const out = []
		for (let i = 0; i < stringsNode.length; i++) {
			const childStrings = stringsNode[i]
			const childVal = Array.isArray(dataVal) ? dataVal[i] : dataVal
			if (childVal === null || childVal === undefined) continue
			out.push(generateNode(childStrings, childVal, i))
		}
		return out.join('')
	}

	if (typeof stringsNode === 'object') {
		const out = []
		const headTokens = stringsNode.$s?.head || (Array.isArray(stringsNode.$s) ? stringsNode.$s : [])
		const tailTokens = stringsNode.$s?.tail || []

		if (headTokens.length) {
			out.push(headTokens.join(''))
		}

		const visitedKeys = new Set()

		for (const key of Object.keys(stringsNode)) {
			if (key === '$s') continue
			visitedKeys.add(key)
			const childStrings = stringsNode[key]
			const childVal = dataVal && typeof dataVal === 'object' ? (dataVal[key] !== undefined ? dataVal[key] : (key[0] === '$' ? dataVal[key.slice(1)] : undefined)) : undefined

			if (childVal === null || childVal === undefined) {
				// Omit deleted property
				continue
			}

			out.push(generateNode(childStrings, childVal, key))
		}

		// Handle newly added properties in dataVal that were not in stringsNode
		if (dataVal && typeof dataVal === 'object' && !Array.isArray(dataVal)) {
			for (const dataKey of Object.keys(dataVal)) {
				if (dataKey[0] === '$' || visitedKeys.has(dataKey)) continue
				const newVal = dataVal[dataKey]
				if (newVal === null || newVal === undefined) continue
				out.push(formatNewProperty(dataKey, newVal))
			}
		}

		if (tailTokens.length) {
			out.push(tailTokens.join(''))
		}

		return out.join('')
	}

	return ''
}

function formatLeafTokens(tokens, dataVal) {
	if (!tokens || !tokens.length) return ''
	if (typeof dataVal === 'object') {
		return tokens.join('')
	}

	const resultTokens = [...tokens]
	const colonIdx = resultTokens.indexOf(':')
	const startIdx = colonIdx !== -1 ? colonIdx + 1 : 0

	let valIdx = -1
	for (let i = startIdx; i < resultTokens.length; i++) {
		const t = resultTokens[i]
		if (t === ':' || t === '{' || t === '[' || t === ';;' || t === '"') continue
		if (typeof t === 'string' && t.trim().length > 0) {
			valIdx = i
			break
		}
	}

	if (valIdx !== -1) {
		const origToken = resultTokens[valIdx]
		const matchLeading = origToken.match(/^(\s*)/)
		const matchTrailing = origToken.match(/(\s*)$/)
		const leadingSpace = matchLeading ? matchLeading[1] : ""
		const trailingSpace = matchTrailing ? matchTrailing[1] : ""
		const trimmedOrig = origToken.trim()

		const isQuoted = trimmedOrig.startsWith('"') && trimmedOrig.endsWith('"') && trimmedOrig.length >= 2
		const unquotedOrig = isQuoted ? trimmedOrig.slice(1, -1) : trimmedOrig

		let isUnchanged = false
		if (typeof dataVal === 'boolean') {
			const origBool = unquotedOrig === 'yes' || unquotedOrig === 'true'
			if (dataVal === origBool) isUnchanged = true
		} else if (typeof dataVal === 'string' || typeof dataVal === 'number') {
			if (String(dataVal) === unquotedOrig || String(dataVal) === origToken) isUnchanged = true
		}

		if (isUnchanged) {
			return tokens.join('')
		}

		let newValStr
		if (typeof dataVal === 'boolean') {
			newValStr = dataVal ? "yes" : "no"
		} else if (isQuoted) {
			newValStr = `"${dataVal}"`
		} else {
			newValStr = String(dataVal)
		}

		resultTokens[valIdx] = leadingSpace + newValStr + trailingSpace
	}

	return resultTokens.join('')
}

function formatNewProperty(key, val, indent = "\t") {
	if (typeof val === 'boolean') {
		return `${indent}${key}: ${val ? 'yes' : 'no'}\n`
	}
	if (typeof val === 'number') {
		return `${indent}${key}: ${val}\n`
	}
	if (typeof val === 'string') {
		return `${indent}${key}: "${val}"\n`
	}
	if (Array.isArray(val)) {
		return `${indent}${key}: [${val.join(', ')}]\n`
	}
	if (typeof val === 'object') {
		const lines = [`${indent}${key}: {`]
		for (const [k, v] of Object.entries(val)) {
			if (k[0] === '$') continue
			lines.push(formatNewProperty(k, v, indent + "\t").trimEnd())
		}
		lines.push(`${indent}}`)
		return lines.join("\n") + "\n"
	}
	return `${indent}${key}: ${val}\n`
}
