view: orders {
  dimension_group: created {
    type: time
    timeframes: [raw, date]
    sql: ${TABLE}.created_at ;;
  }
  measure: filtered_count {
    type: count
    filters: [status: "complete"]
  }
}

view: +orders {
  dimension_group: created {
    timeframes: [raw, date, month, year]
  }
  measure: filtered_count {
    filters: [region: "EU"]
  }
}
