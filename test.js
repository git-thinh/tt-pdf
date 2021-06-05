const fs = require('fs');
let file = '';
file = 'C:/test/1.pdf';
//file = 'D:/book/ky mon don giap - NGUYEN MANH BAO.pdf';
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
        assert(canvasAndContext.canvas, "Canvas is not specified");
        assert(width > 0 && height > 0, "Invalid canvas size");
        canvasAndContext.canvas.width = width;
        canvasAndContext.canvas.height = height;
    },

    destroy: function NodeCanvasFactory_destroy(canvasAndContext) {
        assert(canvasAndContext.canvas, "Canvas is not specified");

        // Zeroing the width and height cause Firefox to release graphics
        // resources immediately, which can greatly reduce memory consumption.
        canvasAndContext.canvas.width = 0;
        canvasAndContext.canvas.height = 0;
        canvasAndContext.canvas = null;
        canvasAndContext.context = null;
    },
};

// Some PDFs need external cmaps.
const CMAP_URL = "./pdfjs2.9.359/cmaps/";
const CMAP_PACKED = true;

function __getTextContentAsync(page) {
    //check documents https://mozilla.github.io/pdf.js/
    //ret.text = ret.text ? ret.text : "";

    let render_options = {
        //replaces all occurrences of whitespace with standard spaces (0x20). The default value is `false`.
        normalizeWhitespace: false,
        //do not attempt to combine same line TextItem's. The default value is `false`.
        disableCombineTextItems: false
    }

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

    return page.getTextContent(render_options)
        .then(function (textContent) {
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
        const loadingTask = PDFJS.getDocument(dataBuffer);
        //const loadingTask = PDFJS.getDocument(dataBuffer, cMapUrl: CMAP_URL, cMapPacked: CMAP_PACKED);
        loadingTask.promise.then(doc => {
            let num_pages = doc.numPages || 0;
            ret.num_pages = num_pages;

            doc.getMetadata().then(function (metaData) {
                //console.log(metaData);

                ret.info = metaData ? metaData.info : null;
                ret.metadata = metaData ? metaData.metadata : null;

                ret.text = "";

                var ps = [];
                ps.push(doc.getPage(1));

                const scale = 2.0;// 1.0 1.5 2.0
                Promise.all(ps).then(async function (arr) {
                    const page = arr[0];
                    //console.log(page);

                    let pageText = await __getTextContentAsync(page);
                    ret.text = `${ret.text}\n\n${pageText}`;
                    //console.log(pageText);

                    const viewport = page.getViewport({ scale: scale });
                    const height = viewport.height;
                    const width = viewport.width;
                    console.log(width, height);

                    //const canvas = createCanvas(width, height);
                    ////const canvas = createCanvas(600, 800, 'pdf');
                    //const ctx = canvas.getContext('2d');

                    //await page.render({ canvasContext: ctx, viewport: viewport });
                    //const base64 = canvas.toDataURL('image/png');
                    ////console.log(base64);

                    //const base64Data = base64.replace(/^data:image\/png;base64,/, "");
                    ////console.log(base64Data);
                    //var err = fs.writeFileSync("1.png", base64Data, 'base64');
                    //console.log(err);

                    const canvasFactory = new NodeCanvasFactory();
                    const canvasAndContext = canvasFactory.create(width,height);
                    const renderContext = { canvasContext: canvasAndContext.context, viewport, canvasFactory };

                    await page.render(renderContext);

                    const bufImage = canvasAndContext.canvas.toBuffer();
                    var err = fs.writeFileSync("1.png", bufImage, 'binary');
                    console.log(err);


                    doc.destroy();
                    resolve(ret);
                });
            });
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