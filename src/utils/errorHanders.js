const internalServerError = (res) => {
  return res.status(500).send({ error: "Internal server error" });
};

const allFieldsRequired = (res) => {
  return res.status(400).send({ error: "All fields required" });
};

const accessDenied = (res) => {
  return res.status(403).send({ error: "Access denied" });
};
const unauthorized = (res) => {
  return res.status(401).send({ error: "Unauthorized" });
};
const userNotFound = (res) => {
  return res.status(404).send({ error: "User not found" });
};

module.exports = {
  internalServerError,
  allFieldsRequired,
  accessDenied,
  unauthorized,
  userNotFound,
};
