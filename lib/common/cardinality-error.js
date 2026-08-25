class LookMLCardinalityError extends Error {
	constructor(message, { property, location, context, code = 'DUPLICATE_SINGULAR_PROPERTY' } = {}) {
		super(message)
		this.name = 'LookMLCardinalityError'
		this.code = code
		this.property = property
		if (location) this.location = location
		if (context) this.context = context
	}

	toJSON() {
		return {
			name: this.name,
			code: this.code,
			property: this.property,
			message: this.message,
			...(this.location ? { location: this.location } : {}),
			...(this.context ? { context: this.context } : {})
		}
	}
}

module.exports = LookMLCardinalityError
