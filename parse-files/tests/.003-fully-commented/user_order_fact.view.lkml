# view: user_order_facts {
#   derived_table: {
#     sql:
#       SELECT
#         user_id as 1pk_user_id,
#         ---
#         MIN(DATE(created_at)) AS first_order_date
#       FROM
#         orders
#       GROUP BY
#         user_id ;;
#   }

#   dimension: 1pk_user_id {
#     type: number
#     primary_key: yes
#     hidden: yes
#   }

#   dimension: first_order_date {
#     description: "Date of first order"
#     type: date
#     sql: ${TABLE}.first_order_date ;;
#   }
# }