include: "base.view.lkml"

view: orders {
  extends: [base]
  dimension: status {
    type: string
  }
}

view: +orders {
  dimension: refined_dim {
    type: number
  }
}
