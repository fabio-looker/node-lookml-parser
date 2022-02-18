view: test {

  # Atom lists

  set: no_trailing_comma_end {
    fields: [
      id,
      user.id
    ]
  }

  set: no_trailing_comma_start {
    fields: [
      id,
      user.id
    ]
  }

  set: trailing_comma_end {
    fields: [
      id,
      user.id,
    ]
  }

  set: trailing_comma_start {
    fields: [
      id
      ,user.id
      ,
    ]
  }

  set: trailing_comma_end_abrupt {
    fields: [id,
      user.id,]
  }

  set: trailing_comma_start_abrupt {
    fields: [id
      ,user.id
      ,]
  }

  # Map lists

  measure: short_no_trailing {
    type: count
    filters: [
      state: "done"
      ]
  }

  measure: short_trailing {
    type: count
    filters: [
      state: "done",
      ]
  }

  measure: no_trailing {
    type: count
    filters: [
      state: "done",
      duration: ">5"
      ]
  }

  measure: trailing {
    type: count
    filters: [
      state: "done",
      duration: ">5",
      ]
  }

}
