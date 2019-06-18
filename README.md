
# CLI Usage

```
npm install -g lookml-parser
git clone <your-lookml-repo>
cd <your-lookml-repo>
lookml-parser --input="*.{view,model}.lkml" --whitespace=2 >> output.json
```

# CLI / REPL

```
lookml-parser --interactive
```


# Node API

```
const lookmlParser = require('lookml-parser')

lookmlParser.parse("view: foo{}")
lookmlParser.parseFiles({
		source:  "*.{view,model,explore}.lkml",
		globOptions: {},
		readFileOptions: {encoding:"utf-8"},
		readFileConcurrency: 4,
		console: console
	})
```

# Output & Features

At the moment, parseFiles outputs a collection of files, each with their
own parsed contents, as well as models resulting from following `include`s from model files.

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

# Changelog

- v2
	- Breaking change: removed the `_name` property on objects.
	- Added a `_type` property on all objects
	- As a replacement for `_name`, added multiple `_<type>: <name>` properties (e.g. `{ ... , "_type": "join", "_join": "users", "_explore": "orders"}` )
	- Added a `_n` property which gives the lexical position of the object in the original text
- v2.2
	- The return now contains model objects which have recursively included other referenced files' contents
	- In interactive mode, the output is slightly more compact
- v3.0
	- Breaking change: yesno fields are now mapped to true/false
	- Added conditional comment feature. The CLI flag is --conditional-comment=FOO or -c FOO
- v4.0
	- Breaking change: The grammar now recognizes attributes whose type starts with 'expr' as doubleSemiBlock-valued. If you were previously using such a naming convention in conditional-comment based LookML, you will need to use a new naming convention, or use doubleSemiBlock syntax. E.g. `expression_custom_filter: ${field} ;;`
	- Breaking change: The grammar no longer ignores leading whitespace in a doubleSemiBlock. E.g. `sql_table_name: foo ;;` now has a valye of ` foo ` rather than `foo `