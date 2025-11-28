const AppSettings = require("../../../models/settings/AppSettings");
const { uploadSingleImage, deleteImage } = require("../../../utils/cloudinary");
const { deleteFile } = require("../../../middlewares/multer");

const getSettingsInstance = async () => {
  let settings = await AppSettings.findOne();
  if (!settings) {
    throw new Error("App settings not initialized. Please configure initial settings.");
  }
  return settings;
};

exports.createOrUpdateAppSettings = async (req, res) => {
  try {
    let updates = { ...req.body };

    // ----------------------------------------------------------
    // 1. Convert stringified JSON fields to objects
    // ----------------------------------------------------------
    const objectFields = ["payment_gateways", "support", "social_media"];

    objectFields.forEach((key) => {
      if (updates[key] && typeof updates[key] === "string") {
        try {
          updates[key] = JSON.parse(updates[key]);
        } catch (err) {
          console.error(`Failed to parse JSON for ${key}:`, err.message);
        }
      }
    });

    // ----------------------------------------------------------
    // 2. Convert boolean fields (they come as "true"/"false" strings)
    // ----------------------------------------------------------
    const booleanFields = [
      "force_update_android",
      "force_update_ios",
      "under_maintenance",
    ];

    booleanFields.forEach((key) => {
      if (updates[key] !== undefined) {
        updates[key] = updates[key] === "true" || updates[key] === true;
      }
    });

    // ----------------------------------------------------------
    // 3. Find existing settings
    // ----------------------------------------------------------
    let settings = await AppSettings.findOne();

    // ----------------------------------------------------------
    // 4. Handle logo upload if file exists
    // ----------------------------------------------------------
    if (req.file) {
      try {
        if (settings?.app_logo?.public_id) {
          await deleteImage(settings.app_logo.public_id).catch((err) =>
            console.warn("Failed to delete old logo:", err.message)
          );
        }

        const result = await uploadSingleImage(req.file.path, "app-settings/logo");

        updates.app_logo = {
          url: result.image,
          public_id: result.public_id,
        };

        await deleteFile(req.file.path);
      } catch (err) {
        console.error("Logo upload error:", err.message);
      }
    }

    // ----------------------------------------------------------
    // 5. If no settings exist, create new
    // ----------------------------------------------------------
    if (!settings) {
      const newSettings = await AppSettings.create(updates);
      return res.status(201).json({
        success: true,
        message: "App settings created successfully",
        data: newSettings,
      });
    }

    // ----------------------------------------------------------
    // 6. Merge updates into existing settings
    // ----------------------------------------------------------
    Object.keys(updates).forEach((key) => {
      const value = updates[key];

      if (value === undefined || value === null || value === "") return;

      // Merge nested fields
      if (objectFields.includes(key)) {
        settings[key] = { ...settings[key]?.toObject(), ...value };
      }

      // Logo update
      else if (key === "app_logo") {
        settings[key] = value;
      }

      // Simple value update
      else {
        settings[key] = value;
      }
    });

    // Mark nested fields modified so Mongoose saves them
    objectFields.forEach((key) => settings.markModified(key));

    // ----------------------------------------------------------
    // 7. Save updated settings
    // ----------------------------------------------------------
    await settings.save();

    return res.status(200).json({
      success: true,
      message: "App settings updated successfully",
      data: settings,
    });
  } catch (error) {
    console.error("Error in createOrUpdateAppSettings:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update app settings",
      error: error.message,
    });
  }
};


exports.getAppSettings = async (req, res) => {
  try {
    const settings = await AppSettings.findOne();

    if (!settings) {
      return res.status(404).json({
        success: false,
        message: "App settings not configured yet",
      });
    }

    const safeSettings = settings.toObject();

    if (req.user?.role !== "admin") {
      delete safeSettings.payment_gateways?.razorpay?.key_secret;
      delete safeSettings.google_maps_api_key;
    }

    return res.status(200).json({
      success: true,
      data: safeSettings,
    });
  } catch (error) {
    console.error("Error in getAppSettings:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

exports.getClientAppSettings = async (req, res) => {
  try {
    const settings = await AppSettings.findOne().select({
      "payment_gateways.razorpay.key_secret": 0,
      "payment_gateways.razorpay.key_id": 0,
      google_maps_api_key: 0,
    });

    if (!settings) {
      return res.status(404).json({
        success: false,
        message: "App settings not found",
      });
    }

    res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error("Error in getClientAppSettings:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
