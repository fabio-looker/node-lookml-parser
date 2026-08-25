const parseModule = require('./lib/parse')
const parseFilesModule = require('./lib/parse-files')
const generateModule = require('./lib/generate')

exports = module.exports = {
	parse: parseModule,
	parseAst: parseModule.parseAst,
	parseRaw: parseModule.parseRaw,
	parseFiles: parseFilesModule,
	parseFilesRaw: parseFilesModule.parseFilesRaw,
	generate: generateModule,
	getPositions: require('./lib/positions/get-positions.js').getPositions,
	transformations: require('./lib/transformations')
}
