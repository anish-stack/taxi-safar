const jwt = require("jsonwebtoken");
const Driver = require("../models/driver/driver.model");

const protect = async (req, res, next) => {
  try {
    let token;

    // ✅ 1. Check Authorization header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    // ✅ 2. Check cookies
    else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    // ✅ 3. Check query parameters (optional, useful for links or debugging)
    else if (req.query && req.query.token) {
      token = req.query.token;
    }

    // ❌ If still no token, deny access
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, token missing",
      });
    }

    // ✅ Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ Find driver and attach to request
    const driver = await Driver.findById(decoded._id).select("-password");

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found",
      });
    }

    req.user = driver;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error.message);
    return res.status(401).json({
      success: false,
      message:
        error.name === "TokenExpiredError"
          ? "Token expired, please log in again"
          : "Not authorized, invalid token",
    });
  }
};

module.exports = protect;
