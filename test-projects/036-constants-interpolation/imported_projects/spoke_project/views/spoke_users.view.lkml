view: spoke_users {
  sql_table_name: @{spoke_schema}.users ;;
  dimension: user_id {
    type: number
    label: "@{spoke_prefix} ID"
    sql: ${TABLE}.@{spoke_prefix}_id ;;
  }
}
