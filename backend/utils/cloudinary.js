const cloudinary = require("cloudinary").v2;
require("dotenv").config();
const fs = require("fs").promises;
const streamifier = require("streamifier");

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET
});

const MAX_FILE_SIZE = 50000000; 

const uploadSingleImage = async (fileInput, folder = "images") => {
  try {
    // ---------- CASE 1: Buffer (PDF buffer from puppeteer, or image buffer) ----------
    if (Buffer.isBuffer(fileInput)) {
      if (fileInput.length > MAX_FILE_SIZE) {
        throw new Error(`File too large: ${fileInput.length} bytes`);
      }

      return await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder,
            resource_type: "raw",           // "raw" for PDF, "image" also works but raw is safer
            format: folder.includes("quotation") ? "pdf" : undefined,
          },
          (error, result) => {
            if (error) return reject(error);
            resolve({ image: result.secure_url, public_id: result.public_id });
          }
        );

        streamifier.createReadStream(fileInput).pipe(uploadStream);
      });
    }

    // ---------- CASE 2: Local file path (string) ----------
    if (typeof fileInput === "string") {
      await fs.access(fileInput); // throws if file does not exist

      const stats = await fs.stat(fileInput);
      if (stats.size > MAX_FILE_SIZE) {
        throw new Error(`File too large: ${stats.size} bytes`);
      }

      const result = await cloudinary.uploader.upload(fileInput, {
        folder,
        resource_type: "auto",
      });

      // delete local file after successful upload (optional)
      await fs.unlink(fileInput).catch(() => {});
      return { image: result.secure_url, public_id: result.public_id };
    }

    throw new Error("Invalid file input. Must be Buffer or file path string.");
  } catch (err) {
    console.error("Cloudinary upload error:", err.message);
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
