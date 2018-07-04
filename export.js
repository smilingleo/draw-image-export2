const express = require('express');
const bodyParser = require('body-parser');
const compression = require('compression');
const puppeteer = require('puppeteer');

const PORT = process.env.PORT || 8000

const app = express();

//Max request size is 10 MB
app.use(bodyParser.urlencoded({ extended: false, limit: '10mb'}));
app.use(bodyParser.json({ limit: '10mb' }));

app.use(compression({
    threshold: 10,
}));

app.use(express.static('public'));

const exportFn = async (xml) => {
	const browser = await puppeteer.launch({
		headless: true,
		args: ['--disable-gpu', '--no-sandbox', '--disable-setuid-sandbox']
	});

	// Workaround for timeouts/zombies is to kill after 30 secs
	setTimeout(function()
	{
		browser.close();
	}, 30000);
	
	console.log("creating new page");
	const page = await browser.newPage();
	console.log("created new page");

	console.log("going to export3");
	await page.goto('https://www.draw.io/export3.html', {waitUntil: 'networkidle0'});
	console.log("went to export3");

	const result = await page.evaluate((body) => {
			return render({
				xml: body.xml,
				format: body.format,
				w: body.w,
				h: body.h,
				border: body.border || 0,
				bg: body.bg,
				"from": body["from"],
				to: body.to,
				scale: body.scale || 1
			});
		}, {
			xml: xml,
			format: "png"
		});
	
	console.log("page evaluated.");
	
	//default timeout is 30000 (30 sec)
	await page.waitForSelector('#LoadingComplete');
	console.log("selector found.");
	
	var bounds = await page.mainFrame().$eval('#LoadingComplete', div => div.getAttribute('bounds'));

	if (bounds != null) {
		bounds = JSON.parse(bounds);

		//Chrome generates Pdf files larger than requested pixels size and requires scaling
		var fixingScale = 0.959;

		var w = Math.ceil(bounds.width * fixingScale);
		var h = Math.ceil(bounds.height * fixingScale);

		page.setViewport({width: w, height: h});

		pdfOptions = {
			printBackground: true,
			width: w + 'px',
			height: (h + 1) + 'px', //the extra pixel to prevent adding an extra empty page
			margin: {top: '0px', bottom: '0px', left: '0px', right: '0px'}
		}
	}	  
	
	var data = await page.screenshot({
		omitBackground: true,	
		type: 'png',
		fullPage: true
	});
	return data.toString('base64');
}

app.post('/markdown-exporter', async (req, res) => {
	var dataStr = req.body.data || "{}";
	var reqJson = JSON.parse(dataStr);
	var filename = reqJson.filename || "markdown.md";
	if (!filename.endsWith(".md")) {
		filename = filename.substr(0, filename.lastIndexOf(".")) + ".md";
	}
	var diagrams = reqJson.diagrams || [];
	
	console.log(`exporting for ${filename}`);

	var markdowns = diagrams.map(async (diagram) => {
		var imgStr = await exportFn(diagram.xml);
		console.log(`exported diagram: ${diagram.name}`);
		var section = `\n# ${diagram.name}\n<img src="data:image/png;base64,${imgStr}" />\n\n${diagram.note}\n${diagram.content}\n`;
		return section;
	})
	
	Promise.all(markdowns)
		.then(values => {
			var fileContent = values.join("\n");
			res.header('Content-type', 'text/plain');
			res.header('Content-disposition', `attachment; filename="${filename}"`);
			res.header("Content-Length", fileContent.length);
			res.header("Access-Control-Allow-Origin", "*");
		
			res.end(fileContent);
		})
});

app.listen(PORT, function () 
{
  console.log(`draw.io export server listening on port ${PORT}...`)
});