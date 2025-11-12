const VehiclesBrands = require('../../../models/driver_vehicles/driver_vehicles');
const { uploadSingleImage, deleteImage } = require('../../../utils/cloudinary');
const { deleteFile } = require('../../../middlewares/multer');

exports.createVehicleBrand = async (req, res) => {
  try {
    console.log("req.body", req.body);

    const { brandName, vehicleNames } = req.body || {};
    const file = req.file;

    // Validate brand name
    if (!brandName) {
      if (file) deleteFile(file.filename);
      return res.status(400).json({ success: false, message: 'Brand name is required' });
    }

    // Upload brand logo
    let uploadedLogo = null;
    if (file) {
      uploadedLogo = await uploadSingleImage(file.path, 'vehicle_brands');
      deleteFile(file.filename);
    }

    // ✅ Cleanly parse vehicleNames
    let parsedVehicleNames = [];

    if (Array.isArray(vehicleNames)) {
      // Already an array (form-data as vehicleNames[0], vehicleNames[1], ...)
      parsedVehicleNames = vehicleNames;
    } else if (typeof vehicleNames === 'string') {
      try {
        // Try to parse JSON (e.g. '["Swift","Baleno"]')
        const jsonParsed = JSON.parse(vehicleNames);
        if (Array.isArray(jsonParsed)) {
          parsedVehicleNames = jsonParsed.map(v => v.trim());
        } else {
          parsedVehicleNames = vehicleNames.split(',').map(v => v.trim());
        }
      } catch {
        // If JSON.parse fails, fallback to comma split
        parsedVehicleNames = vehicleNames.split(',').map(v => v.trim());
      }
    }

    // Create new brand
    const newBrand = new VehiclesBrands({
      brandName: brandName.trim(),
      brandLogo: uploadedLogo
        ? { url: uploadedLogo.image, public_id: uploadedLogo.public_id }
        : {},
      vehicleNames: parsedVehicleNames,
    });

    await newBrand.save();

    res.status(201).json({
      success: true,
      message: 'Vehicle brand created successfully',
      data: newBrand,
    });
  } catch (error) {
    console.error('❌ Error creating vehicle brand:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};


// ✅ UPDATE VEHICLE BRAND
exports.updateVehicleBrand = async (req, res) => {
  try {
    const { id } = req.params;
    const { brandName, vehicleNames } = req.body || {};
    const file = req.file;

    const brand = await VehiclesBrands.findById(id);
    if (!brand) {
      if (file) deleteFile(file.filename);
      return res.status(404).json({ success: false, message: 'Brand not found' });
    }

    // Update logo if new file uploaded
    if (file) {
      if (brand.brandLogo?.public_id) await deleteImage(brand.brandLogo.public_id);
      const uploadedLogo = await uploadSingleImage(file.path, 'vehicle_brands');
      deleteFile(file.filename);
      brand.brandLogo = { url: uploadedLogo.image, public_id: uploadedLogo.public_id };
    }

    if (brandName) brand.brandName = brandName.trim();
    if (vehicleNames) {
      brand.vehicleNames = Array.isArray(vehicleNames)
        ? vehicleNames
        : vehicleNames.split(',').map(v => v.trim());
    }

    await brand.save();

    res.status(200).json({
      success: true,
      message: 'Vehicle brand updated successfully',
      data: brand,
    });
  } catch (error) {
    console.error('❌ Error updating vehicle brand:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ✅ DELETE VEHICLE BRAND
exports.deleteVehicleBrand = async (req, res) => {
  try {
    const { id } = req.params;
    const brand = await VehiclesBrands.findById(id);
    if (!brand) return res.status(404).json({ success: false, message: 'Brand not found' });

    if (brand.brandLogo?.public_id) await deleteImage(brand.brandLogo.public_id);
    await VehiclesBrands.findByIdAndDelete(id);

    res.status(200).json({ success: true, message: 'Brand deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting vehicle brand:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ✅ GET ALL BRANDS (LOGO + NAME)
exports.getAllBrandsWithLogoAndName = async (req, res) => {
  try {
    const brands = await VehiclesBrands.find({}, 'brandName brandLogo vehicleNames').sort({
      brandName: 1,
    });

    res.status(200).json({
      success: true,
      message: 'Brands fetched successfully',
      data: brands,
    });
  } catch (error) {
    console.error('❌ Error fetching brands:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ✅ GET VEHICLES BY BRAND NAME OR ID
exports.getVehicleNamesByBrand = async (req, res) => {
  try {
    const { id } = req.params;
    const brand = await VehiclesBrands.findById(id, 'brandName vehicleNames');

    if (!brand)
      return res.status(404).json({ success: false, message: 'Brand not found' });

    res.status(200).json({
      success: true,
      message: 'Vehicle names fetched successfully',
      data: {
        brandName: brand.brandName,
        vehicleNames: brand.vehicleNames,
      },
    });
  } catch (error) {
    console.error('❌ Error fetching vehicles by brand:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
