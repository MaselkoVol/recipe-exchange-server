const express = require("express");
const router = express.Router();

const authRoutes = require("./auth");
const userRoutes = require("./users");
const recipeRoutes = require("./recipes");
const tagRoutes = require("./tags");
const currentRoutes = require("./current");

router.use(authRoutes); // All auth routes
router.use(userRoutes); // All user-related routes
router.use(recipeRoutes); // All recipe-related routes
router.use(tagRoutes);
router.use(currentRoutes);

module.exports = router;
