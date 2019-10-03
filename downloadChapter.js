const fs = require("fs");
const puppeteer = require("puppeteer");

const { createFolder } = require("./helpers");

let browser, page;

const downloadChapter = async (href, text, index) => {
  browser = browser || (await puppeteer.launch());
  page = page || (await browser.newPage());

  await page.goto(href);
  await page.waitFor("#divImage");

  const chapterFolder = `${index} ${text}`;
  createFolder(chapterFolder);

  const images = await page.evaluate(() =>
    Array.from(
      document.querySelectorAll("#divImage img"),
      element => element.src
    )
  );

  const imagesPadding = images.length.toString().length;

  for (let i = 0; i < images.length; ++i) {
    const src = images[i];

    await (async () => {
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
          `${chapterFolder}/${i
            .toString()
            .padStart(imagesPadding, "0")}${fileFormat}`,
          await viewSource.buffer(),
          err => {
            if (err) {
              console.error(
                `error saving image ${i} ${src} from ${text}`,
                err
              );
            }
          }
        );
      } catch (err) {
        console.error(`error saving image ${i} ${src} from ${text}`, err);
      }
    })();
  }
};

process.on("message", async message => {
  const { href, text, index } = message;
  await downloadChapter(href, text, index);
  process.send(true);
});
