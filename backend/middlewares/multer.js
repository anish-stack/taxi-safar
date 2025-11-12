// upload.js
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Upload directory
const UPLOAD_DIR = path.join(__dirname, '../uploads');

// Ensure the uploads folder exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  console.log(`📁 Created upload directory at: ${UPLOAD_DIR}`);
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      cb(null, UPLOAD_DIR);
    } catch (error) {
      console.error('❌ Error setting destination path:', error);
      cb(error);
    }
  },

  filename: (req, file, cb) => {
    try {
      const uniqueSuffix = Date.now() + '-' + file.originalname.replace(/\s+/g, '_');
      // console.log(`✅ Saving file as: ${uniqueSuffix}`);
      cb(null, uniqueSuffix);
    } catch (error) {
      console.error('❌ Error generating filename:', error);
      cb(error);
    }
  },
});

// Initialize Multer
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'image/jpeg',
      'image/png',
      'application/pdf',
      'image/jpg',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('❌ Invalid file type. Only JPG, PNG, and PDF are allowed.'));
    }
  },
});

// Delete file helper
const deleteFile = (filename) => {
  try {
    const filePath = path.join(UPLOAD_DIR, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`🗑️ Deleted file: ${filename}`);
    } else {
      // console.warn(`⚠️ File not found for deletion: ${filename}`);
    }
  } catch (error) {
    console.error('❌ Error deleting file:', error);
  }
};

module.exports = { upload, deleteFile };
