const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");

async function removeBackground(filePath) {
  return new Promise((resolve, reject) => {
    console.log("🟢 Starting background removal for:", filePath);

    const ext = path.extname(filePath);
    const outputPath = filePath.replace(ext, "_no_bg.png"); // always save as PNG
    console.log("🟢 Output path will be:", outputPath);

    // Run rembg command
    exec(`rembg i "${filePath}" "${outputPath}"`, (error, stdout, stderr) => {
      if (error) {
        console.error("❌ Rembg error:", stderr);
        return reject(error);
      }
      console.log("✅ Background removed successfully:", outputPath);
      resolve(outputPath);
    });
  });
}

module.exports = removeBackground;
