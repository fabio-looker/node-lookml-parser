# LookML Constructs & Parser Representation Cheat Sheet

This guide summarizes the categories of LookML syntax constructs, how `lookml-parser` represents them in JavaScript/JSON, how they behave during extensions (`extends`) and refinements (`+`), and which LookML parameters belong to each category.

---

## Quick Reference Matrix

| Category | LookML Syntax Example | Schema (`type` / `cardinality`) | Parsed JS Output\* | Refinement / Extension Merge Behavior |
| :--- | :--- | :--- | :--- | :--- |
| **1. Singular Named Objects** | `dimension: status { ... }`<br>`explore: orders { ... }` | `object` / `singular` | Object keyed by `$type` then `$name` holding a single object\*:<br>`{dimension: { status: { ... } }}` | **Deep-merged** recursively by object name |
| **2. Refinements (Repeatable Named Object)** | `view: +orders { ... }`<br>`explore: +orders { ... }` | `object` / `repeated` | Object keyed by `$type` then `+$name` holding an array of objects:<br>`{ "explore: {+orders": [ { ... } ] }}` | **Applied sequentially** in declaration order onto the base object |
| **3. Singular Unnamed Objects** | `derived_table: { ... }`<br>`always_filter: { ... }` | `object` / `singular` | Single object\*:<br>`{ $type, ... }` | **Deep-merged** recursively |
| **4. Repeatable Unnamed Objects** | `link: { label: "A" url: "..." }`<br>`access_filter: { ... }` | `object` / `repeated` | Array of objects:<br>`[ { label: "A", url: "..." } ]` | **Additive (`concat`)** for `additiveArrayKeys`; otherwise replaced |
| **5. Maps** | `filters: [status: "done", a: "1"]`<br>`sorts: [created: desc]` | `object` / `repeated`<br>*(parsed via `mapElement`)* | Array of map objects:<br>`[ { status: "done", a: "1" } ]` | **Additive (`concat`)** across declarations and refinements |
| **6. Lists** | `timeframes: [raw, date]`<br>`fields: [id, name]` | `list` / `singular`<br>*(parsed via `listElement`)* | Single flat array\*:<br>`["raw", "date"]` | **Replaced** (`addVal` overwrites `baseVal`), except `extends` |
| **7. Repeated Primitives** | `include: "/views/*.view.lkml"` | `string` / `repeated` | Array of strings:<br>`["/views/*.view.lkml"]` | Resolved during model assembly (`assembleModels`) |
| **8. Singular Primitives & `;;` Blocks** | `hidden: yes`<br>`type: count`<br>`sql: ${TABLE}.id ;;` | `string` \| `boolean` \| `number`<br>/ `singular` | Primitive value\*:<br>`true`, `"count"`, `" ${TABLE}.id "` | **Replaced** (`addVal` overwrites `baseVal`) |

> **\*Note on Singularity / Cardinality Violations**: During initial AST grouping, all declarations start in an array and are unwrapped to a single value only when `length === 1`. If any `singular` construct is illegally declared multiple times in the same scope (e.g., `view: foo { label: "A" } view: foo { label: "B" }`), the parser records a `LookMLCardinalityError` (`DUPLICATE_SINGULAR_PROPERTY`) and **returns the value un-unwrapped as an array of the duplicate declarations** (e.g., `view.foo = [ {...}, {...} ]`) so no source data is lost and `generate` can still round-trip the file.

---

## Why `Array.isArray(val)` Means Different Things

A common point of confusion when working with parsed LookML is that **both** Singular Lists (Category 6) and Repeated Declarations (Categories 2, 4, 5, and 7) produce JavaScript arrays, but for different reasons:

1. **Singular Lists (`timeframes: [raw, date]`)**:
   - The brackets `[...]` in LookML represent a **single list value** (`listElement`).
   - Because its schema cardinality is `singular`, the parser unwraps the outer declaration array and returns the list itself: `["raw", "date"]`.
   - Refining `timeframes: [raw, date, month]` **replaces** the array.

2. **Repeated Maps (`filters: [status: "complete"]`)**:
   - Even though it uses square brackets `[...]`, `status: "complete"` is a LookML **map** (`mapElement`), which parses into a JS object `{ status: "complete" }`.
   - Because `filters:` can be declared **multiple times** in the same scope (`cardinality: 'repeated'`), the parser keeps all `filters:` declarations in an outer array: `[ { status: "complete" } ]`.
   - Refining `filters: [region: "EU"]` **concatenates** the declaration arrays: `[ { status: "complete" }, { region: "EU" } ]`.

---

## Detailed Categories & Parameter Lists

### 1. Singular Named Objects (`type: name { ... }`)

Named object declarations have an unprefixed identifier (`$name`) between the colon and the opening brace, and are grouped at `parent[type][$name]`.

- **Parsed Output**: Unwrapped to a single object (`view.orders.dimension.status = { $type: "dimension", $name: "status", ... }`).
- **Cardinality Violation**: Re-declaring `view: foo {} view: foo {}` without `+` violates singularity, emitting `LookMLCardinalityError` (`DUPLICATE_SINGULAR_PROPERTY`) and leaving `view.foo` as an un-unwrapped array `[ {...}, {...} ]`.

**Parameters by Scope:**
- **Top-level / `model`**: `explore`, `view`, `datagroup`, `access_grant`, `map_layer`, `named_value_format`, `test`
- **`explore`**: `join`, `aggregate_table`, `query`
- **`view`**: `dimension`, `dimension_group`, `measure`, `filter`, `parameter`, `set`
- **`derived_table`**: `explore_source`
- **`explore_source`**: `column`, `derived_column`

---

### 2. Repeated Named Objects / Refinements (`type: +name { ... }`)

Refinement declarations use a `+`-prefixed identifier (`+$name`) between the colon and the opening brace. Because the same named object can be refined multiple times in the same file or across included files (`view: +orders { ... } view: +orders { ... }`), refinements have `repeated` cardinality.

- **Parsed Output**: Always an **Array of Objects** under `parent[type]["+name"]` (e.g., `view["+orders"] = [ { $type: "view", $name: "+orders", ... } ]`), even when refined only once.
- **Transformation (`applyExtensionsRefinements`)**: Iterates through the `parent[type]["+name"]` array in order and deep-merges each refinement onto the base `parent[type]["name"]` object.

**Parameters by Scope:**
- **Top-level / `model`**: `view` (`view: +name`), `explore` (`explore: +name`) *(child named objects inside a refined `view` or `explore` — such as `dimension: status`, `join: users`, `query: my_query`, `aggregate_table: my_rollup`, or `set: my_set` — are written without `+` and deep-merged by name when the parent refinement is applied).*

---

### 3. Singular Unnamed Objects (`type: { ... }`)

Curly-brace objects without a `$name` identifier after the colon that can only appear **once** per parent scope.

- **Parsed Output**: Unwrapped to a single object `{ $type, ... }`.
- **Refinement Behavior**: Recursively merged property-by-property (`merge(baseVal, addVal)`).

**Parameters by Scope:**
- **Top-level**: `manifest`
- **`explore`**: `always_filter`, `conditionally_filter`
- **`view`**: `derived_table`
- **`derived_table`**: `create_process`
- **`field` (`dimension`, `measure`, `filter`, `parameter`)**: `case`

---

### 4. Repeated Unnamed Objects (`type: { ... }`)

Curly-brace objects without a `$name` identifier after the colon that can be declared **multiple times** in the same parent scope.

- **Parsed Output**: Always an **Array of Objects** (`[ { ... }, { ... } ]`), even when declared only once.
- **Refinement Behavior**:
  - Properties in `additiveArrayKeys` (`link`, `action`, `allowed_value`, `access_filter`, `bind_filters`) are **concatenated (`baseVal.concat(addVal)`)** when refined.
  - Properties nested inside another repeated or replaced object (`when` inside `case`, `param` / `form_param` / `user_attribute_param` inside `action`, `option` inside `form_param`) are replaced along with their parent object.

**Parameters by Scope:**
- **`explore`**: `access_filter` *(additive)*
- **`field` (`dimension`, `measure`, `filter`, `parameter`)**: `link` *(additive)*, `action` *(additive)*, `allowed_value` *(additive)*
- **`explore_source`**: `bind_filters` *(additive)*, `bind_service`, `sort` *(legacy object form of `sorts`)*
- **`case`**: `when`
- **`action`**: `param`, `user_attribute_param`, `form_param`
- **`form_param`**: `option`

---

### 5. Repeated Maps (`type: [key: value, ...]`)

Bracketed `key: value` pairs (`mapElement` in the PEG grammar, also referred to as `maplists` in the v6.3 changelog). Each `[key: value, ...]` map is parsed into a JS object `{ key: value, ... }`, and because these declarations have `cardinality: 'repeated'`, they are collected into an array of map objects.

```lookml
measure: filtered_count {
  type: count
  filters: [status: "complete", category: "books"]
  filters: [region: "EU"]
}
```
Parses to:
```json
{
  "type": "count",
  "filters": [
    { "status": "complete", "category": "books" },
    { "region": "EU" }
  ]
}
```

- **Legacy Object Syntax Compatibility**: In LookML, `filters` and `dev_filters` also accept legacy curly-brace objects (`filters: { field: status value: "complete" }`), which parse as `{ field: "status", value: "complete" }` inside the same `filters: [ ... ]` array.
- **Refinement Behavior**: **Additive (`concat`)** via `additiveArrayKeys`. Preserving each declaration object in the array keeps `$strings` and `positions` intact for code generation (`generate`), while consumers wanting Looker's effective key-value map can merge the array elements by key (e.g., `Object.assign({}, ...measure.filters)`).

**Parameters by Scope:**
- **`field` (`measure`)**: `filters`
- **`always_filter`**: `filters`
- **`conditionally_filter`**: `filters`
- **`explore_source`**: `filters`, `dev_filters`, `sorts`
- **`query`**: `filters`, `sorts`

---

### 6. Singular Lists (`type: [val1, val2, ...]`)

Bracketed comma-separated lists of strings or unquoted atoms (`listElement` / `emptyListElement` in the PEG grammar) with `cardinality: 'singular'`.

- **Parsed Output**: Unwrapped to a single flat array of primitives: `["val1", "val2"]`.
- **Refinement Behavior**:
  - **Standard list parameters**: Refining **replaces** the base array (`addVal` overwrites `baseVal`). For example, refining `timeframes: [raw, date]` with `timeframes: [raw, date, month, year]` yields `["raw", "date", "month", "year"]`.
  - **Special Case (`extends`)**: `extends` is additive across refinements and extensions when `applyExtensionsRefinements` traverses the inheritance graph.

**Parameters by Scope:**
- **`explore`**: `extends` *(additive inheritance)*, `fields`, `always_join`, `cancel_grouping_fields`, `unless`, `required_access_grants`, `tags`
- **`join`**: `fields`, `required_joins`
- **`view`**: `extends` *(additive inheritance)*, `fields`, `required_access_grants`
- **`derived_table`**: `sortkeys`, `indexes`, `cluster_by`
- **`field` (`dimension`, `measure`, `filter`, `parameter`)**: `suggestions`, `alias`, `timeframes`, `drill_fields`, `tags`, `required_access_grants`, `synonyms`, `tiers`, `bins`, `required_fields`
- **`dimension_group`**: `timeframes`, `intervals`, `synonyms`, `tags`, `required_access_grants`
- **`access_grant`**: `allowed_values`, `required_access_grants`
- **`conditionally_filter`**: `unless`
- **`set`**: `fields`
- **`query`**: `dimensions`, `measures`, `pivots`

---

### 7. Repeated Primitives

Primitive declarations that can appear multiple times in the same scope (`type: 'string', cardinality: 'repeated'`).

- **Parsed Output**: Array of strings (`["/views/*.view.lkml", ...]`).
- **Parameters by Scope**:
  - **Top-level / `model` / `view` / `explore` files**: `include`

---

### 8. Singular Primitives & Double-Semicolon (`;;`) Blocks

Single-valued primitive and `;;` block properties (`cardinality: 'singular'`). Re-declaring any of these within the same scope triggers a `LookMLCardinalityError`, and refining them overwrites the base value.

- **Double-Semicolon (`;;`) Blocks (`blockDeclaration`)**:
  - Any property whose name starts with `sql`, `html`, or `expr` (e.g., `sql`, `sql_on`, `sql_table_name`, `sql_always_where`, `sql_always_having`, `sql_where`, `sql_foreign_key`, `sql_distinct_key`, `sql_start`, `sql_end`, `sql_latitude`, `sql_longitude`, `sql_trigger`, `sql_trigger_value`, `sql_create`, `sql_preamble`, `html`, `expression_custom_filter`).
  - Parsed as a single `string` containing the raw text between `:` and `;;`.
- **Booleans (`type: 'boolean'`)**:
  - Unquoted `yes` and `no` atoms are converted to JS `true` and `false`.
  - Examples: `hidden`, `primary_key`, `convert_tz`, `suggestable`, `allow_fill`, `can_filter`, `bypass_suggest_restrictions`, `alpha_sort`, `symmetric_aggregates`, `case_sensitive`, `outer_only`, `suggestions` *(on `view`)*, `fields_hidden_by_default`, `publish_as_db_view`, `strict_value_format`, `required` *(on `form_param`)*.
- **Numbers (`type: 'number'`)**:
  - Examples: `fiscal_month_offset`, `increment_offset`, `precision`, `decimals`, `percentile`, `min_zoom_level`, `max_zoom_level`, `index` *(on `ndt`)*, `limit` *(on `query`)*.
- **Strings & Unquoted Atoms (`type: 'string'`)**:
  - Both quoted strings (`label: "Orders"`) and unquoted identifier atoms (`type: count`, `relationship: many_to_one`) parse to JS strings (with formatting metadata preserved in `$strings` when `strings: true`).
  - Examples: `connection`, `label`, `description`, `group_label`, `group_item_label`, `view_label`, `type`, `datatype`, `value_format`, `value_format_name`, `default_value`, `direction`, `order_by_field`, `label_from_parameter`, `map_layer_name`, `style`, `fanout_on`, `units`, `from`, `view_name`, `relationship`, `foreign_key`, `persist_for`, `persist_with`, `week_start_day`, `extension`, `distribution`, `distribution_style`, `partition_by`, `increment_key`, `datagroup_trigger`, `max_cache_age`, `user_attribute`, `url`, `icon_url`, `form_url`, `file`, `format`, `feature_key`, `projection`, `property_key`, `property_label_key`, `extents_json_url`, `project_name`, `default_locale`, `primary_language`, `override_optional`, `export`, `from_field`, `to_field`, `field`, `value`, `timezone`, `else`.
