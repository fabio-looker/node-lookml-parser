view: orders {
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
      column: region { field: orders.region }
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
      sort: {
        field: orders.region
        desc: no
      }
    }
  }
}
