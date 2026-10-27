# LookML Constructs & Parser Representation Cheat Sheet

This guide summarizes the categories of LookML syntax constructs, how `lookml-parser` represents them in JavaScript/JSON, how they behave during extensions (`extends`) and refinements (`+`), and which LookML parameters belong to each category.

---

## Quick Reference Matrix

| Category | LookML Syntax Example | Schema (`type` / `cardinality`) | Parsed JS Output\* | Refinement / Extension Merge Behavior |
| :--- | :--- | :--- | :--- | :--- |
| **1. Singular Named Objects** | `dimension: status { ... }`<br>`explore: orders { ... }` | `object` / `singular` | Addressed by `$type` then `$name` into a single object\*:<br>`{ dimension: { status: { ... } } }` | **Deep-merged** recursively by object name |
| **2. Refinements (Repeatable Named Object)** | `view: +orders { ... }`<br>`explore: +orders { ... }` | `object` / `repeated` | Addressed by `$type` then `+$name` into an array of objects:<br>`{ explore: { "+orders": [ { ... } ] } }` | **Applied sequentially** in declaration order onto the base object, then stripped from `project.model` by `removeAbstract` (preserved in `project.file`) |
| **3. Singular Unnamed Objects** | `derived_table: { ... }`<br>`always_filter: { ... }` | `object` / `singular` | Addressed by `$type` into a single object\*:<br>`{ derived_table: { ... } }` | **Deep-merged** recursively |
| **4. Repeatable Unnamed Objects** | `link: { label: "A" url: "..." }`<br>`access_filter: { ... }` | `object` / `repeated` | Addressed by `$type` into an array of objects:<br>`{ link: [ { label: "A", url: "..." } ] }` | **Additive (`concat`)** across declarations and refinements |
| **5. Maps** | `filters: [status: "done", a: "1"]`<br>`sorts: [created: desc]` | `object` / `repeated`<br>*(parsed via `mapElement`)* | Addressed by `$type` into an array of map objects:<br>`{ filters: [ { status: "done", a: "1" } ] }` | **Additive (`concat`)** across declarations and refinements |
| **6. Lists** | `timeframes: [raw, date]`<br>`fields: [id, name]` | `list` / `singular`<br>*(parsed via `listElement`)* | Addressed by `$type` into a single flat array\*:<br>`{ timeframes: ["raw", "date"] }` | **Replaced** (`addVal` overwrites `baseVal`; [see details](#6-singular-lists-type-val1-val2-)) |
| **7. Repeated Primitives** | `include: "/views/*.view.lkml"`<br>`sql_step: CREATE TABLE ... ;;` | `string` / `repeated` | Addressed by `$type` into an array of strings:<br>`{ include: ["/views/*.view.lkml"] }` | **Additive (`concat`)** by default ([see details](#7-repeated-primitives)) |
| **8. Singular Primitives** | `hidden: yes`<br>`type: count`<br>`sql: ${TABLE}.id ;;` | `string` \| `boolean` \| `number`<br>/ `singular` | Addressed by `$type` into a primitive value\*:<br>`{ hidden: true, type: "count", sql: " ${TABLE}.id " }` | **Replaced** (`addVal` overwrites `baseVal`) |

> **\*Note on Singularity / Cardinality Violations**: During initial AST grouping, all declarations start in an array and are unwrapped to a single value only when `length === 1`.
> - **`singular`**: If a `singular` construct is illegally declared multiple times in the same scope (e.g., `view: foo { label: "A" } view: foo { label: "B" }`), the parser records a `LookMLCardinalityError` (`DUPLICATE_SINGULAR_PROPERTY`) and **returns the value un-unwrapped as an array of the duplicate declarations** (e.g., `view.foo = [ {...}, {...} ]`) so no source data is lost and `generate` can still round-trip the file.
> - **`singular_permissive`** *(default for un-schematized properties, and explicit on `explore_source.column` and `explore_source.derived_column`)*: Unwraps to a single value when declared once, but if declared multiple times within a scope, preserves the array across the project (via `globalRepeatedKeys`) **without** emitting a `LookMLCardinalityError`, and concatenates arrays during refinements.

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

Named object declarations have an unprefixed identifier (`$name`) between the colon and the opening brace, and are addressed on their parent by `$type` then `$name` (`parent[$type][$name]`).

- **Parsed Output**: Addressed by `$type` then `$name` into a single object (`{ dimension: { status: { $type: "dimension", $name: "status", ... } } }`).
- **Cardinality Violation**: Re-declaring `view: foo {} view: foo {}` without `+` violates singularity, emitting `LookMLCardinalityError` (`DUPLICATE_SINGULAR_PROPERTY`) and leaving `view.foo` as an un-unwrapped array `[ {...}, {...} ]`.

**Parameters by Scope:**
- **Top-level / `model`**: `explore`, `view`, `datagroup`, `access_grant`, `map_layer`, `named_value_format`, `test`
- **`manifest`**: `constant`, `remote_dependency`, `application`
- **`local_dependency` / `remote_dependency`**: `override_constant`
- **`explore`**: `join`, `aggregate_table`, `query`
- **`view`**: `dimension`, `dimension_group`, `measure`, `filter`, `parameter`, `set`
- **`derived_table`**: `explore_source`
- **`explore_source`**: `column` (`singular_permissive`), `derived_column` (`singular_permissive`)
- **`test`**: `explore_source`, `assert`

---

### 2. Repeated Named Objects / Refinements (`type: +name { ... }`)

Refinement declarations use a `+`-prefixed identifier (`+$name`, stored on the object as `$name: "+name"`) between the colon and the opening brace. Because the same named object can be refined multiple times in the same file or across included files (`view: +orders { ... } view: +orders { ... }`), refinements have `repeated` cardinality.

- **Parsed Output**: Addressed by `$type` then `+$name` into an **Array of Objects** (`{ view: { "+orders": [ { $type: "view", $name: "+orders", ... } ] } }`), even when refined only once.
- **Transformation (`applyExtensionsRefinements`)**: Iterates through the `parent[$type]["+name"]` array in order and deep-merges each refinement onto the base `parent[$type]["name"]` object.
- **Transformation (`removeAbstract`)**: Enabled by default whenever `extensions` (`applyExtensionsRefinements`) is enabled in `parseFiles`. After refinements and extensions are applied in `project.model`, `removeAbstract` deletes all `+name` refinement keys (as well as abstract `extension: required` objects) from `project.model.<model>.view` and `project.model.<model>.explore` so the assembled model only contains concrete, resolved objects. The raw `parent[$type]["+name"]` arrays remain intact in `project.file` (and in `project.model` if `transformations: { removeAbstract: false }` or `extensions: false` is set).

**Parameters by Scope:**
- **Top-level / `model`**: `view` (`view: +name`), `explore` (`explore: +name`) *(child named objects inside a refined `view` or `explore` — such as `dimension: status`, `join: users`, `query: my_query`, `aggregate_table: my_rollup`, or `set: my_set` — are written without `+` and deep-merged by name when the parent refinement is applied).*

---

### 3. Singular Unnamed Objects (`type: { ... }`)

Curly-brace objects without a `$name` identifier after the colon that can only appear **once** per parent scope.

- **Parsed Output**: Addressed by `$type` into a single object (`{ derived_table: { $type: "derived_table", ... } }`).
- **Refinement Behavior**: Recursively merged property-by-property (`merge(baseVal, addVal)`).

**Parameters by Scope:**
- **Top-level**: `manifest`
- **`manifest`**: `localization_settings`
- **`application`**: `mount_points`, `entitlements`
- **`explore`**: `always_filter`, `conditionally_filter`
- **`view`**: `derived_table`
- **`derived_table`**: `create_process`
- **`aggregate_table`**: `query`, `materialization`
- **`field` (`dimension`, `measure`, `filter`, `parameter`)**: `case`

---

### 4. Repeated Unnamed Objects (`type: { ... }`)

Curly-brace objects without a `$name` identifier after the colon that can be declared **multiple times** in the same parent scope.

- **Parsed Output**: Addressed by `$type` into an **Array of Objects** (`{ link: [ { $type: "link", ... }, { $type: "link", ... } ] }`), even when declared only once.
- **Refinement Behavior**:
  - Driven directly by `cardinality: 'repeated'` in `LOOKML_SCHEMA`: refining a parent object **concatenates (`baseVal.concat(addVal)`)** the refinement's array onto the base array (including nested repeated objects inside singular unnamed objects, such as `case.when` or `explore_source.sort`).

**Parameters by Scope:**
- **`manifest`**: `local_dependency`
- **`explore`**: `access_filter`
- **`field` (`dimension`, `measure`, `filter`, `parameter`)**: `link`, `action`, `allowed_value`
- **`explore_source`**: `bind_filters`, `bind_service`, `sort` *(legacy object form of `sorts`)*
- **`case`**: `when`
- **`action`**: `param`, `user_attribute_param`, `form_param`
- **`form_param`**: `option`

---

### 5. Repeated Maps (`type: [key: value, ...]`)

Bracketed `key: value` pairs (`mapElement` in the PEG grammar, also referred to as `maplists` in the v6.3 changelog). Each `[key: value, ...]` map is parsed into a JS object `{ key: value, ... }`, and because these declarations have `cardinality: 'repeated'`, they are addressed by `$type` into an array of map objects (`{ filters: [ { ... } ] }`).

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
- **Refinement Behavior**: **Additive (`concat`)**, driven by `cardinality: 'repeated'` in `LOOKML_SCHEMA`. Preserving each declaration object in the array keeps `$strings` and `positions` intact for code generation (`generate`), while consumers wanting Looker's effective key-value map can merge the array elements by key (e.g., `Object.assign({}, ...measure.filters)`).

**Parameters by Scope:**
- **`field` (`measure`)**: `filters`
- **`always_filter`**: `filters`
- **`conditionally_filter`**: `filters`
- **`explore_source`**: `filters`, `dev_filters`, `sorts`
- **`query`**: `filters`, `sorts`

---

### 6. Singular Lists (`type: [val1, val2, ...]`)

Bracketed comma-separated lists of strings or unquoted atoms (`listElement` / `emptyListElement` in the PEG grammar) with `cardinality: 'singular'`.

- **Parsed Output**: Addressed by `$type` into a single flat array of primitives: `{ timeframes: ["val1", "val2"] }`.
- **Refinement Behavior**:
  - **Standard list parameters**: Refining **replaces** the base array (`addVal` overwrites `baseVal`). For example, refining `timeframes: [raw, date]` with `timeframes: [raw, date, month, year]` yields `["raw", "date", "month", "year"]`.
  - **Special Case (`extends`, marked `extension: 'special'` in `LOOKML_SCHEMA`)**: On `+` refinements, `extends` is deduplicated-additive rather than replaced when `applyExtensionsRefinements` merges refinements onto the base object.

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
- **`entitlements`**: `core_api_methods`, `external_api_urls`, `oauth2_urls`, `global_user_attributes`, `scoped_user_attributes`, `new_window_external_urls`

---

### 7. Repeated Primitives

Primitive declarations that can appear multiple times in the same scope (`type: 'string', cardinality: 'repeated'`).

- **Parsed Output**: Addressed by `$type` into an array of strings (`{ include: ["/views/*.view.lkml", ...] }`), even when declared only once.
- **Refinement Behavior**:
  - **Default**: Like other `cardinality: 'repeated'` properties, repeated primitives are concatenated (`baseVal.concat(addVal)`) by default unless overridden via `extension: 'replace'` in `LOOKML_SCHEMA`.
  - **`sql_step` (`extension: 'replace'`)**: Because `create_process` defines an ordered procedural sequence of DDL/DML steps (`CREATE TABLE ...`, `INSERT INTO ...`), refining `create_process` with new `sql_step` declarations **replaces** the base `sql_step` array rather than concatenating onto it (matching Looker's PDT compiler).
  - **`include`**: Resolved at the file/model level during model assembly (`assembleModels`) prior to extension and refinement merging.
- **Parameters by Scope**:
  - **Top-level / `model` / `view` / `explore` files**: `include`
  - **`create_process`**: `sql_step`

---

### 8. Singular Primitives

Single-valued primitive properties (`cardinality: 'singular'`), addressed by `$type` into a primitive value (`{ hidden: true, type: "count", sql: " ${TABLE}.id " }`). Re-declaring any of these within the same scope triggers a `LookMLCardinalityError`, and refining them overwrites the base value.

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
