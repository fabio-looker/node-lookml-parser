function flatten(a,b){return a.concat(b)}

function deepExpect(expected){
	return function deepEvaluate(actual,pathPrefix=['$']){
		if(expected === undefined){throw `Expected is undefined`}
		if(actual === undefined){throw `Actual is undefined`}
		const entries = Object.entries(expected)
		return (entries
			.map(([key,expVal])=>{
				let actVal = actual[key]
				let path = pathPrefix.concat(key)
				if(expVal === null){
					if(actVal === null || actVal === undefined){
						// Since JSON (which we use to specify test expectations) can't represent undefined values,
						// we use null to indicate the expectation of an undefined property
						return []
					}
					else {
						return [`${path.join('.')} : Expected null or undefined, received ${snippet(actVal)}`]
					}
				}
				if(	   typeof expVal === 'string'
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
						return [`${pathToString(path)} : Expected ${typeof expVal}, received ${typeof actVal}`]
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
	try {str = JSON.stringify(val) || 'undefined'}
	catch(e){str = ''+val}
	if(str.length<=max){return str}
	else{return str.slice(0,max-3)+"..."}
	}

function pathToString(path){
	return path
		.filter(part=>part!=='')
		.map(p=>(''+p).replace(/\\/g,"\\\\").replace(/\./g,"\\."))
		.join('.')
	}

module.exports = deepExpect
