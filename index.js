
exports = module.exports = {
		parse: require('./lib/parse'),
		parseFiles: require('./lib/parse-files'),
		getPositions: require('./lib/positions/get-positions.js').getPositions,
		transformations: require('./lib/transformations')
	}
