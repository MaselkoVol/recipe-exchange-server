const prisma = require("../prismaClient");
const { accessDenied, internalServerError } = require("../utils/errorHanders");
const { userAvatarNameToUrl } = require("../utils/imageNamesToUrl");

const FollowsController = {
  follow: async (req, res) => {
    const { followingId } = req.params;
    const userId = req.user.id;

    if (followingId === userId) {
      return res.status(400).send({ error: "You can't follow yourself" });
    }
    try {
      const foundFollowing = await prisma.follows.findFirst({
        where: { AND: [{ followerId: userId }, { followingId: followingId }] },
      });
      if (foundFollowing) {
        return res.status(203).send({ message: "User is already followed by current user" });
      }
      await prisma.follows.create({
        data: {
          followerId: userId,
          followingId: followingId,
        },
      });
      return res.sendStatus(200);
    } catch (error) {
      console.log(error);
      return internalServerError(res);
    }
  },
  unfollow: async (req, res) => {
    const { followingId } = req.params;
    const userId = req.user.id;
    try {
      const foundFollowing = await prisma.follows.findFirst({
        where: { AND: [{ followerId: userId }, { followingId: followingId }] },
      });
      if (!foundFollowing) {
        return res.status(203).send({ message: "Current user doen't follow this user" });
      }
      await prisma.follows.deleteMany({
        where: { AND: [{ followerId: userId }, { followingId: followingId }] },
      });
      return res.sendStatus(200);
    } catch (error) {
      console.log(error);
      return internalServerError(res);
    }
  },
  getAnyUserFollowers: (req, res) => {
    const { id } = req.params;
    FollowsController.getUserFollowers(req, res, id);
  },
  getCurrentUserFollowers: (req, res) => {
    const id = req.user.id;
    FollowsController.getUserFollowers(req, res, id);
  },
  getUserFollowers: async (req, res, id) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    try {
      const searchQuery = {
        AND: [
          { followingId: id },
          {
            follower: {
              OR: [
                {
                  email: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
                {
                  name: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              ],
            },
          },
        ],
      };
      const followers = await prisma.follows.findMany({
        where: searchQuery,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          follower: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
              _count: {
                select: {
                  followers: true,
                  following: true,
                },
              },
            },
          },
        },
      });
      followers.forEach((followerInfo) => {
        const follower = followerInfo.follower;
        if (follower.avatarUrl) {
          follower.avatarUrl = userAvatarNameToUrl(follower.avatarUrl);
        }
        const followersCount = follower._count.following;
        const followingCount = follower._count.followers;
        delete follower._count;
        follower.followersCount = followersCount;
        follower.followingCount = followingCount;
      });
      const followersCount = await prisma.follows.count({ where: searchQuery });

      const finalResult = {
        data: followers,
        meta: {
          page,
          limit,
          totalPages: Math.ceil(followersCount / limit),
        },
      };
      return res.json(finalResult);
    } catch (error) {
      console.log(error);
      return internalServerError(res);
    }
  },
  getAnyUserFollowing: (req, res) => {
    const { id } = req.params;
    FollowsController.getUserFollowing(req, res, id);
  },
  getCurrentUserFollowing: (req, res) => {
    const id = req.user.id;
    FollowsController.getUserFollowing(req, res, id);
  },
  getUserFollowing: async (req, res, id) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    try {
      const searchQuery = {
        AND: [
          { followerId: id },
          {
            following: {
              OR: [
                {
                  email: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
                {
                  name: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              ],
            },
          },
        ],
      };
      const foundFollowing = await prisma.follows.findMany({
        where: searchQuery,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          following: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
              _count: {
                select: {
                  followers: true,
                  following: true,
                },
              },
            },
          },
        },
      });
      foundFollowing.forEach((followingInfo) => {
        const following = followingInfo.following;
        if (following.avatarUrl) {
          following.avatarUrl = userAvatarNameToUrl(following.avatarUrl);
        }
        const followersCount = following._count.following;
        const followingCount = following._count.followers;
        delete following._count;
        following.followersCount = followersCount;
        following.followingCount = followingCount;
      });
      const followingCount = await prisma.follows.count({ where: searchQuery });

      const finalResult = {
        data: foundFollowing,
        meta: {
          page,
          limit,
          totalPages: Math.ceil(followingCount / limit),
        },
      };
      return res.json(finalResult);
    } catch (error) {
      console.log(error);
      return internalServerError(res);
    }
  },
};

module.exports = FollowsController;
