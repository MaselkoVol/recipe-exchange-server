const prisma = require("../prismaClient");
const { internalServerError, userNotFound } = require("../utils/errorHanders");
const { getFilePath } = require("../utils/getFilePath");
const { userAvatarNameToUrl, recipeMainImageNameToUrl } = require("../utils/imageNamesToUrl");
const RecipeController = require("./recipeController");

const UserController = {
  getUserPrivateInfoById: async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    try {
      let isFollowing = await prisma.follows.findFirst({ where: { followerId: userId, followingId: id } });
      isFollowing = isFollowing ? true : false;

      const finalResult = {
        isFollowing,
      };
      return res.json(finalResult);
    } catch (error) {
      console.log(error);
      return internalServerError(res);
    }
  },
  // @desc		Get user by id
  // @route		GET /api/users/:id
  getUserById: async (req, res) => {
    const { id } = req.params;
    try {
      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
          _count: {
            select: {
              followers: true,
              following: true,
              recipes: true,
            },
          },
        },
      });
      if (!user) {
        return userNotFound(res);
      }
      const followersCount = user._count.followers;
      const followingCount = user._count.following;
      const recipesCount = user._count.recipes;
      delete user._count;
      user.followersCount = followersCount;
      user.followingCount = followingCount;
      user.recipesCount = recipesCount;
      if (user.avatarUrl) {
        user.avatarUrl = userAvatarNameToUrl(user.avatarUrl);
      }
      return res.json(user);
    } catch (error) {
      console.error(error);
      return internalServerError(res);
    }
  },
  // @desc		Get current user's favorite recipes
  // @route		GET /api/users/:id/posts
  getUserRecipes: async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const { id } = req.params;
    try {
      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) {
        return userNotFound(res);
      }
      const searchQuery = {
        AND: [
          { authorId: id },
          {
            title: {
              contains: search,
              mode: "insensitive",
            },
          },
        ],
      };
      let recipes = await prisma.recipe.findMany({
        where: searchQuery,
        // get info from recipe
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
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      });

      recipes = recipes.map((recipe) => {
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

      const recipesCount = await prisma.recipe.count({ where: searchQuery });

      const finalResult = {
        data: recipes,
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
  deleteUserChain: async (deleteTransaction, tx, userId) => {
    const foundUser = await tx.user.findUnique({
      where: { id: userId },
      include: { recipes: true },
    });
    if (!foundUser) return;
    deleteTransaction.add(getFilePath("public", "uploads", "current", foundUser.avatarUrl));
    await tx.follows.deleteMany({ where: { OR: [{ followerId: userId }, { followingId: userId }] } });
    await tx.recipeView.deleteMany({ where: { userId } });
    await tx.likedRecipe.deleteMany({ where: { userId } });
    await tx.favoriteRecipe.deleteMany({ where: { userId } });
    await tx.message.deleteMany({ where: { OR: [{ receiverId: userId }, { senderId: userId }] } });
    await Promise.all(
      foundUser.recipes.map((recipe) => {
        return RecipeController.deleteRecipeChain(deleteTransaction, tx, recipe.id);
      })
    );
    await tx.user.delete({ where: { id: userId } });
  },
};

module.exports = UserController;
