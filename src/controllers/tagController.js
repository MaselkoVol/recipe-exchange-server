const prisma = require("../prismaClient");
const { internalServerError, accessDenied, allFieldsRequired } = require("../utils/errorHanders");

const TagController = {
  getAllTags: async (req, res) => {
    try {
      const tagCategories = await prisma.recipeTagCategory.findMany({
        include: {
          tags: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
      res.json(tagCategories);
    } catch (error) {
      console.log(error);
      return internalServerError(res);
    }
  },
  createTag: async (req, res) => {
    const { id: userId, isAdmin } = req.user;
    const { categoryId } = req.params;
    const { name } = req.body;

    if (!name) {
      return allFieldsRequired(res);
    }
    if (!isAdmin) {
      return accessDenied(res);
    }

    try {
      const foundCategory = await prisma.recipeTagCategory.findUnique({ where: { id: categoryId } });
      if (!foundCategory) {
        return res.status(404).send({ error: "Category not found" });
      }
      const foundTag = await prisma.recipeTag.findUnique({ where: { name } });
      if (foundTag) {
        return res.status(409).send({ error: "Tag already exists" });
      }
      const createdTag = await prisma.recipeTag.create({ data: { name, tagCategoryId: categoryId } });
      res.json(createdTag);
    } catch (error) {
      console.log(error);
      return internalServerError(res);
    }
  },
  updateTag: async (req, res) => {
    const { id: userId, isAdmin } = req.user;
    const { categoryId, tagId } = req.params;
    const { name } = req.body;
    if (!name) {
      return allFieldsRequired(res);
    }
    if (!isAdmin) {
      return accessDenied(res);
    }
    try {
      const foundCategory = await prisma.recipeTagCategory.findUnique({ where: { id: categoryId } });
      if (!foundCategory) {
        return res.status(404).send({ error: "Category not found" });
      }
      const foundTag = await prisma.recipeTag.findUnique({ where: { id: tagId } });
      if (!foundTag) {
        return res.status(404).send({ error: "Tag doesn't exists" });
      }
      const updatedTag = await prisma.recipeTag.update({
        where: { id: tagId },
        data: { name, tagCategoryId: categoryId },
      });
      res.json(updatedTag);
    } catch (error) {
      console.log(error);
      return internalServerError(res);
    }
  },
  deleteTag: async (req, res) => {
    const { id: userId, isAdmin } = req.user;
    const { categoryId, tagId } = req.params;

    if (!isAdmin) {
      return accessDenied(res);
    }

    try {
      const foundTag = await prisma.recipeTag.findUnique({ where: { id: tagId } });
      if (!foundTag) {
        return res.status(203).send({ message: "Tag not exists" });
      }
      await prisma.$transaction(async (tx) => {
        await TagController.deleteTagChain(tx, tagId);
      });
      res.sendStatus(200);
    } catch (error) {
      console.log(error);
      return internalServerError(res);
    }
  },
  deleteTagChain: async (tx, tagId) => {
    const recipesWithTag = await tx.recipe.findMany({
      where: {
        tags: {
          some: {
            id: tagId,
          },
        },
      },
    });
    for (const recipe of recipesWithTag) {
      await tx.recipe.update({
        where: { id: recipe.id },
        data: {
          tags: {
            disconnect: { id: tagId },
          },
        },
      });
    }
    await tx.recipeTag.delete({ where: { id: tagId } });
  },
  createTagCategory: async (req, res) => {
    const { id: userId, isAdmin } = req.user;
    const { name } = req.body;
    if (!name) {
      return allFieldsRequired(res);
    }
    if (!isAdmin) {
      return accessDenied(res);
    }
    try {
      const foundCategory = await prisma.recipeTagCategory.findUnique({ where: { name } });
      if (foundCategory) {
        return res.status(409).send({ message: "Tag category already exists" });
      }
      const createdCategory = await prisma.recipeTagCategory.create({
        data: {
          name,
        },
      });
      return res.json(createdCategory);
    } catch (error) {
      return internalServerError(res);
    }
  },
  updateTagCategory: async (req, res) => {
    const { id: userId, isAdmin } = req.user;
    const { categoryId } = req.params;
    const { name } = req.body;
    if (!name) {
      return allFieldsRequired(res);
    }
    if (!isAdmin) {
      return accessDenied(res);
    }
    try {
      const foundCategory = await prisma.recipeTagCategory.findUnique({ where: { id: categoryId } });
      if (!foundCategory) {
        return res.status(404).send({ message: "Tag category doesn't exists" });
      }
      const updatedCategory = await prisma.recipeTagCategory.update({
        where: {
          id: categoryId,
        },
        data: {
          name,
        },
      });
      return res.json(updatedCategory);
    } catch (error) {
      return internalServerError(res);
    }
  },
  deleteTagCategory: async (req, res) => {
    const { id: userId, isAdmin } = req.user;
    const { categoryId } = req.params;

    if (!isAdmin) {
      return accessDenied(res);
    }

    try {
      const foundCategory = await prisma.recipeTagCategory.findUnique({ where: { id: categoryId } });
      if (!foundCategory) {
        return res.status(203).send({ message: "Tag category not exists" });
      }
      await prisma.$transaction(async (tx) => {
        const tagsInCategory = await tx.recipeTag.findMany({ where: { tagCategoryId: categoryId } });
        await Promise.all(
          tagsInCategory.map((tag) => {
            return TagController.deleteTagChain(tx, tag.id);
          })
        );
        await tx.recipeTagCategory.delete({ where: { id: categoryId } });
      });
      res.sendStatus(200);
    } catch (error) {
      console.log(error);
      return internalServerError(res);
    }
  },
};

module.exports = TagController;
