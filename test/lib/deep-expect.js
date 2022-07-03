function flatten(a,b){return a.concat(b)}

function deepExpect(expected){
	return function deepEvaluate(actual,pathPrefix=['$']){
		const entries = Object.entries(expected)
		return (entries
			.map(([key,expVal])=>{
				let actVal = actual[key]
				let path = pathPrefix.concat(key)
				if(	expVal === null
					|| typeof expVal === 'string'
					|| typeof expVal === 'boolean'
					|| typeof expVal === 'number'
					)
					{
					if(actVal === expVal){return []}
					return [`${path.join('.')} : Expected ${snippet(expVal)}, received ${snippet(actVal)}`]
					}
				// Future special cases representing more nuanced expectations, e.g. regexes or symbols, can be added here
				if(	actVal === null && expVal !== null){
					return [`${path.join('.')} : Expected ${snippet(expVal)}, received ${snippet(actVal)}`]
					}
				if(typeof expVal === "object" || typeof expVal === "array"){
					if(	typeof actVal !== typeof expVal){
						return [`${path.join('.')} : Expected ${typeof expVal}, received ${typeof actVal}`]
					}
					return deepExpect(expVal)(actVal,path)
				}
				return [`${path.join('.')} : Unrecognized expectation ${snippet(expVal)}`]
				})
			.reduce(flatten,[])
			)
		}
	}

function snippet(val, max=20){
	let str
	try {str = JSON.stringify(val)}
	catch(e){str = ''+val}
	if(str.length<=max){return string}
	else{return string.slice(0,max-3)+"..."}
	}

module.exports = deepExpect
