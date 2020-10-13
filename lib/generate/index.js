import { generate } from "pegjs"

export default function generateLookmlString(project){
	return generateLookmlArray(project).join('')
	}

function generateLookmlArray(projectFragment,{indentation=""}={}){
	const out = []
	const nextIndentation = indentation+"  "
	const alreadyOutput = new Map()

	// Fragments that didn't come from the parser may not have strings defined, so we'll fill in a default
	const strings = projectFragment.$strings || defaultStrings(projectFragment, indentation)

	for(let string of strings){
		if(isTerminator(string)){
			//Before outputting closing brace, output anything not yet output
			//#TODO: merge in 'new' declarations that aren't in original parsed strings
			//flatPush(remainder())
			out.push(string)
			continue
			}
		if(isReference(string)){
			const subFragment = getReference(projectFragment, string)
			flatPush(out, generateLookmlArray(subFragment,nextIndentation))
			alreadyOutput.set(subFragment,true)
			continue
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

function defaultStrings(projectFragment, indentation){
	return [indentation, projectFragment.Stype, ": ", projectFragment.$name, "{","\n",indentation,"}"]
	}

function  flatPush(tgt, src){
	tgt.push.apply(tgt,src)
	}

function getReference(obj,path){
	if(typeof path === "string"){
		path = path.split(/^!|\./g).filter(Boolean)
		}
	if(!obj){
		return undefined
		}
	if(path.length<=1){
		return obj[path[0]]
		}
	return get(obj[path[0]],path.slice(1))
	}
