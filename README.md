# lookml-parser

Parse, interpret, and generate LookML files and multi-file projects.

## Table of Contents
- [CLI Usage](#cli-usage)
  - [CLI Flags](#cli-flags)
- [Javascript API](#javascript-api)
  - [Browser & Bundler Usage](#browser--bundler-usage)
- [Feature Matrix](#feature-matrix)
- [Output & Features](#output--features)
  - [$strings and Code Generation (`generate`)](#strings-and-code-generation-generate)
  - [Raw PEG AST (`parseAst` / `ast: true`)](#raw-peg-ast-parseast--ast-true)
  - [Position Metadata](#position-metadata)
  - [Conditional Comments](#conditional-comments)
  - [Project Imports & Constants](#project-imports--constants)
  - [LookML Schema, Cardinality & Validation](#lookml-schema-cardinality--validation)
  - [Validation Mode (`validationMode`)](#validation-mode-validationmode)
  - [Historical Git Mode (`gitRef` / `--git-ref`)](#historical-git-mode-gitref---git-ref)
  - [File-Level Caching (`cacheDir` / `--cache-dir`)](#file-level-caching-cachedir----cache-dir)
  - [LookML Dashboard Support](#lookml-dashboard-support)
- [Changelog](#changelog)

---

# CLI Usage


```bash
npm install -g lookml-parser
cd <your-lookml-repo>

# Basic parse to clean JSON
lookml-parser --input="*.{view,model}.lkml" --whitespace=2 >> output.json

# With strings metadata, and position data
lookml-parser --input="*.{view,model}.lkml" -s -p >> output.json

# With interactive REPL
lookml-parser --interactive
```

See the [feature matrix](#feature-matrix) for additional flags.
---

# Javascript API

```javascript
const lookmlParser = require('lookml-parser')

// 1. LookML string parse
const lookml = lookmlParser.parse("explore: foo { hidden:yes }")

// 2. Generate LookML from object
lookml.explore.foo.from = "my_view"
lookml.explore.foo.hidden = null // null or delete to omit
const generatedLookml = lookmlParser.generate(lookml)

// 3. Parse multi-file projects
const project = await lookmlParser.parseFiles({
	input: "*.{view,model,explore}.lkml",
	modelAssembly: true,
	extensions: true,
	strings: true,
	positions: false
})


// Raw un-wrapped parse (no post-processing)
const rawObj = lookmlParser.parseRaw("view: foo {}")

// Raw abstract syntax tree
const ast = lookmlParser.parseAst("view: foo {}")

// Manually apply transformations
lookmlParser.transformations.addPositions(project)
```

## Browser & Bundler Usage

`lookml-parser` can be used in browser environments via frontend bundlers such as Webpack.

### In-Memory Single File Parsing
```javascript
import lookmlParser from 'lookml-parser'

const result = lookmlParser.parse("view: foo { hidden: yes }")
```

### In-Memory Multi-File Project Parsing
For browser environments or sandboxes without Node filesystem access, pass an array of file objects containing `path` and `content` properties directly to `parseFiles`:

```javascript
import lookmlParser from 'lookml-parser'

const projectFiles = [
  { path: 'models/my_model.model.lkml', content: 'include: "/views/*.view.lkml"\nexplore: foo {}' },
  { path: 'views/foo.view.lkml', content: 'view: foo { sql_table_name: my_table ;; }' }
]

const project = await lookmlParser.parseFiles({
  input: projectFiles,
  modelAssembly: true,
  extensions: true
})
```

---

# Feature Matrix

| Feature | CLI Flag | `parseFiles` Option | `parse` Option | DIY Transformation |
| :--- | :--- | :--- | :--- | :--- |
| **Input Files / Pattern** | `-i`, `--input` | `input: string \| Array`<br>*(`source` supported for back-compat)* | N/A *(File level only)* | N/A |
| **Model Assembly (`include` resolution)** | `-m`, `--models`<br>*(on by default)* | `modelAssembly: boolean`<br>*(default: `true`)* | N/A *(File level only)* | `transformations.assembleModels(project, options)` |
| **Extensions & Refinements (`extends`, `+`)** | `-x`, `--extensions`<br>*(on by default)* | `extensions: boolean`<br>*(default: `true`)* | N/A *(File level only)* | `transformations.applyExtensionsRefinements(project)`<br>`transformations.removeAbstract(project)` |
| **Constant Interpolation (`@{...}`)** | `--constants`<br>*(off by default)* | `constants: boolean`<br>*(default: `false`)* | N/A *(File level only)* | `transformations.applyConstants(project)` |
| **LookML Strings Metadata (`$strings`)** | `-s`, `--strings`<br>*(**off** by default)* | `strings: boolean`<br>*(JS default: **`true`**)* | `strings: boolean`<br>*(JS default: **`true`**)* | `transformations.dropStrings(project)` |
| **Line/Position Index (`positions`)** | `-p`, `--positions`<br>*(off by default)* | `positions: boolean`<br>*(default: `false`)* | `positions: boolean`<br>*(default: `false`)* | `transformations.addPositions(project, options)` |
| **Raw PEG AST (`$ast`)** | `-a`, `--ast`<br>*(off by default)* | `ast: boolean`<br>*(default: `false`)* | `ast: boolean`<br>*(default: `false`)* | N/A *(Parser option during parsing)* |
| **Conditional Comment Tagging** | `-c`, `--conditional-comment` | `conditionalCommentString: string` | `conditionalCommentString: string` | N/A *(Parser option during parsing)* |
| **Legacy File Metadata (e.g., `$file_type`)** | `-f`, `--legacy-file-metadata` | `legacyFileMetadata: boolean`<br>*(default: `false`)* | N/A *(File level only)* | `transformations.dropFileAdditional(project)` |
| **Validation Mode** | `--validation-mode` | `validationMode: boolean`<br>*(default: `false`)* | N/A | N/A |
| **Historical Git Mode** | `--git-ref` | `gitRef: string` | N/A *(File level only)* | N/A |
| **File-Level Caching** | `--cache-dir`, `--cache-max-mb` | `cache: boolean`<br>`cacheDir: string`<br>`cacheMaxMb: number` | N/A *(File level only)* | N/A |

---

# Output & Features

`parseFiles` outputs a collection of files, each with their own parsed contents, as well as assembled models resulting from following `include` statements from model files.

## `$strings` and Code Generation (`generate`)

When LookML is parsed with `strings: true`, `lookml-parser` attaches a path-mirrored `$strings` tree that captures exact syntax tokens, comments, and whitespace.

Calling `lookmlParser.generate(parsed)` uses `$strings` to re-generate LookML text. If you modify property values on the LookML object (e.g. changing `sql_table_name`, toggling `hidden`, setting a property to `null` or `delete`ing it to remove it, or adding new properties), `generate` outputs the updated LookML while preserving all surrounding comments and formatting.

If `strings: false` is set on `parseFiles` (and `positions: false`), the parser eagerly skips constructing `$strings` during AST traversal, reducing memory usage and speeding up execution.

## Raw PEG AST (`parseAst` / `ast: true`)

If you want to inspect or transform the raw PEG syntax tree directly, `lookmlParser.parseAst(string)` returns an AST structure with root type `'lookml'`. Passing `ast: true` or `-a` attaches the PEG AST as `$ast` on each parsed file object.

## Position Metadata

When `positions: true` is set (or `transformations.addPositions` is invoked), position data is added under a separate top-level property named `positions`, containing sub-entries for `file` and `model`. Each node for which position data is available will have a `$p` property with the location data for that node.

## Conditional Comments

If you want to leverage LookML syntax to embed arbitrary other markup/objects that would be rejected by the native IDE, the CLI and `parseFiles` allow this with conditional comments:

```lookml
view: foo {
	# PARSE-ME!
	# owner: "Alice"
	# version: {major:1 minor:4 date:"2018-01-01"}
	dimension: bar {
		label: "Bar!"
		#PARSE-ME! owner: "Bob"
	}
}
```

```bash
lookml-parser --conditional-comment="PARSE-ME!"
```

## Project Imports & Constants

The `parseFiles` method and CLI resolve any include statements of the style `"//project_foo/..."` as `"/imported_projects/project_foo/..."`. Therefore, the parser supports project imports, assuming you have previously copied or cloned the remote project to the appropriate location ahead of invoking the parser.

During model assembly (`modelAssembly: true`), constant references (`@{const_name}`) in declarations originating from an imported project are qualified with the imported project's prefix (`@{//project_foo/const_name}`) in the assembled `model` output so their originating project scope remains unambiguous.

When `constants: true` (or `--constants` in the CLI) is enabled, `transformations.applyConstants(project)` interpolates `@{...}` constant references in string values across `project.model` (including `override_constant` values configured on `local_dependency` and `remote_dependency` declarations in `manifest.lkml`).

## LookML Schema, Cardinality & Validation

After parsing, validation happens against a basic LookML schema. Properties are checked for disallowed repetition, value types, valid scope placement (`INVALID_PROPERTY_FOR_SCOPE`), and missing required properties. Validation surfaces errors but does not block results.

See the [LookML Constructs & Parser Representation Cheat Sheet](lookml-constructs-cheatsheet.md) for a complete reference on how each category of LookML syntax is represented in JavaScript/JSON, validated for cardinality, and merged across extensions and refinements.

## Validation Mode (`validationMode`)

For use cases where the primary need is validation without returning parsed LookML contents, pass `validationMode: true` in JS API options or `--validation-mode` in the CLI.

In Validation Mode:
- Parsed content objects (`model`, `view`, `explore`, `manifest`, ASTs) are omitted from the output.
- Output keys are strictly restricted to: `error` (critical top-level error if present), `errors` (accumulated non-critical errors), `info` (contains completion summary message), and `file`.
- Individual file entries under `project.file` omit file metadata and contain only `errors` or `error` if present, or `{}` if no errors were found.
- Combining `validationMode: true` with output-expanding options (such as `ast`, `positions`, `strings`, or `legacyFileMetadata`) will throw an error.

## Historical Git Mode (`gitRef` / `--git-ref`)

To parse a LookML project at a specific historical git commit, branch, or tag without modifying your working tree or checking out files:

```bash
# In the CLI
lookml-parser --git-ref=HEAD~1
lookml-parser --git-ref=main
```

```javascript
// In Javascript
const project = await lookmlParser.parseFiles({
  gitRef: 'main'
})
```

The parser uses Git plumbing (`git ls-tree` and `git cat-file --batch`) to discover and stream project files directly from the repository's object database in-memory.
 
## File-Level Caching (`cacheDir` / `--cache-dir`)

`lookml-parser` supports two-tier file-level caching to dramatically accelerate repeated parses in agentic workflows, developer tools, and CLI scripts:

- **JS API (In-Memory by Default)**: In JavaScript environments, in-memory caching is active by default (`cache: true`), speeding up repeated parses in long-running processes, servers, or in-browser file arrays. Pass `cache: false` to disable.
- **CLI (Opt-in via `--cache-dir`)**: For CLI commands, caching is enabled by passing `--cache-dir=<path>`. One-off CLI invocations without `--cache-dir` do not incur memory overhead or cache entries.
- **On-Disk Persistence**: Pass `--cache-dir=<path>` via the CLI or `cacheDir: string` in `parseFiles` to persist the cache to a JSON file on disk.
- **Two-Tier Invalidation**: Checks filesystem `mtime` and file `size` for sub-millisecond fast hits without reading file contents from disk. If timestamps differ (e.g. following git branch switches or `touch`), it falls back to SHA-256 content hashing to avoid false cache misses.
- **LRU Size Capping**: On-disk cache size is capped at 20 MB by default (`--cache-max-mb` or `cacheMaxMb`). When the threshold is exceeded, older entries are automatically evicted.
- **Options Fingerprinting**: Cache keys incorporate the active parser options (`strings`, `ast`, `conditionalCommentString`, and parser version), ensuring different configurations safely coexist.

```bash
# Persist file cache to .lookml-cache directory
lookml-parser --cache-dir=.lookml-cache --input="*.{view,model}.lkml"
```

```javascript
// In Javascript
const project = await lookmlParser.parseFiles({
  input: "*.{view,model}.lkml",
  cacheDir: ".lookml-cache",
  cacheMaxMb: 20
})
```

## LookML Dashboard Support

Since LookML Dashboards are actually YAML, `lookml-parser` accepts `js-yaml` as an optional peer dependency. If you install `js-yaml`, `lookml-parser` will parse LookML dashboards and include dashboards into any including models.

```bash
npm install -g lookml-parser
npm install -g js-yaml
lookml-parser --interactive --file-output=by-name --input="{*.,}{manifest,model,view,explore,dashboard}.{lkml,lookml}"
```

---

# Changelog

- [Changelog](changelog.md)
- [v8.0 Migration Guide](doc/v8-migration-guide.md)
