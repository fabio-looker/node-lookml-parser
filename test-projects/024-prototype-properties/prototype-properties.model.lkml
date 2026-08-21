toString: top_toString
valueOf: top_valueOf
hasOwnProperty: top_hasOwnProperty
isPrototypeOf: top_isPrototypeOf
propertyIsEnumerable: top_propertyIsEnumerable
toLocaleString: top_toLocaleString
__proto__: top_proto
constructor: top_constructor
prototype: top_prototype

view: toString {
  toString: prop_toString
  valueOf: prop_valueOf
  hasOwnProperty: prop_hasOwnProperty
  isPrototypeOf: prop_isPrototypeOf
  propertyIsEnumerable: prop_propertyIsEnumerable
  toLocaleString: prop_toLocaleString
  __proto__: prop_proto
  constructor: prop_constructor
  prototype: prop_prototype

  dimension: foo {
    toString: dim_toString
    valueOf: dim_valueOf
    hasOwnProperty: dim_hasOwnProperty
    isPrototypeOf: dim_isPrototypeOf
    propertyIsEnumerable: dim_propertyIsEnumerable
    toLocaleString: dim_toLocaleString
    __proto__: dim_proto
    constructor: dim_constructor
    prototype: dim_prototype
  }
}

view: valueOf {}
view: hasOwnProperty {}
view: isPrototypeOf {}
view: propertyIsEnumerable {}
view: toLocaleString {}
view: __proto__ {}
view: constructor {}
view: prototype {}
