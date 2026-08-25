# v8.0 Migration Guide

This migration guide summarizes breaking changes and updated parameterization patterns between `lookml-parser` v7 and v8 for CLI usage and Node module API calls.

---

## CLI Parameterization Migration Guide

| Use Case | Legacy (v7) Invocation | New (v8) Invocation | Key Change / Notes |
| :--- | :--- | :--- | :--- |
| **Basic parsing (Clean JSON stdout)** | `lookml-parser -i "*.lkml"` | `lookml-parser -i "*.lkml"` | No change. JSON output omits `$strings` and legacy file metadata by default for cleaner stdout. |
| **Preserve `$strings` metadata** | `lookml-parser -i "*.lkml" -x ""` | `lookml-parser -i "*.lkml" -s`<br>*(or `--strings`)* | Replaces awkward `-x ""` workaround with concise, positive `-s` flag. |
| **Include legacy file metadata** (`$file_rel`, `$file_name`, `$file_type`) | Omitting `f` flag in `-x` | `lookml-parser -i "*.lkml" -f`<br>*(or `--legacy-file-metadata`)* | `-f` explicitly includes legacy redundant file fields. (`$file_path` is always preserved). |
| **Compute line positions index** | `lookml-parser -i "*.lkml" -x p` *(silently dropped `$strings`)* | `lookml-parser -i "*.lkml" -p`<br>*(or `--positions`)* | Flag `-p` enables position indexing without altering `$strings` setting. |

---

## Node Module API Migration Guide

| Use Case | Legacy (v7) Invocation | New (v8) Invocation | Key Change / Notes |
| :--- | :--- | :--- | :--- |
| **Omit `$strings` metadata** | `const project = await parseFiles({ source })`<br>`transformations.dropStrings(project)` | `const project = await parseFiles({`<br>`  source,`<br>`  strings: false`<br>`})` | Eagerly skips constructing `$strings` token arrays during AST traversal. |
| **Preserve legacy file metadata** (`$file_rel`, `$file_name`, `$file_type`) | Default behavior in v7 | `const project = await parseFiles({`<br>`  input,`<br>`  legacyFileMetadata: true`<br>`})` | `legacyFileMetadata` now defaults to `false` in v8 for both Node and CLI. Pass `legacyFileMetadata: true` if legacy fields are needed. |
| **Include line positions index** | `parseFiles({`<br>`  source,`<br>`  transformations: { addPositions: true }`<br>`})` | `parseFiles({`<br>`  source,`<br>`  positions: true`<br>`})` | Clean top-level feature option (`positions: true`). |
| **Standalone code generation import** | `require('lookml-parser/lib/generate/index.js')` | `const { generate } = require('lookml-parser')` | `generate` is now exposed as a primary top-level export on `lookml-parser`. |

---

> [!NOTE]
> **Backward Compatibility**: Existing nested configurations using `transformations: { applyExtensionsRefinements, removeAbstract, addPositions }`, `dropStrings`, or `dropFileAdditional` remain supported on `parseFiles`.

---

## $strings format

The $strings format has been substanstially redesigned. Use cases that relied on $strings will need a new implementation.

---

## Miscellaneous

- Properties which are known to be repeatable (e.g., model>include, dimension>link) now always output as arrays. However, since these parameters often changed unpredictably between leaf values and arrays, most consumers will already handle this behavior.
- Conditional comments' contents must now individually be valid LookML 
