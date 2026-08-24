const BUILTIN_ATOMS = new Set([
	'from', 'view_name', 'type', 'value_format_name', 'primary_key', 'datatype',
	'hidden', 'persist_for', 'extent', 'connection', 'extends', 'group_by',
	'direction', 'sortkeys', 'indexes', 'style', 'relationship', 'alignment'
])

module.exports = function generate(project, options = {}) {
	if (typeof project === 'string') return project
	if (!project) return ''

	if (project.file && typeof project.file === 'object') {
		const out = []
		for (const [filePath, fileObj] of Object.entries(project.file)) {
			out.push(generateFile(fileObj, options))
		}
		return out.join('')
	}

	if (project.$strings) {
		return generateFile(project, options)
	}

	if (typeof project === 'object') {
		const out = []
		for (const [key, val] of Object.entries(project)) {
			if (key[0] === '$' || key === 'info' || key === 'errors') continue
			out.push(formatNewProperty(key, val, '', options))
		}
		return out.join('')
	}

	return ''
}

function generateFile(fileObj, options) {
	if (!fileObj) return ''
	const stringsTree = fileObj.$strings
	if (!stringsTree) {
		const out = []
		for (const [key, val] of Object.entries(fileObj)) {
			if (key[0] === '$' || key === 'info' || key === 'errors') continue
			out.push(formatNewProperty(key, val, '', options))
		}
		return out.join('')
	}
	return generateNode(stringsTree, fileObj, undefined, options)
}

function generateNode(stringsNode, dataVal, parentKey, options = {}) {
	if (dataVal === null || dataVal === undefined) {
		return ''
	}

	if (typeof stringsNode === 'string') {
		return stringsNode
	}

	let resultText = ''

	if (Array.isArray(stringsNode)) {
		return formatLeafTokens(stringsNode, dataVal, parentKey)
	} else if (typeof stringsNode === 'object') {
		const out = []
		const seq = stringsNode.$s || []
		const visitedKeys = new Set()
		const containerIndent = extractContainerIndent(stringsNode)

		if (Array.isArray(seq)) {
			let closingIdx = seq.findIndex(t => t === '}')
			if (closingIdx !== -1 && closingIdx > 0 && typeof seq[closingIdx - 1] === 'string' && /^\s*$/.test(seq[closingIdx - 1])) {
				closingIdx = closingIdx - 1
			}
			if (closingIdx === -1) closingIdx = seq.length

			let i = 0
			while (i < closingIdx) {
				const item = seq[i]
				if (typeof item === 'string') {
					out.push(item)
					i++
					continue
				}

				if (Array.isArray(item)) {
					const [key, nameKeyOrIdx, idx] = item

					if (key === '$type') {
						const typeVal = (dataVal && dataVal.$type) || (parentKey ? String(parentKey).replace(/^\$/, '') : '') || ''
						out.push(typeVal)
						i++
						continue
					}
					if (key === '$name') {
						const nameVal = (dataVal && dataVal.$name) || ''
						out.push(nameVal)
						i++
						continue
					}
					if (key === '$value') {
						let val = dataVal
						const propKey = nameKeyOrIdx
						if (propKey) visitedKeys.add(propKey)
						if (val && typeof val === 'object' && !Array.isArray(val) && propKey && val[propKey] !== undefined) {
							val = val[propKey]
						}
						out.push(val !== undefined ? String(val) : '')
						i++
						continue
					}

					let childStrings
					let childVal

					if (nameKeyOrIdx !== undefined && idx !== undefined) {
						childStrings = stringsNode[key]?.[nameKeyOrIdx]?.[idx]
						childVal = dataVal?.[key]?.[nameKeyOrIdx]?.[idx]
					} else if (nameKeyOrIdx !== undefined) {
						childStrings = stringsNode[key]?.[nameKeyOrIdx]
						childVal = dataVal?.[key]?.[nameKeyOrIdx]
					} else {
						childStrings = stringsNode[key]
						childVal = dataVal?.[key]
					}

					if (childVal === null || childVal === undefined) {
						visitedKeys.add(key)
						i++
						continue
					}

					const condTag = childStrings && childStrings.$conditionalComment
					if (condTag && !options.stripConditionalComments && !options._insideCondBlock) {
						const blockKeys = []
						while (i < closingIdx) {
							const sItem = seq[i]
							if (!Array.isArray(sItem)) break
							const [tK, nK, ix] = sItem
							if (tK === '$type' || tK === '$name' || tK === '$value') break

							let cStr, cVal
							if (nK !== undefined && ix !== undefined) {
								cStr = stringsNode[tK]?.[nK]?.[ix]
								cVal = dataVal?.[tK]?.[nK]?.[ix]
							} else if (nK !== undefined) {
								cStr = stringsNode[tK]?.[nK]
								cVal = dataVal?.[tK]?.[nK]
							} else {
								cStr = stringsNode[tK]
								cVal = dataVal?.[tK]
							}

							if (cVal === null || cVal === undefined) {
								visitedKeys.add(tK)
								i++
								continue
							}

							if (cStr && cStr.$conditionalComment === condTag) {
								visitedKeys.add(tK)
								blockKeys.push({ key: tK, strings: cStr, val: cVal })
								i++
							} else {
								break
							}
						}

						if (blockKeys.length) {
							const currentText = out.join('')
							if (out.length && /[\r\n][ \t]+$/.test(currentText)) {
								const lastIdx = out.length - 1
								out[lastIdx] = out[lastIdx].replace(/([ \t]+)$/, '')
							}
							let condBlockStr = formatConditionalBlock(blockKeys, condTag, stringsNode, options)
							const curText = out.join('')
							if (curText.length > 0 && !curText.endsWith('\n')) {
								condBlockStr = '\n' + condBlockStr
							}
							out.push(condBlockStr)
						}
					} else {
						visitedKeys.add(key)
						let childText = generateNode(childStrings, childVal, key, options)
						if (childText && !options._insideCondBlock) {
							const currentText = out.join('')
							if (currentText.endsWith('\n') && childText.startsWith('\n')) {
								childText = childText.slice(1)
							}
							if (currentText.endsWith('\n') && !/[ \t]$/.test(currentText) && !childText.startsWith(' ') && !childText.startsWith('\t') && !childText.startsWith('\n')) {
								childText = containerIndent + childText
							}
						}
						out.push(childText)
						i++
					}
				}
			}

			// Format any new properties added dynamically to dataVal before closing brace
			if (dataVal && typeof dataVal === 'object' && !Array.isArray(dataVal)) {
				for (const dataKey of Object.keys(dataVal)) {
					if (dataKey[0] === '$' || dataKey === 'info' || dataKey === 'errors' || visitedKeys.has(dataKey)) continue
					const newVal = dataVal[dataKey]
					if (newVal === null || newVal === undefined) continue

					if (out.length && /[\r\n][ \t]+$/.test(out.join(''))) {
						const lastIdx = out.length - 1
						out[lastIdx] = out[lastIdx].replace(/([ \t]+)$/, '')
					}

					let newPropStr = formatNewProperty(dataKey, newVal, containerIndent, options)
					const curText = out.join('')
					if (out.length && !curText.endsWith('\n')) {
						newPropStr = '\n' + newPropStr
					}
					out.push(newPropStr)
				}
			}

			// Output closing brace and remaining tail tokens
			while (i < seq.length) {
				let item = seq[i]
				if (typeof item === 'string') {
					const currentText = out.join('')
					if (currentText.endsWith('\n') && item.startsWith('\n')) {
						item = item.slice(1)
					}
					out.push(item)
				}
				i++
			}
		}

		resultText = out.join('')
	}

	return resultText
}

function extractContainerIndent(stringsNode) {
	const seq = stringsNode.$s
	if (Array.isArray(seq)) {
		for (let i = 0; i < seq.length; i++) {
			const t = seq[i]
			if (typeof t === 'string' && t === '{' && i + 1 < seq.length) {
				const next = seq[i + 1]
				if (typeof next === 'string') {
					const match = next.match(/^[\r\n]+([ \t]+)/)
					if (match && match[1]) return match[1]
				}
			}
			if (typeof t === 'string' && t.includes('{')) {
				const match = t.match(/\{[\r\n]+([ \t]+)/)
				if (match && match[1]) return match[1]
			}
		}
		for (const t of seq) {
			if (typeof t === 'string') {
				const match = t.match(/^[\r\n]+([ \t]+)\S/)
				if (match && match[1]) return match[1]
			}
		}
	}
	for (const key of Object.keys(stringsNode)) {
		if (key === '$s' || key === '$conditionalComment') continue
		const child = stringsNode[key]
		const seqChild = child?.$s || (Array.isArray(child) ? child : [])
		if (Array.isArray(seqChild)) {
			for (let i = 0; i < seqChild.length; i++) {
				const t = seqChild[i]
				if (typeof t === 'string' && t === '{' && i + 1 < seqChild.length) {
					const next = seqChild[i + 1]
					if (typeof next === 'string') {
						const match = next.match(/^[\r\n]+([ \t]+)/)
						if (match && match[1]) return match[1]
					}
				}
				if (typeof t === 'string' && t.includes('{')) {
					const match = t.match(/\{[\r\n]+([ \t]+)/)
					if (match && match[1]) return match[1]
				}
			}
		}
	}
	return "  "
}

function formatConditionalBlock(blockKeys, tag, parentStringsNode, options) {
	const tagClean = tag.endsWith('!') ? tag.slice(0, -1) : tag
	const indent = extractContainerIndent(parentStringsNode)

	if (blockKeys.length === 1 && blockKeys[0].strings && blockKeys[0].strings.$isCompact) {
		const item = blockKeys[0]
		let text = generateNode(item.strings, item.val, item.key, { ...options, _insideCondBlock: true })
		if (text) {
			const lines = text.split(/\r\n|\r|\n/).filter(line => line.trim().length > 0)
			if (lines.length === 1) {
				const lineContent = lines[0].trim()
				return `${indent}# ${tagClean}! ${lineContent}\n`
			}
		}
	}

	const blockLines = []
	blockLines.push(`${indent}# ${tagClean}!`)

	for (const item of blockKeys) {
		let text = generateNode(item.strings, item.val, item.key, { ...options, _insideCondBlock: true })
		if (!text) continue
		const lines = text.split(/\r\n|\r|\n/).filter(line => line.trim().length > 0)
		for (const line of lines) {
			const lineContent = line.trim()
			blockLines.push(`${indent}# ${lineContent}`)
		}
	}

	return blockLines.join('\n') + '\n'
}

function formatLeafTokens(tokens, dataVal, parentKey) {
	if (!tokens || !tokens.length) return ''
	if (typeof dataVal === 'object' && dataVal !== null) {
		return tokens.map(t => {
			if (typeof t === 'string') return t
			if (Array.isArray(t)) {
				if (t[0] === '$type') return parentKey ? String(parentKey).replace(/^\$/, '') : ''
				if (t[0] === '$name') return dataVal.$name || ''
			}
			return ''
		}).join('')
	}

	const isQuoted = tokens.some(t => t === '"')
	const isDoubleSemi = tokens.some(t => t === ';;')

	let valStr = ""
	if (typeof dataVal === 'boolean') {
		valStr = dataVal ? "yes" : "no"
	} else if (isQuoted) {
		valStr = String(dataVal !== undefined ? dataVal : "").replace(/(?<!\\)"/g, '\\"')
	} else if (isDoubleSemi) {
		valStr = String(dataVal !== undefined ? dataVal : "")
	} else {
		valStr = String(dataVal !== undefined ? dataVal : "")
		if (!/^[\w+\-*$.]+$/.test(valStr)) {
			throw new Error(`Cannot mutate unquoted atom value to '${valStr}' because it contains spaces or characters that require quotes. Update $strings metadata to format as a quoted string.`)
		}
	}

	const resultTokens = tokens.map(t => {
		if (typeof t === 'string') return t
		if (Array.isArray(t)) {
			const propKey = t[1] || (parentKey ? String(parentKey).replace(/^\$/, '') : '')
			if (t[0] === '$value') {
				let val = dataVal
				if (Array.isArray(val) && val.length > 0) {
					const foundObj = val.find(o => o && typeof o === 'object' && propKey && o[propKey] !== undefined)
					if (foundObj) val = foundObj
				}
				if (val && typeof val === 'object' && !Array.isArray(val) && propKey && val[propKey] !== undefined) {
					val = val[propKey]
				}
				if (typeof val === 'boolean') return val ? 'yes' : 'no'
				if (isQuoted) return String(val !== undefined ? val : "").replace(/(?<!\\)"/g, '\\"')
				return val !== undefined ? String(val) : ''
			}
			if (t[0] === '$type') return propKey
			if (t[0] === '$name') return dataVal && typeof dataVal === 'object' ? (dataVal.$name || '') : ''
		}
		return t
	})

	return resultTokens.join('')
}

function formatNewProperty(key, val, indent = "", options = {}) {
	const stringsAsQuoted = new Set(options.stringsAsQuoted || [])
	const stringsAsAtoms = new Set(options.stringsAsAtoms || [])
	const stringsAsBlocks = new Set(options.stringsAsBlocks || [])

	let formatType = 'quoted'

	if (stringsAsQuoted.has(key)) {
		formatType = 'quoted'
	} else if (stringsAsAtoms.has(key)) {
		formatType = 'atom'
	} else if (stringsAsBlocks.has(key)) {
		formatType = 'block'
	} else if (/^(sql|html|expr)/i.test(key)) {
		formatType = 'block'
	} else if (BUILTIN_ATOMS.has(key)) {
		formatType = 'atom'
	}

	if (typeof val === 'boolean') {
		return `${indent}${key}: ${val ? 'yes' : 'no'}\n`
	}
	if (typeof val === 'number') {
		return `${indent}${key}: ${val}\n`
	}
	if (typeof val === 'string') {
		if (formatType === 'atom') {
			return `${indent}${key}: ${val}\n`
		}
		if (formatType === 'block') {
			return `${indent}${key}:${val};;\n`
		}
		return `${indent}${key}: "${val}"\n`
	}
	if (Array.isArray(val)) {
		return `${indent}${key}: [${val.join(', ')}]\n`
	}
	if (typeof val === 'object' && val !== null) {
		const keys = Object.keys(val).filter(k => k[0] !== '$')
		const isNamedContainer = keys.length === 1 && typeof val[keys[0]] === 'object' && val[keys[0]] !== null && !Array.isArray(val[keys[0]])
		if (isNamedContainer) {
			const name = keys[0]
			const innerObj = val[name]
			const lines = [`${indent}${key}: ${name} {`]
			for (const [k, v] of Object.entries(innerObj)) {
				if (k[0] === '$') continue
				lines.push(formatNewProperty(k, v, indent ? indent + "  " : "  ", options).trimEnd())
			}
			lines.push(`${indent}}`)
			return lines.join("\n") + "\n"
		}
		const lines = [`${indent}${key}: {`]
		for (const [k, v] of Object.entries(val)) {
			if (k[0] === '$') continue
			lines.push(formatNewProperty(k, v, indent ? indent + "  " : "  ", options).trimEnd())
		}
		lines.push(`${indent}}`)
		return lines.join("\n") + "\n"
	}
	return `${indent}${key}: ${val}\n`
}
