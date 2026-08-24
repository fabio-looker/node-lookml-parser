include: "a.lkml"
include: "b.lkml"

view: foo {
	derived_table: {
		# Triggers with my dg
		datagroup_trigger: my_dg
		sql: SELECT 1 as id ;;
		# Wont break on "sorts"
		# sorts: [id: asc, some_field: desc]
	}
	dimension: id {} #Comment 2
}

explore: foo {
	fields: [foo.id, bar.baz, ALL_FIELDS*]
	filters: [
		# id: "1", # Filters in odd places
		# derived_column: "foo"
	] 
	
}
