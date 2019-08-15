# Changelog

⚡ indicates a breaking change

- v2
	- ⚡ removed the `_name` property on objects.
	- Added a `_type` property on all objects
	- As a replacement for `_name`, added multiple `_<type>: <name>` properties (e.g. `{ ... , "_type": "join", "_join": "users", "_explore": "orders"}` )
	- Added a `_n` property which gives the lexical position of the object in the original text
- v2.2
	- The return now contains model objects which have recursively included other referenced files' contents
	- In interactive mode, the output is slightly more compact
- v3.0
	- ⚡ yesno fields are now mapped to true/false
	- Added conditional comment feature. The CLI flag is --conditional-comment=FOO or -c FOO
- v4.0
	- ⚡ The grammar now recognizes attributes whose type starts with 'expr' as doubleSemiBlock-valued. If you were previously using such a naming convention in conditional-comment based LookML, you will need to use a new naming convention, or use doubleSemiBlock syntax. E.g. `expression_custom_filter: ${field} ;;`
	- ⚡ The grammar no longer ignores leading whitespace in a doubleSemiBlock.
- v5.0
	- ⚡⚡⚡ For simplicity and reduced output size, the output no longer includes the array version of collections of named objects. Only the object version, keyed by name, is returned.
- v5.1
	- Added the ability to control the output format of the files collection
- v6.0
	- ⚡ The _file_rel property has changed slightly and no longer includes the file's extension
	- Added a 'none' file output mode for use cases that only care about assembled models
	- Added support for subdirectories and corresponding include statements (Does not yet support remote imports)