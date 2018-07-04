(function(document) {
    var TITLE_PATTERN = /#+\s+.+/i

    // Program starts here. Creates a sample graph in the
    // DOM node with the specified ID. This function is invoked
    // from the onLoad event handler of the document (see below).
    function exportMarkdown(filename, xml)
    {
        var x2js = new X2JS();
        var jsonObj = x2js.xml_str2json(xml);
        var diagramXmls = jsonObj.mxfile.diagram || [];
        var jsonArray = diagramXmls.map(diagram => {
            // diagram name
            var name = diagram._name;
            var data = diagram.__text;
            data = atob(data);
            data = bytesToString(pako.inflateRaw(data));
            var xml = decodeURIComponent(data);
            var graph = parseGraph(xml);
            var note = getNote(graph);
            var content = getContent(graph);
            
            return {
                xml: xml,
                name: name,
                note: note,
                content: content
            }
        });

        var request = {
            filename: filename,
            diagrams: jsonArray
        }
        
        document.getElementById("data").value = JSON.stringify(request);
        // it won't work if using getElementById
        document.exportForm.submit(function(evt){ evt.preventDefault(); });
    };

    function parseGraph(xml) {
        var doc = mxUtils.parseXml(xml);
        var codec = new mxCodec(doc);
        var graph = new mxGraph(document.createElement("div"));
        codec.decode(doc.documentElement, graph.getModel());
        return graph;
    }
    
    function getNote(graph) {
        if (!(graph && graph.model && graph.model.root)) {
            return "";
        }

        var root = graph.model.root;
        var rootValueObj = graph.model.root.value;
        if (rootValueObj) {
            var attrs = rootValueObj.attributes || {};
            var note = attrs.note ? attrs.note.value : "";

            return "\n" + note;
        }
        return "";
    }

    function getContent(graph) {
        if (!(graph && graph.model && graph.model.root)) return "";

        var root = graph.model.root;			
        if (!(root.children && root.children.length > 0)) return "";

        var withOrder = [];
        var cells = root.children[0].children;
        for (var i = 0; i < cells.length; i++) {
            var cell = cells[i];
            if (!cell.value) continue;
            if (!cell.value.attributes) continue;

            var attrs = cell.value.attributes;
            var order = attrs.order ? attrs.order.value : "999";
            var label = attrs.label ? attrs.label.value : null;
            var tooltip = attrs.tooltip ? attrs.tooltip.value : null;
            if (label && tooltip) {
                withOrder.push({order: order , content: '\n## ' + label + '\n' + tooltip + '\n'});
            }
        }

        // sort by `order`
        return withOrder
            .sort((a, b) => sortByOrder(a.order, b.order))
            .map(obj => {
                var order = obj.order || "999";
                var level = order.split(".").length - 1;
                // one level deeper, add one '#'
                var indent = "#".repeat(level);
                if (level > 0) {
                    var newline = obj.content.split("\n")
                        .map(line => {
                            if (TITLE_PATTERN.test(line)) {
                                return indent + line;
                            } else {
                                return line;
                            }
                        })
                        .join("\n");
                    obj.content = newline;
                }
                return obj;
            })
            .map(obj => obj.content)
            .join("\n");
    }
    
    function sortByOrder(a, b) {
        var arrayA = a.split(".");
        var arrayB = b.split(".");
        var minSize = arrayA.length > arrayB.length ? arrayB.length : arrayA.length;

        for (var i=0; i<minSize; i++) {
            if (arrayA[i] == arrayB[i]) {
                continue;
            } else {
                return parseInt(arrayA[i]) - parseInt(arrayB[i]);
            }
        }
        return minSize == arrayA.length ? -1 : 1;
    }

    function bytesToString(arr) {
        var str = '';
        for (var i = 0; i < arr.length; i++)
        {
            str += String.fromCharCode(arr[i]);
        }
        return str;
    }

    this.fileChose = function(){
        var fileInput = document.getElementById('fileInput');
        var file = fileInput.files[0];
        var textType = /text.*/;

        if (file.type.match(textType)) {
            var reader = new FileReader();

            reader.onload = function(e) {
                exportMarkdown(file.name, reader.result);
            }

            reader.readAsText(file);	
        } else {
            console.error("File not supported!");
        }
    }
})(document);
