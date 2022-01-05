module.exports = function generate(project){
	return generateLookmlArray(project).join('')
	}

function generateLookmlArray(projectFragment, {
		indentation="",
		segments,
		path = [],
		trace=false,
		traceInitTreePosition=""
	} = {}){

	if(typeof projectFragment === "string" && !segments){return [projectFragment]}
	const out = []

	segments = 
		segments && segments.length && segments 
		|| projectFragment.$strings 
		|| defaultStrings(projectFragment, path)

	
	if(trace){
		console.log(`${traceInitTreePosition} path:`.padEnd(24,'.') + ' ' + (path||[]).join(' > ').slice(0,60))
		console.log(`${traceInitTreePosition} fragment:`.padEnd(24,'.') + ' ' + JSON.stringify(projectFragment||null).slice(0,60))
		console.log(`${traceInitTreePosition} segments:`.padEnd(24,'.') + ' ' + JSON.stringify(segments||null).slice(0,60))
		}

	// We'll track which keys have already been output, so we can do a second pass through the values to flush out any 
	// values that may have been added and were not in the original strings
	const alreadyOutput = new Set()
	let counter = 0
	for(let segment of segments){
		counter++
		const traceCurrentTreePosition = `${traceInitTreePosition} ${counter.toString().padEnd(3," ")}`

		const refkey = getReferenceKey(segment)
		if(refkey){
			const value = getReferenceValue(projectFragment, refkey)
			const subsegments = getSubsegments(segment)

			if(trace){console.log(`${traceCurrentTreePosition.padEnd(24," ")} ${JSON.stringify(segment).slice(0,15)}\tRef: ${refkey} -> ${JSON.stringify(value||null).slice(0,6)}...; sub:${!!subsegments}`)}

			flatPush(out, generateLookmlArray(value,{
				path: path.concat(refkey),
				trace,
				segments: subsegments,
				traceInitTreePosition: traceCurrentTreePosition
				}))
			alreadyOutput.add(refkey)
			continue
			}
		
		// TODO: Merge in new values that were not referenced in the original string segments
		// if(typeof projectFragment === "object" && isTerminator(segment) || path.length === 0 && counter === segments.length){
		// 	let keys = generateKeys(projectFragment)
		// 	function generateKeys(fragment){
		// 		// The ambiguity here is to determine what things should be considered types and made into compound 2-level keys, e.g. explore.foo
		// 		return []
		// 	}
		// 	for(let key of keys){
		// 		if(isMeta(key)){continue} //Do not try to output 'meta' keys like $type, $name, etc
		// 		if(alreadyOutput.has(key)){continue} //Do not try to output 'meta' keys like $type, $name, etc
		// 		flatPush(projectFragment[key],{
		// 			path: path.concat(key)
		// 			})
		// 		}
		// 	}
		
		if(trace){console.log(`${traceCurrentTreePosition.padEnd(24," ")} ${JSON.stringify(segment||null).slice(0,15)}`)}
		out.push(segment)
		continue
		}

	return out


	// function remainder(){ //TODO: Finish this
	// 	const notYetOutput = findNotYetOutput(projectFragment)
	// 	for(let subFragment of notYetOutput){
	// 		flatPush(out,generateLookmlArray(subFragment,nextIndentation))
	// 		out.push("\n")
	// 		out.push(indentation)
	// 		}
	// 	}

	// function findNotYetOutput(){ //TODO: Finish this, it's complicated
	// 		const subFragments = []
	// 		for(let prop in projectFragment){
	// 			if(!projectFragment.hasOwnProperty(prop)){continue}
	// 			if(isMeta(prop)){continue}
	// 			let type = prop
	// 			let value = projectFragment[prop]
	// 			if(Array.isArray(value)){
	// 				//It's an array, like model>include
	// 				let arr = value 
	// 				for(let value of arr){
	// 					pushIfNotOutput(value)
	// 					}
	// 				}
	// 			else if(typeof value==="object" && value.$type){
	// 				//It's an object-like property e.g. view>derived_table
	// 				pushIfNotOutput(value)
	// 				}
	// 			else if(typeof value==="object" && !value.$type){
	// 				//It's a collection of declarations, e.g. view>dimension
	// 				let typeCollection = value
	// 				for(let name in typeCollection){
	// 					if(!typeCollection.hasOwnProperty(name)){continue}
	// 					let value = typeCollection[name]
	// 					if(isRefinement(name)){
	// 						let arr = value
	// 						for(let value of arr){
	// 							pushIfNotOutput(value)
	// 							}
	// 						}
	// 					else{ //Not a refinement
	// 						pushIfNotOutput(value)
	// 						}
	// 					}
	// 				}
	// 			else {
	// 				//It's a literal (string or boolean), like explore>label or dimension>hidden
	// 				pushIfNotOutput(value) //TODO need  to push name:value or refString, not just value
	// 			}
	// 			}
	// 		return

	// 		function pushIfNotOutput(value){
	// 			if(!alreadyOutput.get(value)){subFragments.push(value)}
	// 			}
	// 		}
	}
function isTerminator(str){return str==="}"}
function isMeta(str){return str[0]==="$"}

function defaultStrings(val, path){
	const indentation = path.map(x=>"").join("  ")
	if(typeof val==="string"){
		const leafKey = path[path.length-1]
		//TODO: Output will vary depending on whether this is a quoted string (more escaping?) or block string (less escaping).
		return val
		}
	if(val===true){return "yes"}
	if(val===false){return "no"}
	return [indentation, val.Stype, ": ", val.$name, "{","\n",indentation,"}"]
	}

function  flatPush(tgt, src){
	tgt.push.apply(tgt,src)
	}
function getReferenceKey(segment){
	return Array.isArray(segment) && typeof segment[0] == "number" ? segment[0]
		: Array.isArray(segment) && typeof segment[0] == "string" && segment[0].match(/^[0-9]+$/) ? segment[0] //parseInt(segment[0])
		: Array.isArray(segment) ? segment[0]
		: segment === '@' ? "$value"
		: typeof segment == "string" && segment[0] === "@" ? segment.slice(1)
		: undefined
	}
function getReferenceValue(obj,path){
	if(!path){return obj}
	if(path === "$value"){return obj && obj.$value || obj}
	if(!obj){
		return undefined
		}
	// This special case seems redundant?
	// if(obj.$type == "sorts") {
	// 	return obj[path]
	// }
	if(typeof path === "number"){
		path = [path]
		}
	if(typeof path === "string"){
		path = path.split(/^!|\./g)
			.filter(Boolean)
			.map(str => str.match(/^\d+$/) ? parseInt(str) : str )
		}
	if(path.length<=1){
		return obj[path[0]]
		}
	return getReferenceValue(obj[path[0]],path.slice(1))
	}
function getSubsegments(segment){
	if(Array.isArray(segment)){return segment.slice(1)}
	return
	}
