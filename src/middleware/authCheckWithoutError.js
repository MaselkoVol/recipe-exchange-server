const jwt = require("jsonwebtoken");

const authCheckWithoutError = (req, res, next) => {
  const authHeader = req.headers.Authorization || req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    req.user = null;
    return next();
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      req.user = null;
      return next();
    }
    req.user = decoded; // { id: userId, isAdmin: isAdmin }
    return next();
  });
};

module.exports = authCheckWithoutError;
