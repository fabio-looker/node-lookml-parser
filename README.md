
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
		fileOutput: "by-type" // or "array" or "by-name"
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

