view: orders {
  sql_table_name: `my_table` ;;

  dimension: const_unescaped {
    type: string
    label: "@{my_const}"
    sql: '@{my_const}' ;;
  }

  dimension: const_escaped_once {
    type: string
    label: "@\{my_const}"
    sql: '@\{my_const}' ;;
  }

  dimension: const_escaped_twice {
    type: string
    label: "@\\{my_const}"
    sql: '@\\{my_const}' ;;
  }

  dimension: const_escaped_undefined {
    type: string
    label: "@\{nonexistent}"
    sql: '@\{nonexistent}' ;;
  }

  dimension: const_incomplete {
    type: string
    label: "@\{ and @\\{"
    sql: '@\{ and @\\{' ;;
  }

  dimension: escaped_double_quote {
    type: string
    label: "before \" after"
    sql: 'before \" after' ;;
  }

  dimension: general_backslashes {
    type: string
    label: "\a | \n | \t | \\ | \{"
    sql: '\a | \n | \t | \\ | \{' ;;
  }

  dimension: liquid_output_inner_escape {
    type: string
    label: "{\{ _user_attributes['id'] }}"
    sql: '{\{ _user_attributes["id"] }}' ;;
  }

  dimension: liquid_output_outer_escape {
    type: string
    label: "\{{ _user_attributes['id'] }}"
    sql: '\{{ _user_attributes["id"] }}' ;;
  }

  dimension: liquid_tag_inner_escape {
    type: string
    label: "{\% if true %}yes{\% endif %}"
    sql: '{\% if true %}yes{\% endif %}' ;;
  }

  dimension: liquid_tag_outer_escape {
    type: string
    label: "\{% if true %}yes\{% endif %}"
    sql: '\{% if true %}yes\{% endif %}' ;;
  }
}
