const parseModule = require('./lib/parse')

exports = module.exports = {
	parse: parseModule,
	parseAst: parseModule.parseAst,
	parseFiles: require('./lib/parse-files'),
	getPositions: require('./lib/positions/get-positions.js').getPositions,
	transformations: require('./lib/transformations')
}
