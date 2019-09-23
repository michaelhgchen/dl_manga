const fs = require("fs");
const puppeteer = require("puppeteer");

const asyncForEach = async (arr, cb) => {
  for (let i = 0; i < arr.length; ++i) {
    await cb(arr[i], i);
  }
};

const DOWNLOADED_FOLDER = "./downloads";

if (!fs.existsSync(DOWNLOADED_FOLDER)) {
  fs.mkdirSync(DOWNLOADED_FOLDER);
}

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  const manga = process.argv[2];
  const mangaFolder = `${DOWNLOADED_FOLDER}/${manga}`;

  if (!fs.existsSync(mangaFolder)) {
    fs.mkdirSync(mangaFolder);
  }

  await page.goto(`https://kissmanga.com/Manga/${manga}`);
  await page.waitFor(".chapterList");

  const links = await page.evaluate(() =>
    Array.from(
      document.querySelectorAll(".chapterList td > a"),
      element => element.href
    )
  );

  const numChapters = links.length;
  const chaptersPadding = numChapters.toString().length;

  await asyncForEach(links, async (link, index) => {
    await page.goto(link);
    await page.waitFor("#divImage");
    const chapter = (numChapters - index)
      .toString()
      .padStart(chaptersPadding, "0"); // reverse chronological order
    const chapterFolder = `${mangaFolder}/${manga}-${chapter}`;

    if (!fs.existsSync(chapterFolder)) {
      fs.mkdirSync(chapterFolder);
    } else {
      // TODO: no good retry mechanism; delete folders and re-run
      return;
    }

    const images = await page.evaluate(() =>
      Array.from(
        document.querySelectorAll("#divImage img"),
        element => element.src
      )
    );
    const imagesPadding = images.length.toString().length;

    await asyncForEach(images, async (src, index) => {
      try {
        // if using a proxy, decode image url from proxy
        if (src.match(/&url=([^&]*)&/)) {
          src = decodeURIComponent(src.match(/&url=([^&]*)&/)[1]);
        }

        let fileFormat =
          (src.match(/(\.[a-zA-Z]*)$/) && src.match(/(\.[a-zA-Z]*)$/)[0]) ||
          ".jpg";

        const viewSource = await page.goto(src);
        fs.writeFile(
          `${chapterFolder}/${index
            .toString()
            .padStart(imagesPadding, "0")}${fileFormat}`,
          await viewSource.buffer(),
          err => {
            if (err) {
              console.error(
                `error saving image ${index} ${src} from chapter ${chapter}`,
                err
              );
            }
          }
        );
      } catch (err) {
        console.error(
          `error saving image ${index} ${src} from chapter ${chapter}`,
          err
        );
      }
    });
  });

  await browser.close();
})();
