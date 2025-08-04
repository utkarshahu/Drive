const express = require("express");
const app = express();
const userRouter = require("./routes/user.routes");
const indexRouter = require("./routes/index.routes");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");

dotenv.config();
const connectToDB = require("./config/db");

connectToDB();

// Corrected the typo here
app.set("view engine", "ejs");

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use("/", indexRouter);
app.use("/user", userRouter);

app.listen(3000, () => {
    console.log("Server started at port http://localhost:3000");
});
