const { REAL_URL } = require("./constants");

const recipeImageNameToUrl = (name) => REAL_URL + "/uploads/recipes/" + name;
const recipeMainImageNameToUrl = (name) => REAL_URL + "/uploads/recipes/" + name;
const userAvatarNameToUrl = (name) => REAL_URL + "/uploads/current/" + name;
const commentImagesNameToUrl = (name) => REAL_URL + "/uploads/recipes/" + name;

module.exports = {
  recipeImageNameToUrl,
  recipeMainImageNameToUrl,
  userAvatarNameToUrl,
  commentImagesNameToUrl,
};
