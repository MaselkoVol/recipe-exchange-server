const prisma = require("../prismaClient");
const { allFieldsRequired, internalServerError, accessDenied } = require("../utils/errorHanders");
const { deleteFileIfExists } = require("../utils/deleteFileIfExists");
const { getFilePath } = require("../utils/getFilePath");
const createDeleteTransaction = require("../utils/deleteFilesTransaction");
const CommentController = require("./commentController");
const { recipeMainImageNameToUrl, userAvatarNameToUrl, recipeImageNameToUrl } = require("../utils/imageNamesToUrl");
const ViewsController = require("./viewsController");

// TODO check getAllRecipes when you will have a lot of them
const RecipeController = {
  // @desc		create new recipe, only for authorized users
  // @route		POST /api/recipes
  createRecipe: async (req, res) => {
    const userId = req.user.id;
    let { title, text, ingredients, tagsId } = req.body;
    if (tagsId) {
      tagsId = JSON.parse(tagsId);
    }
    const [mainImage, images] = setRecipeImages(req);
    if (!title || !text || !ingredients) {
      deleteFilesDuringError(mainImage, images);
      return allFieldsRequired(res);
    }
    try {
      const creationData = {
        authorId: userId,
        title,
        text,
        ingredients,
      };
      if (mainImage) {
        creationData.mainImageUrl = mainImage.filename;
      }
      if (images) {
        creationData.images = {
          create: images.map((image) => ({ imageUrl: image.filename })),
        };
      }
      if (tagsId) {
        creationData.tags = {
          connect: tagsId.map((tagId) => ({ id: tagId })),
        };
      }
      const createdRecipe = await prisma.recipe.create({
        data: creationData,
      });
      res.json({ createdRecipe });
    } catch (error) {
      console.log(error);
      deleteFilesDuringError(mainImage, images);
      return internalServerError(res);
    }
  },
  getRecipeById: async (req, res) => {
    const { id } = req.params;
    try {
      const foundRecipe = await prisma.recipe.findUnique({
        where: { id },

        include: {
          tags: true,
          author: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
              email: true,
            },
          },
          images: {
            select: {
              id: true,
              imageUrl: true,
            },
          },
          _count: {
            select: {
              likes: true,
            },
          },
        },
      });
      if (!foundRecipe) {
        return res.status(404).send({ error: "Recipe not found" });
      }

      if (foundRecipe.mainImageUrl) {
        foundRecipe.mainImageUrl = recipeMainImageNameToUrl(foundRecipe.mainImageUrl);
      }
      foundRecipe.images.forEach((image) => (image.imageUrl = recipeImageNameToUrl(image.imageUrl)));
      if (foundRecipe.author.avatarUrl) {
        foundRecipe.author.avatarUrl = userAvatarNameToUrl(foundRecipe.author.avatarUrl);
      }
      const likesCount = foundRecipe._count.likes;
      delete foundRecipe._count;
      foundRecipe.likesCount = likesCount;
      return res.json(foundRecipe);
    } catch (error) {
      console.error(error);
      return internalServerError(res);
    }
  },
  getAllRecipes: async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    let tagsId = req.query.tags || "All";
    const searchBy = req.query["search-by"] || "All"; // title, text, ingredients
    const sort = req.query.sort || "date"; // date, likes, views
    const sortOrder = req.query["sort-order"] || "desc"; // asc, desc

    try {
      const availableTags = await prisma.recipeTag.findMany();
      const availableTagsId = availableTags.map((tag) => tag.id);
      tagsId === "All"
        ? (tagsId = availableTagsId)
        : (tagsId = tagsId.split(",").filter((tagId) => availableTagsId.includes(tagId)));
      const additionalToQuery = {
        select: {
          id: true,
          title: true,
          ingredients: true,
          mainImageUrl: true,
          tags: true,
          createdAt: true,
          _count: {
            select: {
              likes: true,
              views: true,
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
      };
      const searchQuery = {
        where: {
          AND: [
            {
              tags: {
                some: {
                  id: {
                    in: tagsId,
                  },
                },
              },
            },
            {
              OR: [],
            },
          ],
        },
      };
      if (searchBy === "title" || searchBy === "All") {
        searchQuery.where.AND[1].OR.push({
          title: {
            contains: search,
            mode: "insensitive",
          },
        });
      }
      if (searchBy === "text" || searchBy === "All") {
        searchQuery.where.AND[1].OR.push({
          text: {
            contains: search,
            mode: "insensitive",
          },
        });
      }
      if (searchBy === "ingredients" || searchBy === "All") {
        searchQuery.where.AND[1].OR.push({
          ingredients: {
            contains: search,
            mode: "insensitive",
          },
        });
      }
      searchQuery.orderBy =
        sort === "date"
          ? { createdAt: sortOrder }
          : sort === "likes"
          ? { likes: { _count: sortOrder } }
          : sort === "views"
          ? { views: { _count: sortOrder } }
          : undefined;

      const foundRecipes = await prisma.recipe.findMany({ ...additionalToQuery, ...searchQuery });
      foundRecipes.forEach((recipe) => {
        if (recipe.mainImageUrl) {
          recipe.mainImageUrl = recipeMainImageNameToUrl(recipe.mainImageUrl);
        }

        const likesCount = recipe._count.likes;
        const views = recipe._count.views;
        delete recipe._count;
        recipe.likesCount = likesCount;
        recipe.views = views;
      });
      const totalRecipes = await prisma.recipe.count({ ...searchQuery });
      const finalResult = {
        data: foundRecipes,
        meta: {
          page,
          limit,
          totalPages: Math.ceil(totalRecipes / limit),
        },
      };
      return res.json(finalResult);
    } catch (error) {
      console.log(error);
      return internalServerError(res);
    }
  },
  updateRecipe: async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    let { title, text, ingredients, tagsId, imagesId } = req.body;
    if (imagesId) {
      imagesId = JSON.parse(imagesId);
    }
    if (tagsId) {
      tagsId = JSON.parse(tagsId);
    }
    // if main image and other images provided, write them into corresponding variable
    const [mainImage, images] = setRecipeImages(req);
    try {
      // find recipe of this author with images and tags
      const foundRecipe = await prisma.recipe.findUnique({ where: { id }, include: { images: true, tags: true } });
      if (!foundRecipe) {
        deleteFilesDuringError(mainImage, images);
        return res.status(404).send({ error: "Recipe not found" });
      }
      if (foundRecipe.authorId !== userId) {
        deleteFilesDuringError(mainImage, images);
        return accessDenied(res);
      }

      // delete recipe images if provided
      // delete recipe tags if provided
      // update recipe and put new images and tags
      const deleteTransaction = createDeleteTransaction();
      await prisma.$transaction(async (tx) => {
        const updateData = {
          title: title || undefined,
          text: text || undefined,
          ingredients: ingredients || undefined,
        };
        // if user specified main image, delete previous image and pass new image to updateData
        if (mainImage) {
          deleteTransaction.add(getFilePath("public", "uploads", "recipes", foundRecipe.mainImageUrl));
          updateData.mainImageUrl = mainImage.filename;
        }

        // if user specified images, soft delete previous images and pass new images to updateData
        await tx.recipeImage.deleteMany({
          where: { AND: [{ recipeId: foundRecipe.id }, { id: { notIn: imagesId } }] },
        });
        foundRecipe.images.forEach((image) => {
          if (image.imageUrl && !imagesId.includes(image.id)) {
            deleteTransaction.add(getFilePath("public", "uploads", "recipes", image.imageUrl));
          }
        });
        if (images) {
          updateData.images = {
            create: images.map((image) => ({ imageUrl: image.filename })),
          };
        }

        // if user specified tags, soft delete previous tags and pass new tags to updateData
        if (tagsId) {
          await tx.recipe.update({
            where: { id: foundRecipe.id },
            data: {
              tags: {
                disconnect: foundRecipe.tags.map((tag) => ({
                  id: tag.id,
                })),
              },
            },
          });

          updateData.tags = {
            connect: tagsId.map((tagId) => ({ id: tagId })),
          };
        }

        // update recipe with provided data
        await tx.recipe.update({
          where: { id: foundRecipe.id },
          data: updateData,
        });
      });
      const fullRecipeInfo = await prisma.recipe.findUnique({
        where: { id: foundRecipe.id },
        include: {
          images: true,
          tags: true,
        },
      });
      // if all gone well, delete selected files
      deleteTransaction.complete();
      return res.json(fullRecipeInfo);
    } catch (error) {
      console.log(error);
      deleteFilesDuringError(mainImage, images);
      internalServerError(res);
    }
  },
  deleteRecipeChain: async (deleteTransaction, tx, recipeId) => {
    const foundRecipe = await tx.recipe.findUnique({
      where: { id: recipeId },
      include: { images: true, tags: true, comments: true },
    });
    if (!foundRecipe) {
      return;
    }
    await tx.recipeView.deleteMany({ where: { recipeId } });
    await tx.likedRecipe.deleteMany({ where: { recipeId } });
    await tx.favoriteRecipe.deleteMany({ where: { recipeId } });
    // delete main image file
    if (foundRecipe.mainImageUrl) {
      deleteTransaction.add(getFilePath("public", "uploads", "recipes", foundRecipe.mainImageUrl));
    }
    // delete images file
    foundRecipe.images.forEach((image) => {
      if (image.imageUrl) {
        deleteTransaction.add(getFilePath("public", "uploads", "recipes", image.imageUrl));
      }
    });
    await tx.recipeImage.deleteMany({ where: { recipeId } });

    // delete all comments of the recipe
    await Promise.all(
      foundRecipe.comments.map((comment) => {
        return CommentController.deleteCommentChain(deleteTransaction, tx, comment.id);
      })
    );
    await tx.recipe.delete({ where: { id: recipeId } });
    return true;
  },
  deleteRecipe: async (req, res) => {
    const { id } = req.params;
    const { id: userId, isAdmin } = req.user;

    try {
      // find recipe of this author with images and tags
      const foundRecipe = await prisma.recipe.findUnique({
        where: { id },
      });
      if (!foundRecipe) {
        return res.status(404).send({ error: "Recipe not found" });
      }
      if (foundRecipe.authorId !== userId && !isAdmin) {
        return accessDenied(res);
      }
      const deleteTransaction = createDeleteTransaction();
      await prisma.$transaction(async (tx) => {
        await RecipeController.deleteRecipeChain(deleteTransaction, tx, foundRecipe.id);
      });
      deleteTransaction.complete();
      return res.status(200).send({ message: "recipe was deleted successfully" });
    } catch (error) {
      console.log(error);
      return internalServerError(res);
    }
  },
};

const setRecipeImages = (req) => {
  let mainImage = null;
  let images = null;
  if (req.files) {
    if (req.files["mainImage"] && req.files["mainImage"][0]) {
      mainImage = req.files["mainImage"][0];
    }
    if (req.files["images"] && req.files["images"][0]) {
      images = req.files["images"];
    }
  }
  return [mainImage, images];
};

const deleteFilesDuringError = (mainImage, images) => {
  deleteFileIfExists(mainImage);
  if (!images) return;
  for (let i = 0; i < images.length; i++) {
    deleteFileIfExists(images[i]);
  }
};

module.exports = RecipeController;
