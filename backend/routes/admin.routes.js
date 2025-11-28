const express = require("express");
const protect = require("../middlewares/auth");
const {
  getAppSettings,
  getClientAppSettings,
  createOrUpdateAppSettings,
} = require("../controllers/admins/settings/Settings");
const { upload } = require("../middlewares/multer");

const admin = express.Router();


admin.post("/settings",upload.single("logo"),createOrUpdateAppSettings);
admin.get("/settings",getAppSettings);
admin.get("/settings/client", getClientAppSettings);

module.exports = admin;
