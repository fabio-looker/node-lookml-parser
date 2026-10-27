connection: "default_bigquery_connection"

include: "orders.view.lkml"

datagroup: daily_etl {
  sql_trigger: SELECT CURDATE() ;;
  max_cache_age: "24 hours"
}

explore: orders {
  access_filter: {
    field: orders.status
    user_attribute: id
  }

  join: orders_bound {
    type: left_outer
    relationship: many_to_one
    sql_on: ${orders.status} = ${orders_bound.status} ;;
  }
}

explore: orders_summary {}

explore: orders_rollup_base {
  extension: required
  view_name: orders

  aggregate_table: status_rollup {
    query: {
      dimensions: [orders.status]
      measures: [orders.count]
    }
    materialization: {
      datagroup_trigger: daily_etl
      increment_key: "status"
      increment_offset: 1
    }
  }

  aggregate_table: persist_rollup {
    query: {
      dimensions: [orders.status]
      measures: [orders.count]
    }
    materialization: {
      persist_for: "12 hours"
    }
  }

  aggregate_table: trigger_rollup {
    query: {
      dimensions: [orders.status]
      measures: [orders.count]
    }
    materialization: {
      sql_trigger_value: SELECT CURDATE() ;;
    }
  }
}

test: orders_count_positive {
  explore_source: orders {
    column: count {
      field: orders.count
    }
  }
  assert: count_is_positive {
    expression: ${orders.count} > 0 ;;
  }
}
