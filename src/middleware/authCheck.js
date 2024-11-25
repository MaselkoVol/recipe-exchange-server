const jwt = require("jsonwebtoken");

const authCheck = (req, res, next) => {
  const authHeader = req.headers.Authorization || req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    console.log("Auth fail");
    return res.status(403).send({ error: "Access denied" });
  }
  const token = authHeader.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      console.log("Auth fail");
      return res.status(403).send({ error: "Access denied" });
    }
    req.user = decoded; // { id: userId, isAdmin: isAdmin }
    next();
  });
};

module.exports = authCheck;
