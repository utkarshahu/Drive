// cloudConfig.js
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configure Cloudinary
cloudinary.config({ 
    cloud_name: process.env.API_NAME, 
    api_key: process.env.API_KEY, 
    api_secret: process.env.API_SECRET 
});

// Setup Cloudinary Storage
const storage = new CloudinaryStorage({
    cloudinary:cloudinary,
    params: async (req, file) => {
        return {
            folder: 'drive',
            public_id: `${file.originalname.split('.')[0]}_${Date.now()}`,
            resource_type: 'auto', // 🔥 Important to support all file types (images, videos, pdfs etc.)
            unique:true,
            type: "authenticated",
            expires_at:  Math.floor(Date.now() / 1000) + 60,
            sign_url: true
        };
    },
});

module.exports = { cloudinary, storage };
