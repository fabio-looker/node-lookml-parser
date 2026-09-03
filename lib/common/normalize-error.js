function normalizeError(err, fileObj = {}) {
	if (!err) return err

	const filePath = err.filePath || fileObj.$file_path || fileObj.path || undefined
	const line = err.line !== undefined ? err.line : (err.location?.start?.line)
	const column = err.column !== undefined ? err.column : (err.location?.start?.column)
	const property = err.property || undefined
	const code = err.code || (
		err.name === 'SyntaxError' || err.name === 'LookMLSyntaxError' ? 'SYNTAX_ERROR' :
		err.name === 'LookMLCardinalityError' ? 'DUPLICATE_SINGULAR_PROPERTY' :
		err.name === 'LookMLTypeError' ? 'INVALID_PROPERTY_TYPE' :
		err.name === 'LookMLRequiredPropertyError' ? 'MISSING_REQUIRED_PROPERTY' :
		'PARSE_ERROR'
	)
	const context = err.context || undefined
	const exception = err.exception || (err instanceof Error ? err : undefined)

	let rawMessage = err.message || (typeof err.toString === 'function' ? err.toString() : String(err))

	let message = rawMessage
	if (filePath && !message.includes(filePath)) {
		const locStr = line !== undefined ? `${filePath}:${line}${column !== undefined ? `:${column}` : ''}` : filePath
		message = `LookML error in ${locStr}: ${rawMessage}`
	}

	return {
		code,
		message,
		...(filePath ? { filePath } : {}),
		...(line !== undefined ? { line } : {}),
		...(column !== undefined ? { column } : {}),
		...(property ? { property } : {}),
		...(context ? { context } : {}),
		...(exception ? { exception } : {})
	}
}

module.exports = normalizeError
