const defaultConsole = console

class CustomConsole {
	constructor(spec = defaultConsole) {
		if (spec === false) {
			this.log = noop
			this.warn = noop
			this.error = noop
		} else if (Array.isArray(spec)) {
			for (const method of ['log', 'warn', 'error']) {
				this[method] = spec.includes(method)
					? defaultConsole[method].bind(defaultConsole)
					: noop
			}
		} else if (spec && typeof spec === 'object') {
			for (const method of ['log', 'warn', 'error']) {
				this[method] = typeof spec[method] === 'function'
					? spec[method].bind(spec)
					: noop
			}
		} else {
			this.log = defaultConsole.log.bind(defaultConsole)
			this.warn = defaultConsole.warn.bind(defaultConsole)
			this.error = defaultConsole.error.bind(defaultConsole)
		}
	}
}

function noop() {}

module.exports = CustomConsole
