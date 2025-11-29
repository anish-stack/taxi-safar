const DriverJob = require("../../models/extra/DriverJobs");
const mongoose = require("mongoose");

// CREATE Driver Job
exports.createJob = async (req, res) => {
  try {
    const {
      title,
      description,
      company,
      salary,
      job_type,
      driver_category,
      location,
      skills = [],
      valid_till,
    } = req.body;

    const driverId = req.user?.id || req.body.driverId;

    if (!driverId || !mongoose.Types.ObjectId.isValid(driverId)) {
      return res.status(400).json({
        success: false,
        message: "Valid driverId is required",
      });
    }

    // Validation
    if (!title?.trim())
      return res
        .status(400)
        .json({ success: false, message: "Title is required" });
    if (!description?.trim())
      return res
        .status(400)
        .json({ success: false, message: "Description is required" });
    if (!company?.name?.trim())
      return res
        .status(400)
        .json({ success: false, message: "Company name is required" });
    if (!location?.address?.trim())
      return res
        .status(400)
        .json({ success: false, message: "Address is required" });
    if (!valid_till)
      return res
        .status(400)
        .json({ success: false, message: "Valid till date is required" });

    // Salary validation
    if (!salary || typeof salary.min !== "number" || salary.min < 0) {
      return res.status({
        success: false,
        message: "Valid minimum salary is required",
      });
    }
    if (
      salary.max &&
      (typeof salary.max !== "number" || salary.max < salary.min)
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Max salary must be >= min salary" });
    }

    // Date validation
    const validTillDate = new Date(valid_till);
    if (isNaN(validTillDate) || validTillDate <= new Date()) {
      return res.status(400).json({
        success: false,
        message: "Valid till date must be a future date",
      });
    }

    const job = await DriverJob.create({
      title: title.trim(),
      description: description.trim(),
      company: { name: company.name.trim() },
      salary: {
        min: salary.min,
        max: salary.max || null,
        currency: salary.currency || "INR",
      },
      job_type: job_type || "full_time",
      driver_category: driver_category || "car_driver",
      location: {
        address: location.address.trim(),
        lat: location.lat || null,
        lng: location.lng || null,
      },
      skills: skills
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 20), // limit skills
      driverId,
      valid_till: validTillDate,
    });

    return res.status(201).json({
      success: true,
      message: "Job posted successfully",
      data: job,
    });
  } catch (error) {
    console.error("Error creating job:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// 🟡 GET ALL JOBS (with pagination + search + filters)
exports.getJobs = async (req, res) => {
  try {
    const driverId = req.user?.id || req.body.driverId;

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const showAll = req.query.show === "all";   // 🔥 your condition

    const search = req.query.search || "";
    const job_type = req.query.job_type || null;
    const driver_category = req.query.driver_category || null;

    let filters = {};

    if (showAll) {
      // 🟢 Show only jobs posted by this driver (no status filter)
      filters = {
        driverId: driverId,
      };
    } else {
      // 🟡 Public listing
      filters = {
        status: "active",

        // exclude same driver's jobs
        ...(driverId && { driverId: { $ne: driverId } }),

        ...(job_type && { job_type }),
        ...(driver_category && { driver_category }),
      };
    }

    // 🔍 Add text search
    const query = search
      ? { ...filters, $text: { $search: search } }
      : filters;

    const jobs = await DriverJob.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await DriverJob.countDocuments(query);

    return res.status(200).json({
      success: true,
      data: jobs,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    });

  } catch (error) {
    console.error("Error fetching jobs:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch jobs",
      error: error.message,
    });
  }
};

// 🔵 GET SINGLE JOB
exports.getJobById = async (req, res) => {
  try {
    const jobId = req.params.id;

    const job = await DriverJob.findById(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: job,
    });
  } catch (error) {
    console.error("Error fetching job:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch job",
      error: error.message,
    });
  }
};

// 🟣 UPDATE JOB
exports.updateJob = async (req, res) => {
  try {
    const jobId = req.params.id;

    const updated = await DriverJob.findByIdAndUpdate(jobId, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Job updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Error updating job:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update job",
      error: error.message,
    });
  }
};

// 🔴 DELETE JOB
exports.deleteJob = async (req, res) => {
  try {
    const jobId = req.params.id;

    const deleted = await DriverJob.findByIdAndDelete(jobId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Job deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting job:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete job",
      error: error.message,
    });
  }
};
