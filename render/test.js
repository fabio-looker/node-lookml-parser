const test = require("tape")
const render = require("./index.js")

test("Rendering, objects", t => {
		const cases = [{
			args: [
				{},
				{}
			],
			expected: ""
		},{
			args: [
				{},
				{}
			],
			expected: ""
		}]	
	
	cases.forEach(c=>t.equal(render(...c.args),c.expected))
	t.end()
	})

test("Rendering, options", t => {
		const cases = [{
			args: [
				{},
				{}
			],
			expected: ""
		},{
			args: [
				{},
				{}
			],
			expected: ""
		}]	
	
	cases.forEach(c=>t.equal(render(...c.args),c.expected))
	t.end()
	})