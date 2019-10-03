const fs = require("fs");

const createFolder = path => {
  if (!fs.existsSync(path)) {
    fs.mkdirSync(path);
  }
};

const createFolderAndCd = path => {
  createFolder(path);
  process.chdir(path);
};

module.exports = { createFolder, createFolderAndCd };
