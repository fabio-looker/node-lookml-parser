view: orders {
  derived_table: {
    create_process: {
      sql_step: CREATE TABLE ${SQL_TABLE_NAME} AS SELECT 1 AS id ;;
      sql_step: INSERT INTO ${SQL_TABLE_NAME} SELECT 2 AS id ;;
    }
  }
  dimension: status {
    case: {
      when: {
        sql: ${TABLE}.status = 'a' ;;
        label: "A"
      }
      else: "Other"
    }
  }
  dimension: region {
    type: string
    sql: ${TABLE}.region ;;
  }
}

view: +orders {
  derived_table: {
    create_process: {
      sql_step: CREATE TABLE ${SQL_TABLE_NAME} AS SELECT 3 AS id ;;
    }
  }
  dimension: status {
    case: {
      when: {
        sql: ${TABLE}.status = 'b' ;;
        label: "B"
      }
    }
  }
}

view: ndt_orders {
  derived_table: {
    explore_source: orders {
      column: status { field: orders.status }
      column: status { field: orders.region }
      sort: {
        field: orders.status
        desc: yes
      }
    }
  }
  dimension: status {}
  dimension: region {}
}

view: +ndt_orders {
  derived_table: {
    explore_source: orders {
      column: status { field: orders.status }
      sort: {
        field: orders.region
        desc: no
      }
    }
  }
}
