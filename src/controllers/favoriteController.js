const prisma = require("../prismaClient");
const { accessDenied, internalServerError } = require("../utils/errorHanders");
const { recipeMainImageNameToUrl, userAvatarNameToUrl } = require("../utils/imageNamesToUrl");

const FavoriteController = {
  // @desc		Get current user's favorite recipes
  // @route		GET /api/favorite/posts/:userId
  getUserFavoriteRecipes: async (req, res) => {
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
      let favoriteRecipes = await prisma.favoriteRecipe.findMany({
        where: searchQuery,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          recipe: {
            select: {
              id: true,
              title: true,
              ingredients: true,
              mainImageUrl: true,
              tags: true,
              createdAt: true,
              _count: {
                select: { likes: true, views: true }, // Count the number of likes for each recipe
              },
            },
          },
        },
      });
      console.log(favoriteRecipes);

      favoriteRecipes = favoriteRecipes.map((favoriteRecipe) => {
        const recipe = favoriteRecipe.recipe;
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

      const recipesCount = await prisma.favoriteRecipe.count({ where: searchQuery });

      const finalResult = {
        data: favoriteRecipes,
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
  toggleFavorite: async (req, res) => {
    const { recipeId } = req.params;
    const userId = req.user.id;

    try {
      const foundRecipe = await prisma.recipe.findUnique({ where: { id: recipeId } });
      if (!foundRecipe) {
        return res.status(404).send({ erorr: "Recipe not found" });
      }
      const favorite = await prisma.favoriteRecipe.findFirst({ where: { AND: [{ userId }, { recipeId }] } });
      if (favorite) {
        await prisma.favoriteRecipe.deleteMany({
          where: { AND: [{ userId }, { recipeId }] },
        });
        return res.status(200).send({ message: "Post was deleted from favorites successfully", active: false });
      }
      await prisma.favoriteRecipe.create({
        data: {
          userId,
          recipeId,
        },
      });
      return res.status(200).send({ message: "Post was added to favorites successfully", active: true });
    } catch (error) {
      console.log(error);
      return internalServerError(res);
    }
  },
  isInFavorite: async (req, res) => {
    const { recipeId } = req.params;
    const userId = req.user.id;

    try {
      const foundRecipe = await prisma.recipe.findUnique({ where: { id: recipeId } });
      if (!foundRecipe) {
        return res.status(404).send({ erorr: "Recipe not found", active: false });
      }
      const likedRecipe = await prisma.favoriteRecipe.findFirst({ where: { AND: [{ userId }, { recipeId }] } });
      if (likedRecipe) {
        return res.status(200).send({ message: "Post is added to favorites", active: true });
      }
      return res.status(204).send({ message: "Post is not added to from favorites", active: false });
    } catch (error) {
      console.log(error);
      return internalServerError(res);
    }
  },
};

module.exports = FavoriteController;
