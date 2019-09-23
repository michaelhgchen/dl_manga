const fs = require('fs');
const puppeteer = require('puppeteer');

const asyncForEach = async (arr, cb) => {
  for(let i = 0; i < arr.length; ++i) {
    await cb(arr[i], i);
  }
}

const DOWNLOADED_FOLDER = './downloads';

if (!fs.existsSync(DOWNLOADED_FOLDER)){
  fs.mkdirSync(DOWNLOADED_FOLDER);
}

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  const manga = process.argv[2];
  const mangaFolder = `${DOWNLOADED_FOLDER}/${manga}`;

  if (!fs.existsSync(mangaFolder)){
    fs.mkdirSync(mangaFolder);
  }

  await page.goto(`https://kissmanga.com/Manga/${manga}`);
  await page.waitFor('.chapterList');

  const links = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.chapterList td > a'), element => element.href)
  );

  const numChapters = links.length;

  await asyncForEach(links, async (link, index) => {
    await page.goto(link);
    await page.waitFor('#divImage');
    const chapter = numChapters - index; // reverse chronological order
    const chapterFolder = `${mangaFolder}/${chapter}`;

    if (!fs.existsSync(chapterFolder)){
      fs.mkdirSync(chapterFolder);
    }

    const images = await page.evaluate(() => Array.from(document.querySelectorAll('#divImage img'), element => element.src));

    await asyncForEach(images, async (src, index) => {
      const fileFormat = src.match(/(\.[a-zA-Z]*)$/)[0];
      const viewSource = await page.goto(src);
      fs.writeFile(`${chapterFolder}/${index}${fileFormat}`, await viewSource.buffer(), (err) => {
        if (err) {
          console.error(`error saving image ${index}`, err);
        }
      });
    });
  });

  await browser.close();
})();
