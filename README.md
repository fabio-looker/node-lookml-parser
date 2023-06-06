
# CLI Usage

```
npm install -g lookml-parser
git clone <your-lookml-repo>
cd <your-lookml-repo>
lookml-parser --input="*.{view,model}.lkml" --whitespace=2 >> output.json
```

## CLI with REPL

```
lookml-parser --interactive
```

## CLI tranformation flags

```
lookml-parser --transform=sxf
```

| Flag | Description |
|---|---|
| s | Remove whitespace information (`$strings` property) |
| x | Apply extensions and refinements
| f | Drop repetitive file metadata (`$file_rel`, `$file_type`, `$file_name`) |

# Node API

```
const lookmlParser = require('lookml-parser')

lookmlParser.parse("view: foo{}")
lookmlParser.parseFiles({
		source:  "*.{view,model,explore}.lkml",
		fileOutput: "by-type" // or "array" or "by-name"
		transformations: {},	
		globOptions: {},
		readFileOptions: {encoding:"utf-8"},
		readFileConcurrency: 4,
		console: console
	})
```

# Output & Features

At the moment, parseFiles outputs a collection of files, each with their
own parsed contents, as well as models resulting from following `include`s from model files.

The collection of files is an object by default, keyed by type, then by name, but can be requested as
either an array or an object keyed by the name of the file including type.

## Conditional Comments
If you want to leverage LookML syntax to embed arbitrary other markup/objects that would
be rejected by the native IDE, the CLI and parseFiles function now allow this
 with conditional comments:

```
view: foo {
	# PARSE-ME!
	# owner: "Fabio"
	# version: {major:1 minor:4 date:"2018-01-01"}
	dimension: bar {}
}

> lookml-parser --conditional-comment="PARSE-ME!"
```

## Project Imports

The parseFiles method and CLI will resolve any include statements of the style "//project_foo/..." as "/imported_projects/project_foo/...". Therefore, the parser supports project imports, assuming you have previously copied/cloned the remote project to the appropriate location ahead of invoking the parser.
