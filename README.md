
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
lookml-parser --transform=fps
```

| Flag | Description |
|---|---|
| f | Drop repetitive file metadata (`$file_rel`, `$file_type`, `$file_name`) |
| p | Add position data |
| s | Remove whitespace information (`$strings` property) |

# Node API

```
const lookmlParser = require('lookml-parser')

const lookml = lookmlParser.parse("view: foo{}")
const positions = lookmlParser.getPositions(lookml)

let project = lookmlParser.parseFiles({
		source:  "*.{view,model,explore}.lkml",
		fileOutput: "by-name" // or "array" or "by-type",	
		globOptions: {},
		readFileOptions: {encoding:"utf-8"},
		readFileConcurrency: 4,
		console: console
	})

transformations.addPositions(project)

```

# Output & Features

parseFiles outputs a collection of files, each with their
own parsed contents, as well as models resulting from following `include`s from model files.

The collection of files is an object by file name, but can be requested in other formats.

If position data is requested, it is added under a separate top-level property named `positions`,
containing separate sub entries for `file` and `model`. Each node in the tree for which position data
is available will have a `$p` property with the data for that node. In the `file` section, the property
contains an array consisting of [start line, start character, end line, end character]. In the `model`
section the property contains an array consisting of [file index, start line, start character, end line, end character].
In this context, the file index refers to an entry in the the model's `$file_path` array.

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

## LookML Dashboard support

Since LookML Dashboards are actually YAML, `lookml-parser` does not handle parsing them. However, this module accepts `js-yaml` as an optional dependency. If you install `js-yaml`, `lookml-parser` will use it to parse LookML dashboards and will include the dashboards into any including models. To use this functionality, make sure to also specify an `input` argument, as the default input pattern does not include dashboard files.

```
npm install -g lookml-parser
npm install -g js-yaml
lookml-parser --interactive --file-output=by-name --input="{*.,}{manifest,model,view,explore,dashboard}.{lkml,lookml}"
```
