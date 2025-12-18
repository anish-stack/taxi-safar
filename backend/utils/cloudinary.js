const cloudinary = require("cloudinary").v2;
require("dotenv").config();
const fs = require("fs").promises;
const streamifier = require("streamifier");

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});

const MAX_FILE_SIZE = 50000000;

const uploadSingleImage = async (fileInput, folder = "files") => {
  try {
    console.log("📤 Upload started");
    console.log("📁 Target folder:", folder);

    // ---------- CASE 1: Buffer ----------
    if (Buffer.isBuffer(fileInput)) {
      console.log("🧾 Detected Buffer input");
      console.log("📏 Buffer size:", fileInput.length, "bytes");

      if (fileInput.length > MAX_FILE_SIZE) {
        console.error("❌ Buffer exceeds MAX_FILE_SIZE");
        throw new Error(`File too large: ${fileInput.length} bytes`);
      }

      return await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder,
            format:
              folder.includes("invoices") || folder.includes("quotations")
                ? "pdf"
                : undefined,
            resource_type: "raw", // BEST for PDFs
          },
          (error, result) => {
            if (error) {
              console.error("❌ Cloudinary stream upload failed:", error);
              return reject(error);
            }

            console.log("✅ Cloudinary upload success (Buffer)");
            console.log("🔗 URL:", result.secure_url);
            console.log("🆔 Public ID:", result.public_id);

            resolve({
              url: result.secure_url,
              image:result.secure_url,
              public_id: result.public_id,
            });
          }
        );

        console.log("⏫ Streaming buffer to Cloudinary...");
        streamifier.createReadStream(fileInput).pipe(uploadStream);
      });
    }

    // ---------- CASE 2: Local file path ----------
    if (typeof fileInput === "string") {
      console.log("📄 Detected file path input:", fileInput);

      await fs.access(fileInput);
      console.log("✅ File exists");

      const stats = await fs.stat(fileInput);
      console.log("📏 File size:", stats.size, "bytes");

      if (stats.size > MAX_FILE_SIZE) {
        console.error("❌ File exceeds MAX_FILE_SIZE");
        throw new Error(`File too large: ${stats.size} bytes`);
      }

      const isPDF = fileInput.toLowerCase().endsWith(".pdf");
      console.log("📘 Is PDF:", isPDF);

      const result = await cloudinary.uploader.upload(fileInput, {
        folder,
        resource_type: isPDF ? "raw" : "image",
      });

      console.log("✅ Cloudinary upload success (File)");
      console.log("🔗 URL:", result.secure_url);
      console.log("🆔 Public ID:", result.public_id);

      // ✅ FIX: Return consistent structure with 'url' instead of 'image'
      return {
        url: result.secure_url,  // ← Changed from 'image' to 'url'
                      image:result.secure_url,

        public_id: result.public_id,
      };
    }

    console.error("❌ Invalid file input type");
    throw new Error("Invalid file input. Must be Buffer or file path string.");
  } catch (err) {
    console.error("🔥 Cloudinary upload error:", err.message || err);
    throw new Error("Failed to upload file to Cloudinary");
  }
};
const deleteImage = async (public_id) => {
  try {
    await cloudinary.uploader.destroy(public_id);
    console.log("Image deleted successfully");
    return true;
  } catch (error) {
    console.error("Error deleting image:", error.message);
    throw new Error("Failed to delete image");
  }
};

module.exports = { uploadSingleImage, deleteImage };
