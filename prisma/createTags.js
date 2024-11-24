const prisma = require("../src/prismaClient");

const tagCategories = [
  [{ name: "Type of Food", id: "" }, ["Breakfast", "Lunch", "Dinner", "Snack", "Dessert", "Appetizer", "Side Dish"]],
  [
    { name: "Dietary Preferences", id: "" },
    ["Vegetarian", "Vegan", "Gluten-Free", "Dairy-Free", "Low-Carb", "Paleo", "Keto"],
  ],
  [{ name: "Cooking Methods", id: "" }, ["Baking", "Grilling", "Frying", "Steaming", "Boiling"]],
  [{ name: "Occasion", id: "" }, ["Holiday", "Party", "Special Occasion"]],
];

async function createTagCategories() {
  await prisma.recipeTag.deleteMany();
  await prisma.recipeTagCategory.deleteMany();
  for (let i = 0; i < tagCategories.length; i++) {
    const tagCategory = await prisma.recipeTagCategory.create({
      data: { name: tagCategories[i][0].name },
    });
    tagCategories[i][0].id = tagCategory.id;
  }
  for (let i = 0; i < tagCategories.length; i++) {
    await prisma.recipeTag.createMany({
      data: tagCategories[i][1].map((category) => ({
        name: category,
        tagCategoryId: tagCategories[i][0].id,
      })),
    });
  }
}

createTagCategories();
