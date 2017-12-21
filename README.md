
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

# Output

At the moment, parseFiles outputs a collection of files, each with their 
own parsed contents.

In the future, these file records may be merged into consolidated objects.
