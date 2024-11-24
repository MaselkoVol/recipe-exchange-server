const express = require("express");
const TagController = require("../controllers/tagController");
const authCheck = require("../middleware/authCheck");
const router = express.Router();

router.get("/tags", TagController.getAllTags);
router.post("/tag-categories", authCheck, TagController.createTagCategory);
router.post("/tag-categories/:categoryId", authCheck, TagController.createTag);
router.put("/tag-categories/:categoryId", authCheck, TagController.updateTagCategory);
router.put("/tag-categories/:categoryId/tags/:tagId", authCheck, TagController.updateTag);
router.delete("/tag-categories/:categoryId", authCheck, TagController.deleteTagCategory);
router.delete("/tag-categories/:categoryId/tags/:tagId", authCheck, TagController.deleteTag);

module.exports = router;
