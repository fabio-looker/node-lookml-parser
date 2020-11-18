module.exports = function generate(project){
	return generateLookmlArray(project).join('')
	}

function generateLookmlArray(projectFragment,indentation="",strings,precounter=""){
	const out = []
	const nextIndentation = indentation+"  "
	const alreadyOutput = new Map()

	// Fragments that didn't come from the parser may not have strings defined, so we'll fill in a default
	strings = strings && strings.length && strings || projectFragment.$strings || defaultStrings(projectFragment, indentation)

	let counter = 0
	for(let string of strings){
		counter++
		if(isReference(string)){
			const segment = string
			const ref = segment[0]
			const value = getReference(projectFragment, ref)
			const subsegments = segment.slice(1)
			//console.log(`${precounter} ${counter}	`,ref, typeof value, subsegments)
			// flatPush(out, subsegments.map(s => 
			// 	isReference(s)? generateLookmlArray(value,nextIndentation,s.slice(1),`${precounter} ${counter}`)
			// 	: [s]
			// 	)
			// 	.reduce(flatten,[])
			// 	)
			flatPush(out, generateLookmlArray(value,nextIndentation,subsegments,`${precounter} ${counter}`))
			continue
			}
		//console.log(`${precounter} ${counter}	`,'"')
		if(isTerminator(string)){
			//Before outputting closing brace, output anything not yet output
			//#TODO: merge in 'new' declarations that aren't in original parsed strings
			//flatPush(remainder())
			}
		out.push(string)
		continue
		}
	//TODO
	// For files which are not terminated by }, there may still be additions to output
	//flatPush(remainder())

	return out


	function remainder(){ //TODO: Finish this
		const notYetOutput = findNotYetOutput(projectFragment)
		for(let subFragment of notYetOutput){
			flatPush(out,generateLookmlArray(subFragment,nextIndentation))
			out.push("\n")
			out.push(indentation)
			}
		}

	function findNotYetOutput(){ //TODO: Finish this, it's complicated
			const subFragments = []
			for(let prop in projectFragment){
				if(!projectFragment.hasOwnProperty(prop)){continue}
				if(isMeta(prop)){continue}
				let type = prop
				let value = projectFragment[prop]
				if(Array.isArray(value)){
					//It's an array, like model>include
					let arr = value 
					for(let value of arr){
						pushIfNotOutput(value)
						}
					}
				else if(typeof value==="object" && value.$type){
					//It's an object-like property e.g. view>derived_table
					pushIfNotOutput(value)
					}
				else if(typeof value==="object" && !value.$type){
					//It's a collection of declarations, e.g. view>dimension
					let typeCollection = value
					for(let name in typeCollection){
						if(!typeCollection.hasOwnProperty(name)){continue}
						let value = typeCollection[name]
						if(isRefinement(name)){
							let arr = value
							for(let value of arr){
								pushIfNotOutput(value)
								}
							}
						else{ //Not a refinement
							pushIfNotOutput(value)
							}
						}
					}
				else {
					//It's a literal (string or boolean), like explore>label or dimension>hidden
					pushIfNotOutput(value) //TODO need  to push name:value or refString, not just value
				}
				}
			return

			function pushIfNotOutput(value){
				if(!alreadyOutput.get(value)){subFragments.push(value)}
				}
			}
	}
function isTerminator(str){return str==="}"}
function isReference(str){return str[0]==="!"}
function isMeta(str){return str[0]==="$"}
function isReference(stx){return Array.isArray(stx)}
function isPrimitive(val){return typeof val === "string" || typeof val == "boolean" }
//function isSelfReference(x){return Array.isArray(x) && !x[0]}
function defaultStrings(val, indentation){
	if(typeof val==="string"){
		//TODO: Output will vary depending on whether this is a quoted string (more escaping?) or block string (less escaping).
		return val
		}
	if(val===true){return "yes"}
	if(val===false){return "no"}
	return [indentation, val.Stype, ": ", val.$name, "{","\n",indentation,"}"]
	}
function primitiveLookml(val){
	if(typeof val==="string"){
		//TODO: Output will vary depending on whether this is a quoted string (more escaping?) or block string (less escaping).
		return val
		}
	if(val===true){return "yes"}
	if(val===false){return "no"}
	return val.toString()
	}

function  flatPush(tgt, src){
	tgt.push.apply(tgt,src)
	}
function flatten(a,b){return a.concat(b)}
function getReference(obj,path){
	if(!path){return obj}
	if(typeof path === "string"){
		path = path.split(/^!|\./g)
			.filter(Boolean)
			.map(str => str.match(/^\d+$/) ? parseInt(str) : str )
		}
	if(!obj){
		return undefined
		}
	if(path.length<=1){
		return obj[path[0]]
		}
	return getReference(obj[path[0]],path.slice(1))
	}
