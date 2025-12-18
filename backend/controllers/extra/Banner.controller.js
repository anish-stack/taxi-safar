const Banner = require("../../models/extra/Banner");
const { uploadSingleImage, deleteImage } = require("../../utils/cloudinary");


exports.createBanner = async (req, res) => {
  try {
    const { link, active = true, position } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: "Banner image is required" });
    }

    if (position === undefined) {
      return res.status(400).json({ message: "Position is required" });
    }

    // upload image
    const result = await uploadSingleImage(req.file.path, "banners");

    const banner = await Banner.create({
      url: result.image ||  result.url,
      publicId: result.public_id,
      link,
      active,
      position,
    });

    return res.status(201).json({
      success: true,
      message: "Banner created successfully",
      data: banner,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * =====================================
 * GET ALL BANNERS
 * =====================================
 */
exports.getBanners = async (req, res) => {
  try {
    const { active, link, position } = req.query;

    const filter = {};

    // filter by active (boolean)
    if (active !== undefined) {
      filter.active = active === "true";
    }

    // filter by link (partial match allowed)
    if (link) {
      filter.link = { $regex: link, $options: "i" };
    }

    // filter by position (number)
    if (position !== undefined) {
      filter.position = Number(position);
    }

    const banners = await Banner.find(filter).sort({ position: 1 });

    return res.status(200).json({
      success: true,
      count: banners.length,
      data: banners,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * =====================================
 * GET SINGLE BANNER
 * =====================================
 */
exports.getSingleBanner = async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);

    if (!banner) {
      return res.status(404).json({ message: "Banner not found" });
    }

    return res.status(200).json({
      success: true,
      data: banner,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * =====================================
 * UPDATE BANNER
 * =====================================
 */
exports.updateBanner = async (req, res) => {
  try {
    const { link, active, position } = req.body;

    const banner = await Banner.findById(req.params.id);

    if (!banner) {
      return res.status(404).json({ message: "Banner not found" });
    }

    // if new image uploaded → replace old image
    if (req.file) {
      if (banner.publicId) {
        await deleteImage(banner.publicId);
      }

      const result = await uploadSingleImage(req.file.path, "banners");
      banner.url = result.image || result.url;
      banner.publicId = result.public_id;
    }

    if (link !== undefined) banner.link = link;
    if (active !== undefined) banner.active = active;
    if (position !== undefined) banner.position = position;

    await banner.save();

    return res.status(200).json({
      success: true,
      message: "Banner updated successfully",
      data: banner,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * =====================================
 * DELETE BANNER
 * =====================================
 */
exports.deleteBanner = async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);

    if (!banner) {
      return res.status(404).json({ message: "Banner not found" });
    }

    // delete image from cloudinary
    if (banner.publicId) {
      await deleteImage(banner.publicId);
    }

    await banner.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Banner deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
