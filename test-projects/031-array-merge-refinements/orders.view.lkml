view: orders {
  dimension_group: created {
    type: time
    timeframes: [raw, date]
    sql: ${TABLE}.created_at ;;
  }
}

view: +orders {
  dimension_group: created {
    timeframes: [raw, date, month, year]
  }
}
