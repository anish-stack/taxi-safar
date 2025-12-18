const express = require("express");
const protect = require("../middlewares/auth");
const {
  getAppSettings,
  getClientAppSettings,
  createOrUpdateAppSettings,
} = require("../controllers/admins/settings/Settings");
const { upload } = require("../middlewares/multer");
const {  createBanner,
  getBanners,
  getSingleBanner,
  updateBanner,
  deleteBanner, } = require("../controllers/extra/Banner.controller");

const admin = express.Router();


admin.post("/settings",upload.single("logo"),createOrUpdateAppSettings);
admin.get("/settings",getAppSettings);
admin.get("/settings/client", getClientAppSettings);


admin.post("/banner", upload.single("image"), createBanner);
admin.get("/banner", getBanners);
admin.get("/banner/:id", getSingleBanner);
admin.put("/banner/:id", upload.single("image"), updateBanner);
admin.delete("/banner/:id", deleteBanner);

module.exports = admin;
