const prisma = require("../prismaClient");
const { internalServerError } = require("../utils/errorHanders");

const ViewsController = {
  addView: async (req, res) => {
    const { recipeId } = req.params;
    const userId = req.user.id;
    try {
      const foundRecipe = await prisma.recipe.findFirst({ where: { id: recipeId } });
      if (!foundRecipe) {
        return res.status(404).send({ erorr: "Recipe not found", active: false });
      }
      const viewedRecipe = await prisma.recipeView.findFirst({ where: { AND: [{ userId }, { recipeId }] } });
      if (viewedRecipe) return res.status(204).send({ message: "Post is already viewed by the user" });

      await prisma.recipeView.create({
        data: {
          userId,
          recipeId,
        },
      });
      return res
        .status(200)
        .send({ message: "Post was added to viewed by user successfully successfully", active: true });
    } catch (error) {
      console.log(error);
      return internalServerError(res);
    }
  },
  isRecipeViewedByUser: async (req, res) => {
    const { recipeId } = req.params;
    const userId = req.user.id;

    try {
      const foundRecipe = await prisma.recipe.findUnique({ where: { id: recipeId } });
      if (!foundRecipe) {
        return res.status(404).send({ erorr: "Recipe not found", active: false });
      }
      const viewedRecipe = await prisma.recipeView.findFirst({ where: { AND: [{ userId }, { recipeId }] } });
      if (viewedRecipe) {
        return res.status(200).send({ message: "Post is viewed by the user", active: true });
      }
      return res.status(204).send({ message: "Recipe is not viewed by the user", active: false });
    } catch (error) {
      console.log(error);
      return internalServerError(res);
    }
  },
};

module.exports = ViewsController;
