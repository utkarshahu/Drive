require('dotenv').config(); // ✅ Always first

const express = require("express");
const multer = require("multer");
const mongoose = require("mongoose");
const { storage } = require("../cloudConfig"); // ✅ Cloudinary config
const upload = multer({ storage });
const {cloudinary } = require("../cloudConfig")
const crypto = require("crypto");
const fileModel = require("../models/files.models");
const userModel = require("../models/user.model");
const authMiddleware = require("../middlewares/auth");

const router = express.Router();

// ✅ GET: Render Home Page with User's Files
router.get("/home", authMiddleware, async (req, res) => {
  try {
    // console.log("🔁 Home route hit");

    const userObjectId = new mongoose.Types.ObjectId(req.user.userId); // ✅ Convert to ObjectId

    const userFiles = await fileModel.find({ user: req.user.userId
        
     });

    // console.log("📂 Files fetched for:", req.user.userId);
    // console.log(userFiles);

    res.render("home.ejs", {
      files: userFiles, // ✅ Pass files to EJS
    });
  } catch (err) {
    console.error("❌ Error fetching files:", err);
    res.status(500).send("Internal Server Error");
  }
});

// ✅ POST: Handle File Upload
router.post("/upload-file", authMiddleware, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded ❌" });
    }

    const newFile = await fileModel.create({
      path: req.file.path,
      originalname: req.file.originalname,
      user: req.user.userId,
    });

   
    // res.json(newFile);
    res.redirect("/home")
  } catch (err) {
    console.error("❌ Upload error:", err);
    res.status(500).json({ message: "Error uploading file", error: err.message });
  }
});


// router.get('/download/:id', authMiddleware, async (req, res) => {
//   try {
//     const loggedInUserId = req.user.userId;
//     const fileId = req.params.id;

//     console.log('Download requested by:', loggedInUserId, 'for file:', fileId);

//     // Step 1: Find file
//     const file = await fileModel.findOne({ _id: fileId, user: loggedInUserId });

//     if (!file) {
//       return res.status(401).json({ message: 'Unauthorized' });
//     }

//     // Step 2: Modify Cloudinary URL to add `fl_attachment`
//     const originalUrl = file.path;

//     // Insert fl_attachment after /upload
//     const downloadUrl = originalUrl.replace('/upload/', '/upload/fl_attachment/');

//     console.log('Generated Download URL:', downloadUrl);

//     // Step 3: Redirect to new URL
//     res.redirect(downloadUrl);

//   } catch (error) {
//     console.error('Download error:', error);
//     res.status(500).json({ message: 'Server Error' });
//   }
// });
const activeDownloads = new Map(); // Store generated timestamps

router.get("/download/:id", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const fileId = req.params.id;

    const file = await fileModel.findOne({ _id: fileId, user: userId });
    if (!file) {
      return res.status(404).json({ message: "File not found or unauthorized access." });
    }

    // Check if this file's download link is still active
    const requestedAt = activeDownloads.get(fileId);
    const currentTime = Math.floor(Date.now() / 1000);
    const expiresInSec = 5; // Expiry time in seconds

    if (requestedAt && currentTime - requestedAt > expiresInSec) {
      return res.status(401).json({ message: "Download link has expired." });
    }

    // Extract public ID
    const fileUrl = file.path;
    const parts = fileUrl.split("/");
    const versionIndex = parts.findIndex(p => /^v\d+/.test(p));
    const publicIdWithExt = parts.slice(versionIndex + 1).join("/");
    const publicId = publicIdWithExt.replace(/\.[^/.]+$/, "");

    // Determine resource type
    const fileExtension = publicIdWithExt.split('.').pop().toLowerCase();
    const resourceType = ['jpg', 'jpeg', 'png', 'gif', 'bmp'].includes(fileExtension)
      ? 'image'
      : ['pdf', 'doc', 'docx'].includes(fileExtension)
        ? 'raw'
        : 'auto';

    // Generate signed Cloudinary URL
    const signedUrl = cloudinary.url(publicId, {
      type: "upload",
      resource_type: resourceType,
      sign_url: true,
      attachment: file.originalname,
    });

    // Store the time when this file's download was generated
    activeDownloads.set(fileId, currentTime);

    console.log("🔒 Expiring Signed URL:", signedUrl);
    res.redirect(signedUrl);
  } catch (err) {
    console.error("Download error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/download/:id", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const fileId = req.params.id;

    // Step 1: Verify file ownership
    const file = await fileModel.findOne({ _id: fileId, user: userId });
    if (!file) {
      return res.status(404).json({ message: "File not found or unauthorized access." });
    }

    // Step 2: Extract Cloudinary publicId from URL
    const fileUrl = file.path;
    const parts = fileUrl.split("/");
    const versionIndex = parts.findIndex(p => /^v\d+/.test(p));
    const publicIdWithExt = parts.slice(versionIndex + 1).join("/");
    const publicId = publicIdWithExt.replace(/\.[^/.]+$/, "");

    // Step 3: Determine file type
    const fileExtension = publicIdWithExt.split('.').pop().toLowerCase();
    const resourceType = ['jpg', 'jpeg', 'png', 'gif', 'bmp'].includes(fileExtension)
      ? 'image'
      : ['pdf', 'doc', 'docx'].includes(fileExtension)
        ? 'raw'
        : 'auto';

    // Step 4: Generate signed URL with 10-second expiry (expires_at = now + 10 seconds)
    const expiresAt = Math.floor(Date.now() / 1000) + 10;

    const signedUrl = cloudinary.url(publicId, {
      type: "upload",
      resource_type: resourceType,
      sign_url: true,
      secure: true,
      expires_at: expiresAt
    });

    console.log("🕒 10-sec expiring link generated:", signedUrl);

    // Step 5: Redirect to signed URL
    res.redirect(signedUrl);
  } catch (err) {
    console.error("Download error:", err);
    res.status(500).json({ message: "Server error" });
  }
});


module.exports = router;
