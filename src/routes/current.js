const express = require("express");
const router = express.Router();
const LikesController = require("../controllers/likesController");
const FavoriteController = require("../controllers/favoriteController");
const upload = require("../multer");
const FollowsController = require("../controllers/followsController");
const authCheck = require("../middleware/authCheck");
const CurrentController = require("../controllers/currentController");
const ViewsController = require("../controllers/viewsController");

// get current user
router.get("/current", authCheck, CurrentController.current);
router.get("/current/recipes", authCheck, CurrentController.getCurrentUserRecipes);
// get liked recipes of current user
router.get("/current/liked/recipes", authCheck, LikesController.getUserLikedRecipes);
router.get("/current/liked/recipes/:recipeId", authCheck, LikesController.isRecipeLiked);
// get favorite recipes of current user
router.get("/current/favorite/recipes", authCheck, FavoriteController.getUserFavoriteRecipes);
router.get("/current/favorite/recipes/:recipeId", authCheck, FavoriteController.isInFavorite);

router.get("/current/following", authCheck, FollowsController.getCurrentUserFollowing);
router.get("/current/followers", authCheck, FollowsController.getCurrentUserFollowers);

// change current user information
router.put("/current", authCheck, upload.single("avatar"), CurrentController.updateUser);

// follow user, ony for authorized useres
router.post("/current/following/:followingId", authCheck, FollowsController.follow);
// add post to liked by user, ony for authorized useres
router.post("/current/liked/recipes/:recipeId", authCheck, LikesController.toggleLike);
// add post to favorite, ony for authorized useres
router.post("/current/favorite/recipes/:recipeId", authCheck, FavoriteController.toggleFavorite);
router.post("/current/viewed/recipes/:recipeId", authCheck, ViewsController.addView);

// unfollow user, ony for authorized useres
router.delete("/current/following/:followingId", authCheck, FollowsController.unfollow);
// delete current user
router.delete("/current", authCheck, CurrentController.deleteUser);

module.exports = router;
