const prisma = require("../prismaClient");
const { BASE_URL } = require("../utils/constants");
const { deleteFileIfExists } = require("../utils/deleteFileIfExists");
const createDeleteTransaction = require("../utils/deleteFilesTransaction");
const { internalServerError, allFieldsRequired } = require("../utils/errorHanders.js");
const { getFilePath } = require("../utils/getFilePath.js");
const { commentImagesNameToUrl, userAvatarNameToUrl } = require("../utils/imageNamesToUrl.js");
const CommentController = {
  createRecipeComment: async (req, res) => {
    const userId = req.user.id;
    const { id: recipeId } = req.params;
    let { text } = req.body;

    let images = null;
    if (req.files && req.files[0]) {
      images = req.files;
    }

    if (!text) {
      deleteFilesDuringError(images);
      return allFieldsRequired(res);
    }
    try {
      const foundRecipe = await prisma.recipe.findUnique({ where: { id: recipeId } });
      if (!foundRecipe) {
        deleteFilesDuringError(images);
        return res.status(404).send({ error: "Recipe not found" });
      }
      const creationData = {
        recipeId,
        userId,
        text,
      };
      if (images) {
        creationData.images = {
          create: images.map((image) => ({ imageUrl: image.filename })),
        };
      }
      const createdComment = await prisma.recipeComment.create({
        data: creationData,
      });
      const comment = await prisma.recipeComment.findUnique({
        where: { id: createdComment.id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
          images: true,
        },
      });
      comment.user.avatarUrl = BASE_URL + "/uploads/users/" + comment.user.avatarUrl;
      comment.images = comment.images.map((image) => ({
        ...image,
        imageUrl: BASE_URL + "/uploads/recipes/" + image.imageUrl,
      }));
      res.json({ comment });
    } catch (error) {
      console.log(error);
      deleteFilesDuringError(images);
      return internalServerError(res);
    }
  },
  getRecipeComments: async (req, res) => {
    const { id: recipeId } = req.params;
    const user = req.user;
    const commentsPage = parseInt(req.query["comments-page"]) || 1;
    const commentsLimit = parseInt(req.query["comments-limit"]) || 10;

    const userQueryParameters = {
      orderBy: { createdAt: "desc" },
      include: {
        images: {
          select: {
            id: true,
            imageUrl: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    };
    const queryParameters = {
      ...userQueryParameters,
      skip: (commentsPage - 1) * commentsLimit,
      take: commentsLimit,
      orderBy: { rating: "desc" },
    };
    try {
      let comments = [];
      let userComments = [];
      if (!user) {
        comments = await prisma.recipeComment.findMany({ where: { recipeId }, ...queryParameters });
      } else {
        comments = await prisma.recipeComment.findMany({
          where: { AND: [{ recipeId }, { userId: { not: user.id } }] },
          ...queryParameters,
        });
        userComments = await prisma.recipeComment.findMany({
          where: { AND: [{ recipeId }, { userId: user.id }] },
          orderBy: { createdAt: "desc" },
          ...userQueryParameters,
        });
      }
      const prepareComments = (comments) => {
        comments.forEach((comment) => {
          if (comment.images) {
            comment.images = comment.images.map((image) => ({
              ...image,
              imageUrl: commentImagesNameToUrl(image.imageUrl),
            }));
          }
          if (comment.user.avatarUrl) {
            comment.user.avatarUrl = userAvatarNameToUrl(comment.user.avatarUrl);
          }
        });
      };
      prepareComments(comments);
      prepareComments(userComments);
      const totalComments = await prisma.recipeComment.count({ where: { recipeId } });
      const finalResult = {
        comments: {
          userComments: userComments,
          otherComments: comments,
        },
        meta: {
          count: totalComments,
          commentsPage,
          commentsLimit,
          totalPages: Math.ceil(totalComments / commentsLimit),
        },
      };
      res.json(finalResult);
    } catch (error) {
      console.log(error);
      return internalServerError(res);
    }
  },
  // can be used to delete recipe or even user
  deleteCommentChain: async (deleteTransaction, tx, commentId) => {
    const foundComment = await tx.recipeComment.findUnique({
      where: { id: commentId },
      include: { images: true },
    });
    if (!foundComment) {
      return;
    }
    foundComment.images.forEach(async (image) => {
      deleteTransaction.add(getFilePath("public", "uploads", "recipes", image.imageUrl));
    });
    await Promise.all(
      foundComment.images.map((image) => tx.recipeCommentImage.deleteMany({ where: { id: image.id } }))
    );
    await tx.recipeComment.delete({ where: { id: foundComment.id } });
  },
  deleteRecipeComment: async (req, res) => {
    const { id, commentId } = req.params;
    const { id: userId, isAdmin } = req.user;

    try {
      // find recipe of this author with images and tags
      const foundComment = await prisma.recipeComment.findUnique({
        where: { id: commentId },
      });
      if (!foundComment) {
        return res.status(404).send({ error: "Comment not found" });
      }
      if (foundComment.userId !== userId && !isAdmin) {
        return accessDenied(res);
      }
      const deleteTransaction = createDeleteTransaction();
      await prisma.$transaction(async (tx) => {
        await CommentController.deleteCommentChain(deleteTransaction, tx, foundComment.id);
      });
      deleteTransaction.complete();
      return res.status(200).send({ message: "comment was deleted successfully" });
    } catch (error) {
      console.log(error);
      return internalServerError(res);
    }
  },
};

const deleteFilesDuringError = (images) => {
  if (!images) return;
  for (let i = 0; i < images.length; i++) {
    deleteFileIfExists(images[i]);
  }
};

module.exports = CommentController;
