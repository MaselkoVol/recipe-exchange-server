const bcrypt = require("bcrypt");
const jdenticon = require("jdenticon");
const prisma = require("../prismaClient");
const jwt = require("jsonwebtoken");
const { internalServerError, allFieldsRequired, accessDenied } = require("../utils/errorHanders");
const fs = require("fs").promises;
const { getFilePath } = require("../utils/getFilePath");

function signAccessToken(userId, isAdmin) {
  return jwt.sign({ id: userId, isAdmin }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "10m",
  });
}
// TODO make password required to be minimum 8 charachters long
const AuthController = {
  // @desc		Register new user
  // @route		POST /api/auth/register
  register: async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return allFieldsRequired(res);
    }
    // store path outside the try catch, so if error occur, I can delete this file
    let avatarPath = "";
    try {
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return res.status(409).send({ error: "This email is already registered." });
      }

      const encryptedPassword = await bcrypt.hash(password, 10);
      const avatar = jdenticon.toPng(name, 200);

      const filename = "avatar-" + Date.now() + "-" + Math.round(Math.random() * 1e9) + ".png";
      avatarPath = getFilePath("public", "uploads", "current", filename);

      fs.writeFile(avatarPath, avatar);

      const user = await prisma.user.create({
        data: {
          name,
          email,
          password: encryptedPassword,
          avatarUrl: filename,
        },
      });

      return res.json(user);
    } catch (error) {
      if (avatarPath && fs.existsSync(avatarPath)) {
        fs.unlinkSync(avatarPath);
      }
      console.error(error);
      return internalServerError(res);
    }
  },

  // @desc		Login existing user
  // @route		POST /api/auth/login
  login: async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return allFieldsRequired(res);
    }
    try {
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (!existingUser) {
        return res.status(401).send({ error: "Incorrect email or password" });
      }
      const valid = await bcrypt.compare(password, existingUser.password);
      if (!valid) {
        return res.status(401).send({ error: "Incorrect email or password" });
      }
      const accessToken = signAccessToken(existingUser.id, existingUser.isAdmin);
      const refreshToken = jwt.sign({ id: existingUser.id }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: "1d" });
      await prisma.user.update({
        where: { id: existingUser.id },
        data: { refreshToken },
      });
      res.cookie("jwt", refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "None",
        maxAge: 24 * 60 * 60 * 1000,
      });
      return res.json({ accessToken });
    } catch (error) {
      console.error(error);
      return internalServerError(res);
    }
  },

  // @desc		refresh token for user
  // @route		POST /api/auth/refresh
  refresh: async (req, res) => {
    const { jwt: refreshToken } = req.cookies;
    if (!refreshToken) {
      return res.status(401).send({ error: "Don't have refresh token" });
    }
    try {
      const existingUser = await prisma.user.findUnique({
        where: { refreshToken },
      });
      if (!existingUser) {
        return accessDenied(res);
      }
      jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, decoded) => {
        if (err || decoded.id !== existingUser.id) {
          return accessDenied(res);
        }
        const accessToken = signAccessToken(existingUser.id, existingUser.isAdmin);
        return res.json(accessToken);
      });
    } catch (error) {
      console.error(error);
      return internalServerError(res);
    }
  },

  // if you create cookie with additional parameters, when you delete cookie, parameters should be the same
  // @desc		logout user
  // @route		POST /api/auth/logout
  logout: async (req, res) => {
    const { jwt: refreshToken } = req.cookies;
    if (!refreshToken) {
      return res.sendStatus(204);
    }
    try {
      const existingUser = await prisma.user.findUnique({
        where: { refreshToken },
      });
      if (!existingUser) {
        res.clearCookie("jwt", { httpOnly: true, secure: true, sameSite: "None" });
        return res.sendStatus(204);
      }

      const updatedUser = await prisma.user.update({
        where: { refreshToken },
        data: { refreshToken: null },
      });
      res.clearCookie("jwt", { httpOnly: true, secure: true, sameSite: "None" });
      res.sendStatus(200);
    } catch (error) {
      return internalServerError(res);
    }
  },
};

module.exports = AuthController;
