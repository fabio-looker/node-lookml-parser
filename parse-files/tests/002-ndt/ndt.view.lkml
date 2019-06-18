# Example from https://docs.looker.com/reference/view-params/explore_source

view: user_90_day_facts {
	derived_table: {
		explore_source: identifier {
			bind_filters: {
			  from_field: field_name
			  to_field: field_name
			}
			column: identifier {
			  field: field_name
			}
			derived_column: identifier {
			  sql: SQL expression ;;
			}
			expression_custom_filter: ${orders.status} = "pending" ;;
			filters: {
			  field: field_name
			  value: "string"
			}
			limit: number
			sort: {
			  desc: boolean
			  field: field_name
			}
			timezone: "string"
		}
	}

	# Add define view's fields as desired
	dimension: user_id {hidden: yes}
	dimension: number_of_orders_90_day {type: number}
	dimension: customer_value_90_day {type: number}
}