const fsPromises = require("fs").promises;
const fs = require("fs");

const fileExists = async (file) => {
  if (!file || !file.path) return false;
  if (fs.existsSync(file.path)) {
    return true;
  }
  return false;
};

const deleteFileIfExists = async (file) => {
  const exists = fileExists(file);
  try {
    if (exists) {
      await fsPromises.unlink(file.path);
      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
};

const fileExistsByPath = async (filepath) => {
  if (!filepath) return false;
  if (fs.existsSync(filepath)) {
    return true;
  }
  return false;
};

const deleteFileByPathIfExists = async (filepath) => {
  const exists = fileExistsByPath(filepath);
  try {
    if (exists) {
      await fsPromises.unlink(filepath);
      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
};

module.exports = {
  fileExists,
  deleteFileIfExists,
  fileExistsByPath,
  deleteFileByPathIfExists,
};
