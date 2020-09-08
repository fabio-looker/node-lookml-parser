# Version 7 release notes

## High-level themes

- Capturing whitespace and comments to enable round-tripping, with the option to mutate
- Abstraction to support in-browser use
- Metadata tweaks for reduced collisions and improved file representation

## Breaking changes

- All interfaces
	- All "added" metadata is now prefixed with `$` instead of with `_` to reduce the possibility of clashes, since `_` is a common character in LookML names
	- An object's own name is now always listed under `$name` (instead of under a property that varies according to the object's type, like `$view`).
		- The names of its parent objects are still accessed with a type-based property name. So, from within a dimension, `$view` is still the way to get the name of the view that it belongs to
	- [TODO] The default file output mode is now `by-name` instead of `by-type`
- Javascript API only
	- [TODO] The parseFiles function no longer bundles filesystem operations. You must now pass in functions that implement `listFiles(fileGlob)->filePathAray` and `readFile(filePath)->fileContents`. Functions that imlement the existing functionality are provided in `nodejsListFiles` and `nodejsReadFile`

## New Functionality

- Unassembled collections (files, objects within files, and objects from LookML strings) now contain an added `$strings` property, which can be used for whitespace and comment preserving mutations/roundtrips
- [TODO] Assembled models now implement exends and refinements 
- [TODO] The Javascript API is now usable in-browser


## Bug Fixes

- The parser no longer fails on a file/string which contains only comments with no trailing linebreak (issue #6)
