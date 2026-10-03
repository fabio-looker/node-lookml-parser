view: orders {
	extends: [base]

	dimension: status {
		type: string
		sql: ${TABLE}.status ;;
	}
}

view: +orders {
	dimension: refined_dim {
		type: string
		sql: ${TABLE}.refined ;;
	}
}
