# Draw IO Markdown Converter

Convert a DrawIO export XML file to a markdown.

## How to run

* npm install
* npm start
* Export your DrawIO diagram as `xml` file
* `open http://localhost:8000/index.html`
* Choose the file to convert

## Feature

The following are the data in the diagram which will be exported:

* `note` attribute at the diagram level
* `tooltip` attribute of each `cell`.
* the diagram PNG.
* the tab name

Only one `.md` file is generated, the images are base64 encoded.

### Ordering

If you want to tune the sequence of each section, add `order` attribute to the `cell`, the valid value is dotted number, for example:

* 1
* 1.1
* 3.2.1

Any `.` will add an indentation to the original markdown title, for example, if your original markdown content on a cell with `order=1.1` is:

```
## Some title

Some content.
```

The generated markdown will be:

```
### Some title

Some content.
```
