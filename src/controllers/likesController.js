const prisma = require("../prismaClient");
const { accessDenied, internalServerError } = require("../utils/errorHanders");
const { userAvatarNameToUrl, recipeMainImageNameToUrl } = require("../utils/imageNamesToUrl");

const LikesController = {
  // @desc		Get current user's liked recipes
  // @route		GET /api/likes/posts/:userId
  getUserLikedRecipes: async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const userId = req.user.id;
    try {
      const searchQuery = {
        AND: [
          { userId: userId },
          {
            recipe: {
              title: {
                contains: search,
                mode: "insensitive",
              },
            },
          },
        ],
      };
      let likedRecipes = await prisma.likedRecipe.findMany({
        where: searchQuery,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        // get info from recipe
        select: {
          recipe: {
            select: {
              id: true,
              title: true,
              ingredients: true,
              mainImageUrl: true,
              tags: true,
              createdAt: true,
              // get likes count
              _count: {
                select: { likes: true, views: true }, // Count the number of likes for each recipe
              },
            },
          },
        },
      });

      likedRecipes = likedRecipes.map((likedRecipe) => {
        const recipe = likedRecipe.recipe;
        if (recipe.mainImageUrl) {
          recipe.mainImageUrl = recipeMainImageNameToUrl(recipe.mainImageUrl);
        }
        const likesCount = recipe._count.likes;
        const views = recipe._count.views;
        delete recipe._count;
        recipe.likesCount = likesCount;
        recipe.views = views;
        return recipe;
      });

      const recipesCount = await prisma.likedRecipe.count({ where: searchQuery });

      const finalResult = {
        data: likedRecipes,
        meta: {
          page,
          limit,
          totalPages: Math.ceil(recipesCount / limit),
        },
      };
      return res.json(finalResult);
    } catch (error) {
      console.error(error);
      return internalServerError(res);
    }
  },
  toggleLike: async (req, res) => {
    const { recipeId } = req.params;
    const userId = req.user.id;

    try {
      const foundRecipe = await prisma.recipe.findUnique({ where: { id: recipeId } });
      if (!foundRecipe) {
        return res.status(404).send({ erorr: "Recipe not found", active: false });
      }
      const likedRecipe = await prisma.likedRecipe.findFirst({ where: { AND: [{ userId }, { recipeId }] } });
      if (likedRecipe) {
        await prisma.likedRecipe.deleteMany({
          where: { AND: [{ userId }, { recipeId }] },
        });
        return res.status(204).send({ message: "Post was unliked successfully", active: false });
      }
      await prisma.likedRecipe.create({
        data: {
          userId,
          recipeId,
        },
      });
      return res.status(200).send({ message: "Post was liked successfully", active: true });
    } catch (error) {
      console.log(error);
      return internalServerError(res);
    }
  },
  isRecipeLiked: async (req, res) => {
    const { recipeId } = req.params;
    const userId = req.user.id;

    try {
      const foundRecipe = await prisma.recipe.findUnique({ where: { id: recipeId } });
      if (!foundRecipe) {
        return res.status(404).send({ erorr: "Recipe not found", active: false });
      }
      const likedRecipe = await prisma.likedRecipe.findFirst({ where: { AND: [{ userId }, { recipeId }] } });
      if (likedRecipe) {
        return res.status(200).send({ message: "Post is liked by user", active: true });
      }
      return res.status(204).send({ message: "Recipe is not liked by user", active: false });
    } catch (error) {
      console.log(error);
      return internalServerError(res);
    }
  },
};

module.exports = LikesController;
