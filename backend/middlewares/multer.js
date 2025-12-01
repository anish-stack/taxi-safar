// middleware/upload.js

const multer = require("multer");
const fs = require("fs");
const path = require("path");

// Define upload directory
const UPLOAD_DIR = path.join(__dirname, "../uploads");

// Create uploads folder if it doesn't exist
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  console.log(`Created upload directory: ${UPLOAD_DIR}`);
}

// Multer disk storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    // Clean filename + add timestamp to avoid conflicts
    const cleanName = file.originalname.replace(/\s+/g, "_");
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${cleanName}`;
    cb(null, uniqueName);
  },
});

// File type filter (only images + PDF)
const fileFilter = (req, file, cb) => {
const allowedTypes = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/svg+xml",
  "application/pdf"
];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new multer.MulterError(
        "LIMIT_UNEXPECTED_FILE",
        "Invalid file type. Only JPG, PNG, and PDF are allowed."
      ),
      false
    );
  }
};

// Main multer instance (used for general uploads)
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter,
});

// Special middleware for Company form — THIS FIXES "Unexpected field"
const companyUpload = upload.fields([
  { name: "logo", maxCount: 1 },
  { name: "signature", maxCount: 1 },
]);

// Optional: General single image upload (e.g. profile photo)
const singleImage = upload.single("image");

// Helper: Delete file from disk
const deleteFile = (filename) => {
  if (!filename) return;

  const filePath = path.join(UPLOAD_DIR, filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    console.log(`Deleted file: ${filename}`);
  }
};

// Optional: Better error handler for Multer errors
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File too large. Maximum size is 10MB.",
      });
    }
    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }
  }
  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message || "File upload error",
    });
  }
  next();
};
}

// Export everything you need
module.exports = {
  upload,              // ← for general use (e.g. upload.array(), upload.single())
  companyUpload,       // ← USE THIS for add-company & update-company routes
  singleImage,         // ← optional: for profile photo, etc.
  deleteFile,
  handleMulterError,   // ← optional: use in error middleware if you want
}