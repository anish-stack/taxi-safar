const jwt = require("jsonwebtoken");
const Driver = require("../../models/driver/driver.model");

// ======================= REFRESH ACCESS TOKEN =======================
exports.refreshAccessToken = async (req, res) => {
  try {
    // 1️⃣ Get refresh token from cookie or body
    const refreshToken =
      req.cookies?.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Refresh token missing. Please log in again.",
      });
    }

    // 2️⃣ Verify refresh token
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET
    );

    // 3️⃣ Find driver
    const driver = await Driver.findById(decoded._id);
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found.",
      });
    }

    // 4️⃣ Check if refresh token matches the one stored in DB
    if (driver.refresh_token !== refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired refresh token. Please log in again.",
      });
    }

    // 5️⃣ Generate new access token
    const newAccessToken = driver.generateAuthToken();

    return res.status(200).json({
      success: true,
      message: "Access token refreshed successfully.",
      accessToken: newAccessToken,
    });
  } catch (error) {
    console.error("❌ Error refreshing access token:", error);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired refresh token.",
      error: error.message,
    });
  }
};
