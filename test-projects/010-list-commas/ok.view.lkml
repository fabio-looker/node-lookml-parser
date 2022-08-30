view: ok {

	### Atom lists

  # Short

	set: short_none     { fields: [id] }
	set: short_leading  { fields: [,id] }
	set: short_trailing { fields: [id,] }
	set: short_both     { fields: [,id,] }

  # End of line

	set: endofline_none {
		fields: [
			id,
			user.id
		]
	}

	set: endofline_leading {
		fields: [,
			id,
			user.id
		]
	}

	set: endofline_trailing {
		fields: [
			id,
			user.id,
		]
	}

	set: endofline_trailing_nopadding {
		fields: [id,
			user.id,]
	}

	set: endofline_both {
		fields: [,
			id,
			user.id,
		]
	}

  # Start of line

	set: startofline_none {
		fields: [
			id
			,user.id
		]
	}

	set: startofline_leading {
		fields: [
			,id
			,user.id
		]
	}

	set: startofline_trailing {
		fields: [
			id
			,user.id
			,
		]
	}

	set: startofline_trailing_nopadding {
		fields: [id
			,user.id
			,]
	}

	set: startofline_both {
		fields: [
			,id
			,user.id
			,
		]
	}

	# Map lists

	measure: short_none     {filters:[state:"done"]}
	measure: short_leading  {filters:[,state:"done"]}
	measure: short_trailing {filters:[state:"done",]}
	measure: short_both {filters:[,state:"done",]}

	measure: endofline_none {
		filters: [
			state: "done",
			duration: ">5"
			]
	}

	measure: endofline_leading {
		filters: [,
			state: "done",
			duration: ">5"
			]
	}

	measure: endofline_trailing {
		filters: [
			state: "done",
			duration: ">5",
			]
	}

	measure: endofline_both {
		filters: [,
			state: "done",
			duration: ">5",
			]
	}

	measure: startofline_none {
		filters: [
			state: "done"
			,duration: ">5"
			]
	}

	measure: startofline_leading {
		filters: [
			,state: "done"
			,duration: ">5"
			]
	}

	measure: startofline_trailing {
		filters: [
			,state: "done"
			,duration: ">5"
			,
      ]
	}

	measure: startofline_trailing_nopadding {
		filters: [
			state: "done"
			,duration: ">5"
			,]
	}

	measure: startofline_both {
		filters: [
			,state: "done"
			,duration: ">5"
			,
      ]
	}

}
