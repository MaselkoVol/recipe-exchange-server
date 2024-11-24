const express = require("express");
const cors = require("cors");
const credentials = require("./middleware/credentials");
const corsOptions = require("./config/corsOptions");
const cookieParser = require("cookie-parser");
require("dotenv").config();

const apiRoutes = require("./routes/index");
const { BASE_IP, port, BASE_URL } = require("./utils/constants");

console.log(BASE_IP, port, BASE_URL);
const app = express();

app.use(credentials);
app.use(cors(corsOptions));
app.use(express.static("public"));

// required middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// routes
app.use("/api", apiRoutes);

app.listen(port, BASE_IP, () => console.log(`app is running on ${BASE_URL}`));
