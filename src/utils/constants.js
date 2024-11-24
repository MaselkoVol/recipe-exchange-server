const BASE_IP = process.env.NODE_ENV === "production" ? "0.0.0.0" : "0.0.0.0"; // 192.168.50.250
const port = process.env.PORT || 5000;
const BASE_URL = `http://${BASE_IP}:${port}`;
const REAL_URL = "https://recipe-exchange-server.onrender.com";

module.exports = {
  BASE_URL,
  BASE_IP,
  port,
  REAL_URL,
};
