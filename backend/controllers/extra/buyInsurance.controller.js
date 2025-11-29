const BuyInsurance = require("../../models/extra/Insurance");
const Driver = require("../../models/driver/driver.model");

const validateInsuranceInput = (data) => {
  const errors = {};

  if (!data.full_name || data.full_name.trim() === "") {
    errors.full_name = "Full name is required";
  }

  if (!data.contact_number || !/^[0-9]{10}$/.test(data.contact_number)) {
    errors.contact_number = "Valid 10-digit phone number required";
  }

  if (!data.vehicle_number || data.vehicle_number.trim() === "") {
    errors.vehicle_number = "Vehicle number is required";
  }

  if (!data.budget || isNaN(Number(data.budget)) || Number(data.budget) < 500) {
    errors.budget = "Budget must be at least ₹500";
  }

  if (
    data.insurance_type &&
    !["third_party", "comprehensive", "zero_dep", "unknown"].includes(
      data.insurance_type
    )
  ) {
    errors.insurance_type = "Invalid insurance type";
  }

  return errors;
};

// -------------------------------
// CREATE INSURANCE REQUEST
// -------------------------------
exports.createInsurance = async (req, res) => {
  try {
    const driverId = req.user?._id;

    const validationErrors = validateInsuranceInput(req.body);
    if (Object.keys(validationErrors).length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationErrors,
      });
    }

    const newRequest = await BuyInsurance.create({
      driverId,
      ...req.body,
    });

    return res.status(201).json({
      success: true,
      message: "Insurance request submitted successfully",
      data: newRequest,
    });
  } catch (error) {
    console.error("Create Insurance Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to submit insurance request",
      error: error.message,
    });
  }
};

// -------------------------------
// GET MY INSURANCE REQUESTS (Driver)
// -------------------------------
exports.getMyInsurance = async (req, res) => {
  try {
    const driverId = req.user?._id;

    const fourDaysAgo = new Date();
    fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);

    const data = await BuyInsurance.find({
      driverId,
      createdAt: { $gte: fourDaysAgo }, // show only last 4 days
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Get My Insurance Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch your insurance requests",
      error: error.message,
    });
  }
};

// -------------------------------
// ADMIN — GET ALL WITH FILTERS
// -------------------------------
exports.getAllInsurance = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const status = req.query.status || null;
    const driver = req.query.driver || null;

    let filters = {};

    if (status) filters.status = status;
    if (driver) filters.driverId = driver;

    const data = await BuyInsurance.find(filters)
      .populate("driverId", "driver_name driver_contact_number")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await BuyInsurance.countDocuments(filters);

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
    console.error("GetAll Insurance Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch insurance records",
      error: error.message,
    });
  }
};

exports.getInsuranceById = async (req, res) => {
  try {
    const id = req.params.id;

    const data = await BuyInsurance.findById(id);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Get My Insurance Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch your insurance requests",
      error: error.message,
    });
  }
};
// -------------------------------
// UPDATE STATUS (Admin)
// -------------------------------
exports.updateInsuranceStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["pending", "processing", "completed", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    const updated = await BuyInsurance.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Record not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Status updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Update Status Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update status",
      error: error.message,
    });
  }
};

// -------------------------------
// DELETE REQUEST (Driver or Admin)
// -------------------------------
exports.deleteInsurance = async (req, res) => {
  try {
    const { id } = req.params;
    const driverId = req.user?._id;

    const record = await BuyInsurance.findById(id);

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Insurance request not found",
      });
    }


    await record.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Record deleted successfully",
    });
  } catch (error) {
    console.error("Delete Insurance Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete record",
      error: error.message,
    });
  }
};
