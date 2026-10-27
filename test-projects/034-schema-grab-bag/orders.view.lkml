view: orders {
  sql_table_name: `test.orders` ;;

  dimension: id {
    primary_key: yes
    type: number
    sql: ${TABLE}.id ;;
  }

  dimension: status {
    type: string
    sql: ${TABLE}.status ;;
    action: {
      label: "Update Status"
      url: "https://example.com/update"
      icon_url: "https://example.com/icon.png"
      form_url: "https://example.com/form"
      param: {
        name: "order_id"
        value: "{{ value }}"
      }
      user_attribute_param: {
        user_attribute: id
        name: "user_id"
      }
      form_param: {
        name: "new_status"
        type: select
        label: "New Status"
        required: yes
        default: "complete"
        description: "Select a status"
        option: {
          name: "complete"
          label: "Complete"
        }
      }
    }
  }

  measure: count {
    type: count
  }
}

view: orders_summary {
  derived_table: {
    explore_source: orders {
      column: status {
        field: orders.status
      }
      column: order_count {
        field: orders.count
      }
      derived_column: double_count {
        sql: order_count * 2 ;;
      }
      bind_filters: {
        from_field: orders_summary.status
        to_field: orders.status
      }
      filters: [orders.status: "-cancelled"]
      dev_filters: [orders.status: "complete"]
      sorts: [orders.count: desc]
    }
  }

  dimension: status {
    primary_key: yes
  }

  dimension: order_count {
    type: number
  }

  dimension: double_count {
    type: number
  }
}

view: orders_bound {
  derived_table: {
    explore_source: orders {
      column: status {
        field: orders.status
      }
      bind_all_filters: yes
    }
  }

  dimension: status {
    primary_key: yes
  }
}

view: custom_pdt {
  derived_table: {
    sql_trigger_value: SELECT CURDATE() ;;
    create_process: {
      sql_step: CREATE TABLE ${SQL_TABLE_NAME} AS SELECT 1 AS id ;;
      sql_step: INSERT INTO ${SQL_TABLE_NAME} SELECT 2 AS id ;;
    }
  }

  dimension: id {
    type: number
    sql: ${TABLE}.id ;;
  }
}

view: +custom_pdt {
  derived_table: {
    create_process: {
      sql_step: CREATE TABLE ${SQL_TABLE_NAME} AS SELECT 99 AS id ;;
    }
  }
}
