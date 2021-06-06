const fs = require('fs');
let file = '';
file = 'C:/test/1.pdf';
file = 'D:/book/ky mon don giap - NGUYEN MANH BAO.pdf';
//file = 'D:/book/Nghìn xưa văn hiến 1975 tập 1.pdf';
let dataBuffer = fs.readFileSync(file);

const Canvas = require("canvas");
function NodeCanvasFactory() { }
NodeCanvasFactory.prototype = {
    create: function NodeCanvasFactory_create(width, height) {
        //assert(width > 0 && height > 0, "Invalid canvas size");
        const canvas = Canvas.createCanvas(width, height);
        const context = canvas.getContext("2d");
        return {
            canvas,
            context,
        };
    },

    reset: function NodeCanvasFactory_reset(canvasAndContext, width, height) {
        //assert(canvasAndContext.canvas, "Canvas is not specified");
        assert(width > 0 && height > 0, "Invalid canvas size");
        canvasAndContext.canvas.width = width;
        canvasAndContext.canvas.height = height;
    },

    destroy: function NodeCanvasFactory_destroy(canvasAndContext) {
        //assert(canvasAndContext.canvas, "Canvas is not specified");
        // Zeroing the width and height cause Firefox to release graphics
        // resources immediately, which can greatly reduce memory consumption.
        canvasAndContext.canvas.width = 0;
        canvasAndContext.canvas.height = 0;
        canvasAndContext.canvas = null;
        canvasAndContext.context = null;
    },
};

function __getTextContentAsync(page) {
    //check documents https://mozilla.github.io/pdf.js/
    //ret.text = ret.text ? ret.text : "";

    //return page.getTextContent().then(function (content) {
    //    // Content contains lots of information about the text layout and
    //    // styles, but we need only strings at the moment
    //    const strings = content.items.map(function (item) {
    //        return item.str;
    //    });
    //    //console.log("## Text Content");
    //    const s = strings.join(" ");
    //    //console.log(s);
    //    return s;
    //});

    return page.getTextContent({
        //replaces all occurrences of whitespace with standard spaces (0x20). The default value is `false`.
        normalizeWhitespace: false,
        //do not attempt to combine same line TextItem's. The default value is `false`.
        disableCombineTextItems: false
    }).then(function (textContent) {
        let lastY, text = '';
        //https://github.com/mozilla/pdf.js/issues/8963
        //https://github.com/mozilla/pdf.js/issues/2140
        //https://gist.github.com/hubgit/600ec0c224481e910d2a0f883a7b98e3
        //https://gist.github.com/hubgit/600ec0c224481e910d2a0f883a7b98e3
        for (let item of textContent.items) {
            if (lastY == item.transform[5] || !lastY) {
                text += item.str;
            }
            else {
                text += '\n' + item.str;
            }
            lastY = item.transform[5];
        }
        //let strings = textContent.items.map(item => item.str);
        //let text = strings.join("\n");
        //text = text.replace(/[ ]+/ig," ");
        //ret.text = `${ret.text} ${text} \n\n`;
        return text;
    });
}

function __roundInteger(numFloat) { return Number(numFloat.toString().split('.')[0]) + 1; }

function __getTextInfoAsync(pageNumber, page, viewport) {
    //check documents https://mozilla.github.io/pdf.js/
    //ret.text = ret.text ? ret.text : "";

    //return page.getTextContent().then(function (content) {
    //    // Content contains lots of information about the text layout and
    //    // styles, but we need only strings at the moment
    //    const strings = content.items.map(function (item) {
    //        return item.str;
    //    });
    //    //console.log("## Text Content");
    //    const s = strings.join(" ");
    //    //console.log(s);
    //    return s;
    //});

    const pageHeight = viewport.height;
    const rotation = viewport.rotation;
    console.log(pageHeight, rotation);

    return page.getTextContent({
        //replaces all occurrences of whitespace with standard spaces (0x20). The default value is `false`.
        normalizeWhitespace: false,
        //do not attempt to combine same line TextItem's. The default value is `false`.
        disableCombineTextItems: false
    }).then(function (textContent) {
        let line = [], lineY = 0, lines = [];
        for (var i = 0; i < textContent.items.length; i++) {
            const item = textContent.items[i];

            const tm = item.transform;
            let x = tm[4];
            let y = pageHeight - tm[5];
            if (rotation === 90) {
                x = tm[5];
                y = tm[4];
            }
            // see https://github.com/mozilla/pdf.js/issues/8276
            const height = Math.sqrt(tm[2] * tm[2] + tm[3] * tm[3]);

            const text = {
                x: __roundInteger(x),
                y: __roundInteger(y),
                str: item.str,
                dir: item.dir,
                width: __roundInteger(item.width),
                height: __roundInteger(height),
                fontName: item.fontName
            };

            if (i == 0) lineY = y;
            if (lineY == y) {
                line.push(text);
            } else {
                lines.push(JSON.parse(JSON.stringify(line)));
                lineY = y;
                line = [];
                line.push(text);
            }
        };
        return {
            page: {
                num: pageNumber,
                scale: viewport.scale,
                rotation: viewport.rotation,
                offsetX: viewport.offsetX,
                offsetY: viewport.offsetY,
                width: viewport.width,
                height: viewport.height
            },
            lines: lines
        };

        //let lastY, text = '';
        ////https://github.com/mozilla/pdf.js/issues/8963
        ////https://github.com/mozilla/pdf.js/issues/2140
        ////https://gist.github.com/hubgit/600ec0c224481e910d2a0f883a7b98e3
        ////https://gist.github.com/hubgit/600ec0c224481e910d2a0f883a7b98e3
        //for (let item of textContent.items) {
        //    if (lastY == item.transform[5] || !lastY) {
        //        text += item.str;
        //    }
        //    else {
        //        text += '\n' + item.str;
        //    }
        //    lastY = item.transform[5];
        //}
        ////let strings = textContent.items.map(item => item.str);
        ////let text = strings.join("\n");
        ////text = text.replace(/[ ]+/ig," ");
        ////ret.text = `${ret.text} ${text} \n\n`;
        //return text;
    });
}

let PDFJS;
async function __pdfBuffer(dataBuffer) {
    return new Promise((resolve, reject) => {
        let ret = {
            num_pages: 0,
            num_render: 0,
            info: null,
            metadata: null,
            text: "",
            version: null
        };

        PDFJS = PDFJS ? PDFJS : require('./pdfjs2.9.359/legacy/build/pdf.js');
        ret.version = PDFJS.version;

        // Disable workers to avoid yet another cross-origin issue (workers need
        // the URL of the script to be loaded, and dynamically loading a cross-origin
        // script does not work).
        PDFJS.disableWorker = true;
        // Some PDFs need external cmaps.
        PDFJS.cMapUrl = "./pdfjs2.9.359/cmaps/";
        // set cMapPacked = true to ignore Warning: Ignoring invalid character "121" in hex string
        PDFJS.cMapPacked = true
        //const loadingTask = PDFJS.getDocument({ data: dataBuffer });
        const loadingTask = PDFJS.getDocument(file);
        //const loadingTask = PDFJS.getDocument(dataBuffer, cMapUrl: CMAP_URL, cMapPacked: CMAP_PACKED);
        loadingTask.promise.then(async doc => {
            let num_pages = doc.numPages || 0;
            ret.num_pages = num_pages;

            const metaData = await doc.getMetadata();
            //console.log(metaData);

            ret.info = metaData ? metaData.info : null;
            ret.metadata = metaData ? metaData.metadata : null;

            ret.text = "";

            const ps = [];
            const pageNumber = 1;
            ps.push(doc.getPage(pageNumber));

            const scale = 2.0;// 1.0 1.5 2.0
            const arr = await Promise.all(ps);
            const page = arr[0];
            //console.log(page);

            const viewport = page.getViewport({ scale: scale });
            const height = viewport.height;
            const width = viewport.width;
            console.log(width, height);

            let pageText = await __getTextContentAsync(page);
            fs.writeFileSync("1.txt", pageText);
            //ret.text = `${ret.text}\n\n${pageText}`;
            //console.log(pageText);

            let jsonLines = await __getTextInfoAsync(pageNumber, page, viewport);
            //console.log(infoTexts);
            fs.writeFileSync("1.json", JSON.stringify(jsonLines));

            const canvasFactory = new NodeCanvasFactory();
            const canvasAndContext = canvasFactory.create(width, height);
            const renderContext = { canvasContext: canvasAndContext.context, viewport, canvasFactory };

            await page.render(renderContext).promise;

            const bufImage = canvasAndContext.canvas.toBuffer();
            var err = fs.writeFileSync("1.png", bufImage, 'binary');
            //console.log(err);
            canvasFactory.destroy(canvasAndContext);

            doc.destroy();
            resolve(ret);
        });
    });
}

__pdfBuffer(dataBuffer).then(function (data) {

    // number of pages
    console.log(data.num_pages);
    // number of rendered pages
    //console.log(data.num_render);
    // PDF info
    console.log(data.info);
    // PDF metadata
    //console.log(data.metadata);
    // PDF.js version
    console.log(data.version);
    // PDF text
    //console.log(data.text);
    //fs.writeFileSync('1.txt', data.text);
})