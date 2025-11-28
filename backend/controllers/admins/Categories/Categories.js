const Categories = require("../../../models/extra/categories");
const { uploadSingleImage, deleteImage } = require('../../../utils/cloudinary');
const { deleteFile } = require('../../../middlewares/multer');

const cache = new Map(); 


const clearCategoriesCache = () => {
  cache.delete("categories_all");
};

exports.createCategories = async (req, res) => {
  try {
    const { title, screen, badge, position, is_active } = req.body;
    let imageData = {};

    // Upload Image (if given)
    if (req.file) {
      const uploaded = await uploadSingleImage(req.file.path);
      imageData = {
        url: uploaded.image,
        public_id: uploaded.public_id
      };

      deleteFile(req.file.path);
    }

    // Create Category
    const category = await Categories.create({
      title,
      screen,
      badge,
      position,
      is_active,
      image: imageData
    });

    // Clear cache
    clearCategoriesCache();

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: category
    });

  } catch (error) {
    console.error("Create Category Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create category",
      error: error.message
    });
  }
};

exports.getAllCategories = async (req, res) => {
  try {
    // Check Cache
    if (cache.has("categories_all")) {
      return res.status(200).json({
        success: true,
        message: "Categories fetched from cache",
        data: cache.get("categories_all")
      });
    }

    const categories = await Categories.find().sort({ position: 1 });

    // Store in Cache
    cache.set("categories_all", categories);

    res.status(200).json({
      success: true,
      message: "Categories fetched successfully",
      data: categories
    });

  } catch (error) {
    console.error("Get All Categories Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch categories",
      error: error.message
    });
  }
};


exports.getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const CACHE_KEY = `category_${id}`;

    if (cache.has(CACHE_KEY)) {
      return res.status(200).json({
        success: true,
        message: "Category fetched from cache",
        data: cache.get(CACHE_KEY)
      });
    }

    const category = await Categories.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found"
      });
    }

    // Save into cache
    cache.set(CACHE_KEY, category);

    res.status(200).json({
      success: true,
      message: "Category fetched successfully",
      data: category
    });

  } catch (error) {
    console.error("Get Category Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch category",
      error: error.message
    });
  }
};


exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;

    let category = await Categories.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found"
      });
    }

    let imageData = category.image;

    // If new file uploaded → replace old one
    if (req.file) {
      // delete old
      if (imageData?.public_id) {
        await deleteImage(imageData.public_id);
      }

      const uploaded = await uploadSingleImage(req.file.path);
      imageData = {
        url: uploaded.image,
        public_id: uploaded.public_id
      };

      deleteFile(req.file.path);
    }

    // Update Category
    const updated = await Categories.findByIdAndUpdate(
      id,
      {
        ...req.body,
        image: imageData
      },
      { new: true }
    );

    // Clear caches
    clearCategoriesCache();
    cache.delete(`category_${id}`);

    res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: updated
    });

  } catch (error) {
    console.error("Update Category Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update category",
      error: error.message
    });
  }
};


exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Categories.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found"
      });
    }

    // Delete image from cloud
    if (category.image?.public_id) {
      await deleteImage(category.image.public_id);
    }

    await category.deleteOne();

    // Clear caches
    clearCategoriesCache();
    cache.delete(`category_${id}`);

    res.status(200).json({
      success: true,
      message: "Category deleted successfully"
    });

  } catch (error) {
    console.error("Delete Category Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete category",
      error: error.message
    });
  }
};
