// TODO features
// - interactive prompt to search through manga
// - option for naming conventions
// - option for PDF or EPUB formatting for chapters
// - better retry mechanisms / de-dupe effort

// const events = require("events");
const { fork } = require("child_process");
const os = require("os");
const puppeteer = require("puppeteer");

const { createFolderAndCd } = require("./helpers");

const DOWNLOADED_FOLDER = "./downloads";
const NUM_CORES = os.cpus().length;

const downloadManga = async manga => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  createFolderAndCd(DOWNLOADED_FOLDER);
  createFolderAndCd(manga);

  await page.goto(`https://kissmanga.com/Manga/${manga}`);
  await page.waitFor(".chapterList");

  // grab all chapters
  const chapterData = await page.evaluate(() =>
    Array.from(
      document.querySelectorAll(".chapterList td > a"),
      ({ href, textContent }) => ({
        href,
        text: textContent.trim()
      })
    )
  );

  const totalNumChapters = chapterData.length;
  const chaptersPadding = totalNumChapters.toString().length;
  let currentIndex = 0;
  let numRunningChildren = 0;

  for (let i = 0; i < Math.min(totalNumChapters, NUM_CORES); ++i) {
    (() => {
      const childProcess = fork("../../downloadChapter", [], { silent: true }); // silent for stdout
      numRunningChildren += 1;

      const downloadChapter = () => {
        const index = (currentIndex + 1)
          .toString()
          .padStart(chaptersPadding, "0"); // reverse chronological order

        currentIndex += 1;

        childProcess.send({
          ...chapterData[totalNumChapters - currentIndex],
          index
        });
      };

      downloadChapter();

      childProcess.stdout.on('data', data => console.log(data.toString()));
      childProcess.stderr.on('data', data => console.error(data.toString()));

      childProcess.on("message", () => {
        if (currentIndex >= totalNumChapters) {
          childProcess.kill();
          numRunningChildren -= 1;
          if (!numRunningChildren) {
            process.exit();
          }
        } else {
          downloadChapter();
        }
      });
    })();
  }
};

downloadManga(process.argv[2]);
