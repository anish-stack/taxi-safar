const BorderTaxPay = require("../../models/extra/BorderTaxPay");
const { uploadSingleImage, deleteImage } = require("../../utils/cloudinary");

/******************************
 * VALIDATION HELPER
 ******************************/
const validateFields = (body) => {
  const required = ["vehicle_number", "border_state", "trip_type"];

  for (let f of required) {
    if (!body[f] || body[f].toString().trim() === "") {
      return `${f.replace("_", " ")} is required`;
    }
  }

  if (!["one_way", "round_trip"].includes(body.trip_type)) {
    return "Invalid trip_type. Must be 'one_way' or 'round_trip'";
  }

  return null;
};

/******************************
 * CREATE BORDER TAX PAY
 ******************************/
exports.createBorderTax = async (req, res) => {
  try {
    const driverId = req.user?._id;

    if (!driverId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Driver not logged in.",
      });
    }

    // Validate Fields
    const validationError = validateFields(req.body);
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    let slip_image = {};

    // Handle Image Upload
    if (req.file) {
      const uploaded = await uploadSingleImage(req.file.buffer, "border_tax_slips");
      slip_image = uploaded;
    }

    const tax = await BorderTaxPay.create({
      driver: driverId,
      vehicle_number: req.body.vehicle_number,
      border_state: req.body.border_state,
      trip_type: req.body.trip_type,
      tax_amount: req.body.tax_amount || null,
      remarks: req.body.remarks || "",
      slip_image,
    });

    return res.status(201).json({
      success: true,
      message: "Border Tax submitted successfully",
      data: tax,
    });
  } catch (error) {
    console.error("Create Border Tax Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to submit border tax",
      error: error.message,
    });
  }
};

/******************************
 * GET ALL BORDER TAX (Driver/Admin)
 ******************************/
exports.getAllBorderTax = async (req, res) => {
  try {
    const driverId = req.user?._id;

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const status = req.query.status || null; // pending, approved, rejected
    const filterDriver = req.query.driver || null; // For admin use

    let filters = {};

    // Driver sees ONLY his own tax payments
    if (req.user.role !== "admin") {
      filters.driver = driverId;
    }

    // Admin can filter by driver
    if (req.user.role === "admin" && filterDriver) {
      filters.driver = filterDriver;
    }

    if (status) filters.status = status;

    const data = await BorderTaxPay.find(filters)
      .populate("driver", "driver_name driver_contact_number")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await BorderTaxPay.countDocuments(filters);

    return res.status(200).json({
      success: true,
      data,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get Border Tax Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch border tax records",
      error: error.message,
    });
  }
};

/******************************
 * GET SINGLE BORDER TAX
 ******************************/
exports.getBorderTaxById = async (req, res) => {
  try {
    const driverId = req.user?._id;
    const { id } = req.params;

    const tax = await BorderTaxPay.findById(id).populate("driver", "driver_name");

    if (!tax) {
      return res.status(404).json({
        success: false,
        message: "Record not found",
      });
    }

    // Driver cannot view other drivers' data
    if (req.user.role !== "admin" && tax.driver?._id.toString() !== driverId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    return res.status(200).json({ success: true, data: tax });
  } catch (error) {
    console.error("Get Single Border Tax Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch record",
      error: error.message,
    });
  }
};

/******************************
 * UPDATE BORDER TAX
 ******************************/
exports.updateBorderTax = async (req, res) => {
  try {
    const driverId = req.user?._id;
    const { id } = req.params;

    const tax = await BorderTaxPay.findById(id);

    if (!tax) {
      return res.status(404).json({ success: false, message: "Record not found" });
    }

    // Only the owner can update (admin can too)
    if (req.user.role !== "admin" && tax.driver.toString() !== driverId.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    // Prevent updates after approval/rejection
    if (tax.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Cannot modify approved/rejected records",
      });
    }

    // Validate fields
    const validationError = validateFields(req.body);
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    // Handle re-upload slip
    if (req.file) {
      if (tax.slip_image?.public_id) {
        await deleteImage(tax.slip_image.public_id);
      }

      const uploaded = await uploadSingleImage(req.file.buffer, "border_tax_slips");
      tax.slip_image = uploaded;
    }

    tax.vehicle_number = req.body.vehicle_number;
    tax.border_state = req.body.border_state;
    tax.trip_type = req.body.trip_type;
    tax.tax_amount = req.body.tax_amount;
    tax.remarks = req.body.remarks || "";

    await tax.save();

    return res.status(200).json({
      success: true,
      message: "Record updated successfully",
      data: tax,
    });
  } catch (error) {
    console.error("Update Border Tax Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update record",
      error: error.message,
    });
  }
};

/******************************
 * APPROVE / REJECT (Admin Only)
 ******************************/
exports.reviewBorderTax = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Admin only" });
    }

    const { id } = req.params;
    const { status } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const tax = await BorderTaxPay.findById(id);

    if (!tax) {
      return res.status(404).json({ success: false, message: "Record not found" });
    }

    tax.status = status;
    tax.reviewed_at = new Date();

    await tax.save();

    return res.status(200).json({
      success: true,
      message: `Record ${status} successfully`,
      data: tax,
    });
  } catch (error) {
    console.error("Review Border Tax Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update status",
      error: error.message,
    });
  }
};

/******************************
 * DELETE BORDER TAX
 ******************************/
exports.deleteBorderTax = async (req, res) => {
  try {
    const driverId = req.user?._id;
    const { id } = req.params;

    const tax = await BorderTaxPay.findById(id);

    if (!tax) {
      return res.status(404).json({ success: false, message: "Record not found" });
    }

    // Only owner or admin
    if (req.user.role !== "admin" && tax.driver.toString() !== driverId.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    // Delete slip image
    if (tax.slip_image?.public_id) {
      await deleteImage(tax.slip_image.public_id);
    }

    await tax.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Border tax record deleted successfully",
    });
  } catch (error) {
    console.error("Delete Border Tax Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete record",
      error: error.message,
    });
  }
};
