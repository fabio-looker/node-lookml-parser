module.exports = function decodeProperty(prop){
	if(typeof prop !== 'string'){
		if(prop === parseInt(prop)){
			return prop
			}
		else {
			throw "Property ("+prop+") must be a string or integer"
			}
		}
	if(prop[0]==='$'){
		return prop.slice(1)
		}
	return prop
	}