const path = require("path");

const getFilePath = (...args) => {
  return path.join(process.cwd(), ...args);
};

module.exports = {
  getFilePath,
};
