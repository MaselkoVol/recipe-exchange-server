const express = require("express");
const RecipeController = require("../controllers/recipeController");
const authCheck = require("../middleware/authCheck");
const upload = require("../multer");
const CommentController = require("../controllers/commentController");
const authCheckWithoutError = require("../middleware/authCheckWithoutError");
const router = express.Router();

router.get("/recipes", RecipeController.getAllRecipes);
router.get("/recipes/:id", RecipeController.getRecipeById);
router.get("/recipes/:id/comments", authCheckWithoutError, CommentController.getRecipeComments);

router.post("/recipes/:id/comments", authCheck, upload.array("images", 10), CommentController.createRecipeComment);
router.post(
  "/recipes",
  authCheck,
  upload.fields([
    { name: "mainImage", maxCount: 1 },
    { name: "images", maxCount: 10 },
  ]),
  RecipeController.createRecipe
);

router.put(
  "/recipes/:id",
  authCheck,
  upload.fields([
    { name: "mainImage", maxCount: 1 },
    { name: "images", maxCount: 10 },
  ]),
  RecipeController.updateRecipe
);

router.delete("/recipes/:id", authCheck, RecipeController.deleteRecipe);

router.delete("/recipes/:id/comments/:commentId", authCheck, CommentController.deleteRecipeComment);

module.exports = router;
