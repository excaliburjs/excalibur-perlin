const fs = require('fs');
var static = require('node-static');
const http = require('http');

const PNG = require('pngjs').PNG;
const pixelmatch = require('pixelmatch');
const puppeteer = require('puppeteer');
process.env.CHROME_BIN = require('puppeteer').executablePath();

const file = new(static.Server)('./example');
const server = http.createServer(function (req, res) {
    file.serve(req, res);
  }).listen(8080);


function imageMatch(expectedFile, actualFile) {
    const expected = PNG.sync.read(fs.readFileSync(expectedFile));
    const actual = PNG.sync.read(fs.readFileSync(actualFile));
    const {width, height} = expected;
    const diff = new PNG({width, height});
    const pixelDiff = pixelmatch(expected.data, actual.data, diff.data, width, height, {threshold: 0.1});
    
    if (pixelDiff > 100) {
        console.error(`Image ${expectedFile} did not match acutal ${actualFile}, ${pixelDiff} different!`);
        const diffImage = PNG.sync.write(diff);
        console.log('Diff image: ', 'data:image/png;base64,' + diffImage.toString('base64'));
        const fileSplit = actualFile.split('/');
        fs.writeFileSync('./test/integration/images/' + 'diff-'+ fileSplit[fileSplit.length-1], diffImage)
        process.exit(1);
    }
}

const isLoaded = async (page) => {
   await page.waitForSelector('#excalibur-play', {visible: true});
   await page.waitForTimeout(1000); // give it a second
}

const clickPlay = async (page) => {
   const start = await page.$('#excalibur-play');
   await start.click();
   // Left-over roots :( excalibur bug
   await page.evaluate(() => {
      const root = document.querySelector('#excalibur-play-root');
      document.body.removeChild(root);
   });
}


const expectPerlin = async (page, name, actualName, shouldLoad = true) => {
   console.log(`TEST: ${name}`)
   if (shouldLoad) {
      await isLoaded(page);
   }
   await page.screenshot({path: `./test/integration/images/actual-loaded.png`});

   await clickPlay(page);
   await page.waitForTimeout(2000); // camera centering
   await page.screenshot({path: `./test/integration/images/actual-${actualName}.png`});

   return {
      
      toBe: (expectedName) => {
         imageMatch('./test/integration/images/expected-loaded.png', `./test/integration/images/actual-loaded.png`);
         imageMatch(`./test/integration/images/expected-${expectedName}.png`, `./test/integration/images/actual-${expectedName}.png`);
      }
   }
}

(async () => {
    try {
        const browser = await puppeteer.launch({
            dumpio: false,
            args: [
              '--window-size=800,600',
            ],
          });
        const page = await browser.newPage();
        await page.goto('http://localhost:8080/')
        
        await isLoaded(page);

        (await expectPerlin(page, 'Perlin Drawer', 'perlin', false)).toBe('perlin');

        await browser.close();

        console.log('Test Success!');

    } finally {
        server.close();
    }
})();