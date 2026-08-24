const { getSchemaProperty, LOOKML_SCHEMA } = require('../schema/lookml-schema.js')
const LookMLCardinalityError = require('../common/cardinality-error.js')

function validateLookML(parsedObj, options = {}) {
	const validationOptions = {
		cardinality: true,
		types: true,
		required: true,
		...(options.validation || {})
	}

	const errors = []

	traverse(parsedObj, '')

	return errors

	function traverse(node, currentScope) {
		if (!node || typeof node !== 'object') return

		if (Array.isArray(node)) {
			for (const item of node) {
				traverse(item, currentScope)
			}
			return
		}

		const scope = node.$type || currentScope

		// 1. Check required properties if node has a known scope
		if (validationOptions.required && scope && LOOKML_SCHEMA[scope]) {
			for (const [propKey, propSchema] of Object.entries(LOOKML_SCHEMA[scope])) {
				if (propSchema.required && (node[propKey] === undefined || node[propKey] === null)) {
					errors.push({
						name: 'LookMLRequiredPropertyError',
						code: 'MISSING_REQUIRED_PROPERTY',
						property: propKey,
						message: `Required property "${propKey}" is missing in ${scope}.`
					})
				}
			}
		}

		// Check named object redeclarations without refinement
		if (validationOptions.cardinality && typeof node === 'object' && !Array.isArray(node)) {
			const namedContainerTypes = new Set(['dimension', 'measure', 'filter', 'parameter', 'dimension_group', 'explore', 'view', 'join', 'datagroup', 'access_grant', 'action', 'derived_table', 'map_layer', 'named_value_format'])
			for (const typeKey of Object.keys(node)) {
				if (typeKey.startsWith('$') || !namedContainerTypes.has(typeKey)) continue
				const child = node[typeKey]
				if (child && typeof child === 'object' && !Array.isArray(child)) {
					for (const nameKey of Object.keys(child)) {
						if (nameKey.startsWith('$') || nameKey.startsWith('+')) continue
						const instances = child[nameKey]
						if (Array.isArray(instances) && instances.length > 1) {
							errors.push(new LookMLCardinalityError(
								`Named object '${typeKey}:${nameKey}' cannot be re-declared without refinement syntax (+)`,
								{ property: typeKey, code: 'DUPLICATE_SINGULAR_PROPERTY' }
							))
						}
					}
				}
			}
		}

		for (const key of Object.keys(node)) {
			if (key.startsWith('$')) continue

			const val = node[key]
			const schema = getSchemaProperty(scope, key)
			const isSingular = schema && schema.cardinality === 'singular'

			// 2. Cardinality validation
			if (validationOptions.cardinality && isSingular && Array.isArray(val) && val.length > 1) {
				errors.push(new LookMLCardinalityError(
					`Property "${key}" is singular but was declared ${val.length} times.`,
					{ property: key, code: 'DUPLICATE_SINGULAR_PROPERTY' }
				))
			}

			// 3. Type validation
			if (validationOptions.types && schema && schema.type) {
				const targetVal = isSingular && Array.isArray(val) && val.length === 1 ? val[0] : val
				if (!isValidType(targetVal, schema.type)) {
					errors.push({
						name: 'LookMLTypeError',
						code: 'INVALID_PROPERTY_TYPE',
						property: key,
						message: `Property "${key}" expects type "${schema.type}", but received ${getActualType(targetVal)}.`
					})
				}
			}

			// Recurse into children
			if (typeof val === 'object' && val !== null) {
				traverse(val, scope)
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

module.exports = validateLookML
