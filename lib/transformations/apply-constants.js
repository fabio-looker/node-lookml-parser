const isMetaKey = require('../common/is-meta-key.js')
const decodeProperty = require('../common/decode-property.js')

const CONSTANT_REF_REGEX = /@\{(?:\/\/([^/]+)\/)?([a-zA-Z0-9_]+)\}/g
const UNQUALIFIED_CONSTANT_REF_REGEX = /@\{([a-zA-Z0-9_]+)\}/g

module.exports = transformations_applyConstants

/**
 * Resolves and interpolates LookML constant references (`@{const_name}` and `@{//project/const_name}`)
 * across assembled models in `project.model` using `project.manifest` and any imported project manifests.
 *
 * @param {object} project The parsed LookML project object
 * @returns {object} The mutated project object
 */
function transformations_applyConstants(project) {
	if (!project || !project.model || typeof project.model !== 'object') {
		return project
	}

	const { rootConstants, importedConstants } = buildConstantMaps(project)

	function interpolateString(str) {
		if (typeof str !== 'string' || !str.includes('@{')) return str
		return str.replace(CONSTANT_REF_REGEX, (match, projName, constName) => {
			if (projName) {
				const projMap = importedConstants.get(projName)
				if (projMap && Object.prototype.hasOwnProperty.call(projMap, constName)) {
					return projMap[constName]
				}
				return match
			}
			if (Object.prototype.hasOwnProperty.call(rootConstants, constName)) {
				return rootConstants[constName]
			}
			return match
		})
	}

	function interpolateNode(node) {
		if (typeof node === 'string') {
			return interpolateString(node)
		}
		if (!node || typeof node !== 'object') {
			return node
		}
		if (Array.isArray(node)) {
			for (let i = 0; i < node.length; i++) {
				node[i] = interpolateNode(node[i])
			}
			return node
		}

		for (const key of Object.keys(node)) {
			if (isMetaKey(key) || key === 'include') continue
			node[key] = interpolateNode(node[key])
		}
		return node
	}

	for (const modelKey of Object.keys(project.model)) {
		interpolateNode(project.model[modelKey])
	}

	return project
}

function buildConstantMaps(project) {
	const rootManifest = project.manifest || findRootManifest(project)
	const importedManifests = findImportedManifests(project)

	const rootExtracted = extractManifestData(rootManifest)
	const rootConstants = resolveSelfConstants(rootExtracted.constants)

	const resolvedRootOverrides = new Map()
	for (const [targetProj, overrides] of rootExtracted.overrides.entries()) {
		const resolved = {}
		for (const [k, v] of Object.entries(overrides)) {
			resolved[k] = resolveAgainstMap(v, rootConstants)
		}
		resolvedRootOverrides.set(targetProj, resolved)
	}

	const importedExtracted = new Map()
	const allImportedProjNames = new Set([
		...importedManifests.keys(),
		...resolvedRootOverrides.keys()
	])

	for (const [projName, manifestObj] of importedManifests.entries()) {
		const extracted = extractManifestData(manifestObj)
		importedExtracted.set(projName, extracted)
		for (const subProj of extracted.overrides.keys()) {
			allImportedProjNames.add(subProj)
		}
	}

	const importedConstants = new Map()
	for (const projName of allImportedProjNames) {
		const baseConstants = { ...(importedExtracted.get(projName)?.constants || {}) }
		importedConstants.set(projName, resolveSelfConstants(baseConstants))
	}

	// Apply overrides from intermediate imported projects, then from root
	for (const [parentProj, extracted] of importedExtracted.entries()) {
		const parentConsts = importedConstants.get(parentProj) || {}
		for (const [targetProj, overrides] of extracted.overrides.entries()) {
			const targetMap = { ...(importedConstants.get(targetProj) || {}) }
			for (const [k, v] of Object.entries(overrides)) {
				targetMap[k] = resolveAgainstMap(v, parentConsts)
			}
			importedConstants.set(targetProj, resolveSelfConstants(targetMap))
		}
	}

	for (const [targetProj, overrides] of resolvedRootOverrides.entries()) {
		const targetMap = { ...(importedConstants.get(targetProj) || {}) }
		for (const [k, v] of Object.entries(overrides)) {
			targetMap[k] = v
		}
		importedConstants.set(targetProj, resolveSelfConstants(targetMap))
	}

	return { rootConstants, importedConstants }
}

function findRootManifest(project) {
	const files = getProjectFileList(project)
	return files.find(f => f && /^(\.\/)?\.?manifest\.lkml$/i.test(f.$file_path || ''))
}

function findImportedManifests(project) {
	const map = new Map()
	const files = getProjectFileList(project)
	for (const f of files) {
		if (!f || typeof f !== 'object') continue
		const match = (f.$file_path || '').match(/^(\.\/)?imported_projects\/([^/]+)\/\.?manifest\.lkml$/i)
		if (match) {
			map.set(match[2], f)
		}
	}
	if (project.file && typeof project.file === 'object') {
		for (const [key, f] of Object.entries(project.file)) {
			if (!f || typeof f !== 'object') continue
			const keyMatch = key.match(/^(\.\/)?imported_projects\/([^/]+)\/\.?manifest$/i)
			if (keyMatch && !map.has(keyMatch[2])) {
				map.set(keyMatch[2], f)
			}
		}
	}
	return map
}

function getProjectFileList(project) {
	if (Array.isArray(project.files)) return project.files
	if (project.file && typeof project.file === 'object') {
		return Object.values(project.file)
	}
	return []
}

function extractManifestData(manifest) {
	const constants = {}
	const overrides = new Map()
	if (!manifest || typeof manifest !== 'object') {
		return { constants, overrides }
	}

	if (manifest.constant && typeof manifest.constant === 'object') {
		for (const [constName, constObj] of Object.entries(manifest.constant)) {
			if (isMetaKey(constName)) continue
			const entry = Array.isArray(constObj) ? constObj[0] : constObj
			if (entry && entry.value !== undefined && entry.value !== null) {
				constants[decodeProperty(constName)] = String(entry.value)
			}
		}
	}

	collectDependencyOverrides(manifest.local_dependency, overrides)
	collectDependencyOverrides(manifest.remote_dependency, overrides)

	return { constants, overrides }
}

function collectDependencyOverrides(depContainer, overridesMap) {
	if (!depContainer || typeof depContainer !== 'object') return

	const depEntries = []
	if (Array.isArray(depContainer)) {
		for (const item of depContainer) {
			if (item && typeof item === 'object') {
				depEntries.push([item.project || item.$name, item])
			}
		}
	} else if (
		depContainer.$type === 'local_dependency' ||
		depContainer.$type === 'remote_dependency' ||
		typeof depContainer.project === 'string' ||
		typeof depContainer.url === 'string' ||
		depContainer.override_constant !== undefined
	) {
		depEntries.push([depContainer.project || depContainer.$name, depContainer])
	} else {
		for (const [depKey, depVal] of Object.entries(depContainer)) {
			if (isMetaKey(depKey)) continue
			const items = Array.isArray(depVal) ? depVal : [depVal]
			for (const item of items) {
				if (item && typeof item === 'object') {
					depEntries.push([item.project || item.$name || decodeProperty(depKey), item])
				}
			}
		}
	}

	for (const [targetProj, depObj] of depEntries) {
		if (!targetProj || !depObj.override_constant || typeof depObj.override_constant !== 'object') continue
		if (!overridesMap.has(targetProj)) {
			overridesMap.set(targetProj, {})
		}
		const projOverrides = overridesMap.get(targetProj)
		for (const [constName, ocVal] of Object.entries(depObj.override_constant)) {
			if (isMetaKey(constName)) continue
			const oc = Array.isArray(ocVal) ? ocVal[0] : ocVal
			if (oc && oc.value !== undefined && oc.value !== null) {
				projOverrides[decodeProperty(constName)] = String(oc.value)
			}
		}
	}
}

function resolveSelfConstants(constMap) {
	const resolved = { ...constMap }
	const maxPasses = 10
	for (let pass = 0; pass < maxPasses; pass++) {
		let changed = false
		for (const [k, val] of Object.entries(resolved)) {
			if (typeof val !== 'string' || !val.includes('@{')) continue
			const nextVal = val.replace(UNQUALIFIED_CONSTANT_REF_REGEX, (match, refName) => {
				if (refName === k) return match
				if (Object.prototype.hasOwnProperty.call(resolved, refName)) {
					return resolved[refName]
				}
				return match
			})
			if (nextVal !== val) {
				resolved[k] = nextVal
				changed = true
			}
		}
		if (!changed) break
	}
	return resolved
}

function resolveAgainstMap(str, constMap) {
	if (typeof str !== 'string' || !str.includes('@{')) return str
	return str.replace(UNQUALIFIED_CONSTANT_REF_REGEX, (match, refName) => {
		if (Object.prototype.hasOwnProperty.call(constMap, refName)) {
			return constMap[refName]
		}
		return match
	})
}
