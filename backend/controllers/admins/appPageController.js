const AppPage = require("../../models/settings/Pages");

// ============= CONTROLLER: controllers/appPageController.js =============
// Get all app pages
exports.getAllPages = async (req, res) => {
  try {
    const pages = await AppPage.find({ isActive: true }).select(
      "-content"
    );
    res.status(200).json({
      success: true,
      count: pages.length,
      data: pages,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single page by key
exports.getPageByKey = async (req, res) => {
  try {
    const { key } = req.params;
    const page = await AppPage.findOne({
      key: key.toLowerCase(),
      isActive: true,
    });

    if (!page) {
      return res
        .status(404)
        .json({ success: false, message: "Page not found" });
    }

    res.status(200).json({ success: true, data: page });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create new app page
exports.createPage = async (req, res) => {
  try {
    const {
      key,
      title,
      subtitle,
      content,
      pageType,
      appVersion,
      language,
      displaySettings,
      extraData,
    } = req.body;

    const newPage = await AppPage.create({
      key,
      title,
      subtitle,
      content,
      pageType,
      appVersion,
      language,
      displaySettings,
      extraData,
    });

    res.status(201).json({
      success: true,
      message: "Page created successfully",
      data: newPage,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(400)
        .json({
          success: false,
          message: `Key '${error.keyValue.key}' already exists`,
        });
    }
    res.status(400).json({ success: false, message: error.message });
  }
};

// Update app page
exports.updatePage = async (req, res) => {
  try {
    const { key } = req.params;
    const updates = req.body;

    const page = await AppPage.findOneAndUpdate(
      { key: key.toLowerCase() },
      updates,
      { new: true, runValidators: true }
    );

    if (!page) {
      return res
        .status(404)
        .json({ success: false, message: "Page not found" });
    }

    res.status(200).json({
      success: true,
      message: "Page updated successfully",
      data: page,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Delete app page
exports.deletePage = async (req, res) => {
  try {
    const { key } = req.params;

    const page = await AppPage.findOneAndDelete({ key: key.toLowerCase() });

    if (!page) {
      return res
        .status(404)
        .json({ success: false, message: "Page not found" });
    }

    res.status(200).json({
      success: true,
      message: "Page deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Soft delete (deactivate)
exports.deactivatePage = async (req, res) => {
  try {
    const { key } = req.params;

    const page = await AppPage.findOneAndUpdate(
      { key: key.toLowerCase() },
      { isActive: false },
      { new: true }
    );

    if (!page) {
      return res
        .status(404)
        .json({ success: false, message: "Page not found" });
    }

    res.status(200).json({
      success: true,
      message: "Page deactivated successfully",
      data: page,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
