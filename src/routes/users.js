const express = require("express");
const UserController = require("../controllers/userController");
const authCheck = require("../middleware/authCheck");
const FollowsController = require("../controllers/followsController");
const router = express.Router();

// get any user by id
router.get("/users/:id", UserController.getUserById);
// get recipes of any users
router.get("/users/:id/recipes", UserController.getUserRecipes);
// get followers of any user
router.get("/users/:id/followers", FollowsController.getAnyUserFollowers);
// get following users recipes of any user
router.get("/users/:id/following", FollowsController.getAnyUserFollowing);
// get additional info of any user
router.get("/users/:id/private", authCheck, UserController.getUserPrivateInfoById);

module.exports = router;
