/** LookML Property Schema Registry
 * Maps LookML parent scopes and property keys to their metadata:
 * - cardinality: 'singular' | 'repeated'
 * - type: 'string' | 'boolean' | 'number' | 'list' | 'object' | 'array'
 * - required: boolean
 */

const LOOKML_SCHEMA = {
	model: {
		connection: { type: 'string', cardinality: 'singular' },
		label: { type: 'string', cardinality: 'singular' },
		fiscal_month_offset: { type: 'number', cardinality: 'singular' },
		week_start_day: { type: 'string', cardinality: 'singular' },
		case_sensitive: { type: 'boolean', cardinality: 'singular' },
		persist_for: { type: 'string', cardinality: 'singular' },
		persist_with: { type: 'string', cardinality: 'singular' },
		include: { type: 'string', cardinality: 'repeated' },
		explore: { type: 'object', cardinality: 'repeated' }
	},

	explore: {
		label: { type: 'string', cardinality: 'singular' },
		description: { type: 'string', cardinality: 'singular' },
		group_label: { type: 'string', cardinality: 'singular' },
		hidden: { type: 'boolean', cardinality: 'singular' },
		from: { type: 'string', cardinality: 'singular' },
		view_name: { type: 'string', cardinality: 'singular' },
		view_label: { type: 'string', cardinality: 'singular' },
		symmetric_aggregates: { type: 'boolean', cardinality: 'singular' },
		extension: { type: 'string', cardinality: 'singular' },
		extends: { type: 'list', cardinality: 'singular' },
		sql_always_where: { type: 'string', cardinality: 'singular' },
		sql_always_having: { type: 'string', cardinality: 'singular' },
		sql_preamble: { type: 'string', cardinality: 'singular' },
		cancel_grouping_fields: { type: 'list', cardinality: 'singular' },
		fields: { type: 'list', cardinality: 'singular' },
		always_join: { type: 'list', cardinality: 'singular' },
		always_filter: { type: 'object', cardinality: 'singular' },
		conditionally_filter: { type: 'object', cardinality: 'singular' },
		unless: { type: 'list', cardinality: 'singular' },
		join: { type: 'object', cardinality: 'repeated' },
		access_filter: { type: 'object', cardinality: 'repeated' },
		aggregate_table: { type: 'object', cardinality: 'repeated' },
		query: { type: 'object', cardinality: 'repeated' },
		required_access_grants: { type: 'list', cardinality: 'singular' }
	},

	join: {
		label: { type: 'string', cardinality: 'singular' },
		description: { type: 'string', cardinality: 'singular' },
		from: { type: 'string', cardinality: 'singular' },
		view_label: { type: 'string', cardinality: 'singular' },
		type: { type: 'string', cardinality: 'singular' },
		relationship: { type: 'string', cardinality: 'singular' },
		sql_on: { type: 'string', cardinality: 'singular' },
		sql_foreign_key: { type: 'string', cardinality: 'singular' },
		foreign_key: { type: 'string', cardinality: 'singular' },
		required_joins: { type: 'list', cardinality: 'singular' },
		sql_where: { type: 'string', cardinality: 'singular' },
		outer_only: { type: 'boolean', cardinality: 'singular' },
		fields: { type: 'list', cardinality: 'singular' }
	},

	view: {
		label: { type: 'string', cardinality: 'singular' },
		description: { type: 'string', cardinality: 'singular' },
		sql_table_name: { type: 'string', cardinality: 'singular' },
		derived_table: { type: 'object', cardinality: 'singular' },
		extension: { type: 'string', cardinality: 'singular' },
		extends: { type: 'list', cardinality: 'singular' },
		fields: { type: 'list', cardinality: 'singular' },
		required_access_grants: { type: 'list', cardinality: 'singular' },
		dimension: { type: 'object', cardinality: 'repeated' },
		measure: { type: 'object', cardinality: 'repeated' },
		filter: { type: 'object', cardinality: 'repeated' },
		parameter: { type: 'object', cardinality: 'repeated' },
		dimension_group: { type: 'object', cardinality: 'repeated' },
		set: { type: 'object', cardinality: 'repeated' }
	},

	derived_table: {
		sql: { type: 'string', cardinality: 'singular' },
		sql_create: { type: 'string', cardinality: 'singular' },
		sql_trigger_value: { type: 'string', cardinality: 'singular' },
		datagroup_trigger: { type: 'string', cardinality: 'singular' },
		persist_for: { type: 'string', cardinality: 'singular' },
		distribution: { type: 'string', cardinality: 'singular' },
		distribution_style: { type: 'string', cardinality: 'singular' },
		sortkeys: { type: 'list', cardinality: 'singular' },
		indexes: { type: 'list', cardinality: 'singular' },
		cluster_by: { type: 'list', cardinality: 'singular' },
		partition_by: { type: 'string', cardinality: 'singular' },
		increment_key: { type: 'string', cardinality: 'singular' },
		increment_offset: { type: 'number', cardinality: 'singular' },
		explore_source: { type: 'object', cardinality: 'singular' },
		publish_as_db_view: { type: 'boolean', cardinality: 'singular' },
		create_process: { type: 'object', cardinality: 'singular' }
	},

	explore_source: {
		column: { type: 'object', cardinality: 'repeated' },
		derived_column: { type: 'object', cardinality: 'repeated' },
		bind_filters: { type: 'object', cardinality: 'repeated' },
		bind_service: { type: 'object', cardinality: 'repeated' },
		filters: { type: 'object', cardinality: 'repeated' },
		sort: { type: 'object', cardinality: 'repeated' },
		sorts: { type: 'object', cardinality: 'repeated' },
		expression_custom_filter: { type: 'string', cardinality: 'singular' },
		limit: { type: 'string', cardinality: 'singular' },
		timezone: { type: 'string', cardinality: 'singular' }
	},

	field: {
		label: { type: 'string', cardinality: 'singular' },
		description: { type: 'string', cardinality: 'singular' },
		group_label: { type: 'string', cardinality: 'singular' },
		group_item_label: { type: 'string', cardinality: 'singular' },
		view_label: { type: 'string', cardinality: 'singular' },
		type: { type: 'string', cardinality: 'singular' },
		hidden: { type: 'boolean', cardinality: 'singular' },
		primary_key: { type: 'boolean', cardinality: 'singular' },
		datatype: { type: 'string', cardinality: 'singular' },
		sql: { type: 'string', cardinality: 'singular' },
		html: { type: 'string', cardinality: 'singular' },
		value_format_name: { type: 'string', cardinality: 'singular' },
		value_format: { type: 'string', cardinality: 'singular' },
		convert_tz: { type: 'boolean', cardinality: 'singular' },
		suggestable: { type: 'boolean', cardinality: 'singular' },
		suggest_persist_for: { type: 'string', cardinality: 'singular' },
		suggest_dimension: { type: 'string', cardinality: 'singular' },
		suggest_explore: { type: 'string', cardinality: 'singular' },
		suggestions: { type: 'list', cardinality: 'singular' },
		style: { type: 'string', cardinality: 'singular' },
		alias: { type: 'list', cardinality: 'singular' },
		timeframes: { type: 'list', cardinality: 'singular' },
		drill_fields: { type: 'list', cardinality: 'singular' },
		tags: { type: 'list', cardinality: 'singular' },
		fanout_on: { type: 'string', cardinality: 'singular' },
		allow_fill: { type: 'boolean', cardinality: 'singular' },
		precision: { type: 'number', cardinality: 'singular' },
		decimals: { type: 'number', cardinality: 'singular' },
		can_filter: { type: 'boolean', cardinality: 'singular' },
		bypass_suggest_restrictions: { type: 'boolean', cardinality: 'singular' },
		sql_distinct_key: { type: 'string', cardinality: 'singular' },
		sql_latitude: { type: 'string', cardinality: 'singular' },
		sql_longitude: { type: 'string', cardinality: 'singular' },
		percentile: { type: 'number', cardinality: 'singular' },
		link: { type: 'object', cardinality: 'repeated' },
		action: { type: 'object', cardinality: 'repeated' },
		filters: { type: 'list', cardinality: 'repeated' },
		required_access_grants: { type: 'list', cardinality: 'singular' }
	},

	dimension_group: {
		type: { type: 'string', cardinality: 'singular' },
		datatype: { type: 'string', cardinality: 'singular' },
		sql: { type: 'string', cardinality: 'singular' },
		timeframes: { type: 'list', cardinality: 'singular' },
		intervals: { type: 'list', cardinality: 'singular' },
		sql_start: { type: 'string', cardinality: 'singular' },
		sql_end: { type: 'string', cardinality: 'singular' },
		convert_tz: { type: 'boolean', cardinality: 'singular' },
		label: { type: 'string', cardinality: 'singular' },
		description: { type: 'string', cardinality: 'singular' },
		group_label: { type: 'string', cardinality: 'singular' },
		group_item_label: { type: 'string', cardinality: 'singular' }
	},

	link: {
		label: { type: 'string', cardinality: 'singular' },
		url: { type: 'string', cardinality: 'singular', required: true },
		icon_url: { type: 'string', cardinality: 'singular' },
		map_layer_name: { type: 'string', cardinality: 'singular' }
	},

	action: {
		label: { type: 'string', cardinality: 'singular', required: true },
		url: { type: 'string', cardinality: 'singular', required: true },
		icon_url: { type: 'string', cardinality: 'singular' },
		form_url: { type: 'string', cardinality: 'singular' },
		param: { type: 'object', cardinality: 'repeated' },
		user_attribute_param: { type: 'object', cardinality: 'repeated' }
	},

	map_layer: {
		file: { type: 'string', cardinality: 'singular' },
		url: { type: 'string', cardinality: 'singular' },
		format: { type: 'string', cardinality: 'singular' },
		feature_key: { type: 'string', cardinality: 'singular' },
		projection: { type: 'string', cardinality: 'singular' },
		property_key: { type: 'string', cardinality: 'singular' },
		property_label_key: { type: 'string', cardinality: 'singular' },
		extents_json_url: { type: 'string', cardinality: 'singular' },
		min_zoom_level: { type: 'number', cardinality: 'singular' },
		max_zoom_level: { type: 'number', cardinality: 'singular' }
	},

	named_value_format: {
		value_format: { type: 'string', cardinality: 'singular', required: true },
		strict_value_format: { type: 'boolean', cardinality: 'singular' }
	},

	manifest: {
		project_name: { type: 'string', cardinality: 'singular' },
		default_locale: { type: 'string', cardinality: 'singular' },
		primary_language: { type: 'string', cardinality: 'singular' },
		override_optional: { type: 'string', cardinality: 'singular' },
		export: { type: 'string', cardinality: 'singular' }
	},

	datagroup: {
		max_cache_age: { type: 'string', cardinality: 'singular' },
		sql_trigger: { type: 'string', cardinality: 'singular' },
		label: { type: 'string', cardinality: 'singular' },
		description: { type: 'string', cardinality: 'singular' }
	},

	access_grant: {
		user_attribute: { type: 'string', cardinality: 'singular', required: true },
		allowed_values: { type: 'list', cardinality: 'singular', required: true },
		required_access_grants: { type: 'list', cardinality: 'singular' }
	},

	ndt: {
		from_field: { type: 'string', cardinality: 'singular' },
		to_field: { type: 'string', cardinality: 'singular' },
		field: { type: 'string', cardinality: 'singular' },
		value: { type: 'string', cardinality: 'singular' },
		desc: { type: 'string', cardinality: 'singular' },
		index: { type: 'number', cardinality: 'singular' },
		limit: { type: 'string', cardinality: 'singular' },
		timezone: { type: 'string', cardinality: 'singular' },
		expression_custom_filter: { type: 'string', cardinality: 'singular' }
	}
}

const SCOPE_ALIASES = {
	dimension: 'field',
	measure: 'field',
	filter: 'field',
	parameter: 'field',
	column: 'ndt',
	derived_column: 'ndt',
	bind_filters: 'ndt'
}

function getSchemaProperty(parentType, propertyKey) {
	if (!propertyKey) return null
	const key = String(propertyKey).replace(/^\$/, '')
	const resolvedScope = SCOPE_ALIASES[parentType] || parentType

	if (resolvedScope && LOOKML_SCHEMA[resolvedScope] && Object.prototype.hasOwnProperty.call(LOOKML_SCHEMA[resolvedScope], key)) {
		return LOOKML_SCHEMA[resolvedScope][key]
	}

	for (const scope of Object.keys(LOOKML_SCHEMA)) {
		if (Object.prototype.hasOwnProperty.call(LOOKML_SCHEMA[scope], key)) {
			return LOOKML_SCHEMA[scope][key]
		}
	}

	return null
}

module.exports = {
	LOOKML_SCHEMA,
	getSchemaProperty
}
