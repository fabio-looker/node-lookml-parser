view: orders {
  sql_table_name: orders ;;

  dimension: price_bucket {
    case: {
      when: {
        sql: ${TABLE}.price < 20 ;;
        label: "Low"
      }
      when: {
        sql: ${TABLE}.price < 100 ;;
        label: "Medium"
      }
      else: "High"
    }
  }

  parameter: metric_selector {
    type: unquoted
    allowed_value: {
      label: "Revenue"
      value: "revenue"
    }
  }
}
