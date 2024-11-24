const { deleteFileByPathIfExists } = require("./deleteFileIfExists");

// function to save files that need to delete and when complete is called, these files are delited
const createDeleteTransaction = () => {
  const filePaths = [];
  return {
    add: (filePath) => {
      filePaths.push(filePath);
    },
    remove: (filePath) => {
      filePaths = filePaths.filter((curPath) => curPath !== filePath);
    },
    complete: () => {
      filePaths.forEach((filePath) => {
        deleteFileByPathIfExists(filePath);
      });
    },
  };
};

module.exports = createDeleteTransaction;
