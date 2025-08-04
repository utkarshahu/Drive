const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const userModel = require("../models/user.model");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// ✅ Add this route
router.get("/", (req, res) => {
  res.render("register.ejs");
});





// ✅ POST: Handle User Registration
router.post(
  "/register",
  [
    body("first_name")
      .notEmpty().withMessage("First name is required")
      .isLength({ min: 3 }).withMessage("First name must be at least 3 characters"),
    
    body("last_name")
      .notEmpty().withMessage("Last name is required")
      .isLength({ min: 3 }).withMessage("Last name must be at least 3 characters"),

    body("email")
      .trim()
      .isEmail().withMessage("Enter a valid email")
      .isLength({ min: 13 }).withMessage("Email must be at least 13 characters"),

    body("password")
      .isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),

    body("confirm_password").custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error("Passwords do not match");
      }
      return true;
    })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        errors: errors.array(),
        message: "Invalid input ⚠️",
      });
    }

    const { first_name, last_name, email, password } = req.body;

    try {
      // Check if user already exists
      const existingUser = await userModel.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: "Email is already registered ⚠️" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Save new user
      const newUser = await userModel.create({
        first_name,
        last_name,
        email,
        password: hashedPassword,
      });

      return res.status(201).json({
        message: "User registered successfully ✅",
        user: {
          id: newUser._id,
          email: newUser.email,
          name: `${newUser.first_name} ${newUser.last_name}`,
        },
      });
    } catch (err) {
      console.error("Registration Error:", err);
      return res.status(500).json({
        message: "Server error during registration ❌",
        error: err.message,
      });
    }
  }
);

// ✅ GET: Show Login Page
router.get("/login", (req, res) => {
  res.render("login.ejs");
});

// ✅ POST: Handle Login
router.post(
  "/login",
  [
    body("email")
      .trim()
      .isEmail().withMessage("Enter a valid email")
      .isLength({ min: 13 }).withMessage("Email must be at least 13 characters"),

    body("password")
      .notEmpty().withMessage("Password is required"),
  ],
  async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        errors: errors.array(),
        message: "Invalid credentials ⚠️",
      });
    }

    const { email, password } = req.body;

    try {
      // Find user
      const user = await userModel.findOne({ email });
      if (!user) {
        return res.status(400).json({ message: "Invalid email or password ❌" });
      }

      // Match password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: "Invalid email or password ❌" });
      }

      // Generate JWT Token
      const token = jwt.sign(
        {
          userId: user._id,
          email: user.email,
          name: `${user.first_name} ${user.last_name}`,
        },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );

      res.cookie('token',token)

      res.redirect("/home")

      
    } catch (err) {
      console.error("Login Error:", err);
      return res.status(500).json({
        message: "Server error during login ❌",
        error: err.message,
      });
    }
  }
);

module.exports = router;
