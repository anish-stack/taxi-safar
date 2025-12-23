const { publisher } = require("../../config/redis");
const CompanyDetails = require("../../models/driver/ComopanyDetails");
const Driver = require("../../models/driver/driver.model");
const { uploadSingleImage, deleteImage } = require("../../utils/cloudinary");
const { deleteFile } = require("../../middlewares/multer");
const TaxiSafariRide = require("../../models/rides/taxi_safar_ride");
const RidesPost = require("../../models/rides_post/Rides_Post");
const mongoose = require("mongoose");
const NotificationService = require("../../utils/notificationService");

exports.toggleStatus = async (req, res) => {
  try {
    const driverId = req.user?._id;
    const { status } = req.body;

    if (typeof status !== "boolean") {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status" });
    }

    if (!driverId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // ⚡ Fastest Mongo operation
    const result = await Driver.updateOne(
      { _id: driverId },
      { $set: { is_online: status } }
    );

    if (result.matchedCount === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Driver not found" });
    }

    return res.status(200).json({
      success: true,
      message: `Driver is now ${status ? "online" : "offline"}`,
      is_online: status,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateDriverLocation = async (req, res) => {
  try {
    const driverId = req.user?._id; // from JWT middleware
    if (!driverId) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized: Driver ID missing" });
    }

    const {
      latitude: lat,
      longitude: lng,
      accuracy,
      speed,
      timestamp,
      platform,
    } = req.body;
    // console.log('Received location update:', req.body);
    if (lat == null || lng == null) {
      return res.status(400).json({
        success: false,
        message: "Latitude and Longitude are required.",
      });
    }

    const now = new Date();
    let dataSource = "redis"; // default (since Redis is always updated instantly)

    // 1️⃣ GeoJSON point
    const geoPoint = {
      type: "Point",
      coordinates: [parseFloat(lng), parseFloat(lat)],
    };

    // 2️⃣ Save latest position in Redis hash (fast lookup)
    await publisher.hSet(`driver:${driverId}`, {
      lat,
      lng,
      accuracy,
      speed,
      platform,
      updatedAt: now.toISOString(),
    });

    // 3️⃣ Publish to Redis Pub/Sub for real-time map updates
    await publisher.publish(
      "driver_location_channel",
      JSON.stringify({
        driverId,
        lat,
        lng,
        accuracy,
        speed,
        timestamp,
        platform,
        updatedAt: now,
      })
    );

    // 4️⃣ Update MongoDB every 60 seconds (reduce DB writes)
    const driver = await Driver.findById(driverId).select("lastLocationUpdate");

    if (
      !driver?.lastLocationUpdate ||
      now - driver.lastLocationUpdate > 60 * 1000
    ) {
      await Driver.findByIdAndUpdate(driverId, {
        current_location: geoPoint,
        lastLocationUpdate: now,
      });
      dataSource = "mongodb"; // DB write occurred
      console.log(`🗺️ MongoDB updated for driver ${driverId}`);
    }

    return res.json({
      success: true,
      message: "Driver location updated successfully",
      data: {
        lat,
        lng,
        accuracy,
        speed,
        updatedAt: now,
        source: dataSource, // ✅ shows where txphe data was updated last
      },
    });
  } catch (error) {
    console.error("❌ Location update error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update driver location",
      error: error.message,
    });
  }
};

exports.getDriverLocation = async (req, res) => {
  try {
    const driverId = req.user.id || req.query.id;

    // Try fetching from Redis first
    const location = await publisher.hGetAll(`driver:${driverId}`);

    // Utility: Convert UTC → IST
    const convertToIST = (utcTime) => {
      if (!utcTime) return null;

      const date = new Date(utcTime);
      return date.toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour12: true,
      });
    };

    if (location && location.lat && location.lng) {
      return res.json({
        success: true,
        source: "redis",
        data: {
          lat: parseFloat(location.lat),
          lng: parseFloat(location.lng),
          updatedAt_utc: location.updatedAt,
          updatedAt_ist: convertToIST(location.updatedAt), // ⭐ IST TIME ADDED
        },
      });
    }

    // Fallback to MongoDB if Redis cache is missing
    const driver = await Driver.findById(driverId).select(
      "current_location lastLocationUpdate"
    );

    if (!driver || !driver.current_location?.coordinates) {
      return res.status(404).json({
        success: false,
        message: "Driver location not found",
      });
    }

    const [lng, lat] = driver.current_location.coordinates;

    return res.json({
      success: true,
      source: "mongodb",
      data: {
        lat,
        lng,
        updatedAt_utc: driver.lastLocationUpdate,
        updatedAt_ist: convertToIST(driver.lastLocationUpdate), // ⭐ IST TIME ADDED
      },
    });
  } catch (error) {
    console.error("❌ Get driver location error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get driver location",
    });
  }
};

exports.updateFcmToken = async (req, res) => {
  try {
    const driverId = req.user?._id;
    const { fcmToken, platform, deviceId, timestamp } = req.body;

    if (!driverId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Driver not found in token",
      });
    }

    if (!fcmToken || typeof fcmToken !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid FCM token",
      });
    }

    // Fetch current saved token
    const driver = await Driver.findById(driverId).select("fcm_token");

    // If same token - no update needed
    if (driver?.fcm_token === fcmToken) {
      console.log("⚠️ Same FCM token received — no update required.");
      return res.status(200).json({
        success: true,
        message: "FCM token already up to date",
      });
    }

    // Token different → update DB
    const updateData = {
      fcm_token: fcmToken,
      platform: platform || "unknown",
      device_id: deviceId || null,
      fcm_updated_at: timestamp || new Date().toISOString(),
    };

    await Driver.findByIdAndUpdate(driverId, updateData);
    console.log("✅ Updated new FCM token for driver:", driverId);

    return res.status(200).json({
      success: true,
      message: "FCM token updated successfully",
    });
  } catch (error) {
    console.error("❌ Update FCM Token Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while updating FCM token",
      error: error.message,
    });
  }
};

exports.get_all_Drivers = async (req, res) => {
  try {
    // Pagination
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    // Filters
    const search = (req.query.search || "").trim();
    const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null;
    const completion = req.query.completion || "all"; // all, aadhar, vehicle, bank, full
    const vehicleType = req.query.vehicleType || "all"; // all, mini, sedan, suv, none

    // Base query
    let query = {};

    // 1. Text Search
    if (search) {
      const searchRegex = { $regex: search, $options: "i" };

      query.$or = [
        { driver_name: searchRegex },
        { driver_contact_number: searchRegex },
        { driver_email: searchRegex },
        { "BankDetails.account_number": searchRegex },
        {
          $expr: {
            $regexMatch: {
              input: { $toString: "$_id" },
              regex: search,
              options: "i",
            },
          },
        },
      ];
    }

    // 2. Date Range Filter (joined date)
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        startDate.setHours(0, 0, 0, 0);
        query.createdAt.$gte = startDate;
      }
      if (endDate) {
        endDate.setHours(23, 59, 59, 999);
        query.createdAt.$lte = endDate;
      }
    }

    // 3. Completion Status Filter
    if (completion !== "all") {
      switch (completion) {
        case "aadhar":
          query.aadhar_verified = true;
          break;
        case "vehicle":
          query.current_vehicle_id = { $exists: true, $ne: null };
          break;
        case "bank":
          query.BankDetails = { $exists: true, $ne: null };
          break;
        case "full":
          query.aadhar_verified = true;
          query.current_vehicle_id = { $exists: true, $ne: null };
          query.BankDetails = { $exists: true, $ne: null };
          break;
      }
    }

    // 4. Vehicle Preference Filter
    if (vehicleType !== "all") {
      switch (vehicleType) {
        case "mini":
          query["preferences.accept_mini_rides"] = true;
          break;
        case "sedan":
          query["preferences.accept_sedan_rides"] = true;
          break;
        case "suv":
          query["preferences.accept_suv_rides"] = true;
          break;
        case "none":
          query.$and = [
            { "preferences.accept_mini_rides": { $ne: true } },
            { "preferences.accept_sedan_rides": { $ne: true } },
            { "preferences.accept_suv_rides": { $ne: true } },
          ];
          break;
      }
    }

    // Run queries in parallel
    const [drivers, totalDrivers] = await Promise.all([
      Driver.find(query)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean(),

      Driver.countDocuments(query),
    ]);

    const totalPages = Math.ceil(totalDrivers / limit);

    // Optional: Send aggregated stats (useful for frontend display)
    const stats = await Driver.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          aadharDone: {
            $sum: { $cond: [{ $eq: ["$aadhar_verified", true] }, 1, 0] },
          },
          vehicleDone: {
            $sum: {
              $cond: [
                { $and: [{ $ne: ["$current_vehicle_id", null] }, { $ne: ["$current_vehicle_id", ""] }] },
                1,
                0,
              ],
            },
          },
          bankDone: {
            $sum: { $cond: [{ $ne: ["$BankDetails", null] }, 1, 0] },
          },
          allDone: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$aadhar_verified", true] },
                    { $ne: ["$current_vehicle_id", null] },
                    { $ne: ["$BankDetails", null] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    const aggregatedStats = stats[0] || {
      total: totalDrivers,
      aadharDone: 0,
      vehicleDone: 0,
      bankDone: 0,
      allDone: 0,
    };

    return res.status(200).json({
      success: true,
      message: drivers.length
        ? "Drivers fetched successfully"
        : "No drivers found",
      data: drivers,
      stats: aggregatedStats, // New: accurate global stats
      pagination: {
        total: totalDrivers,
        page,
        limit,
        pages: totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Get All Drivers Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching drivers",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
exports.addCompanyDetails = async (req, res) => {
  try {
    const driverId = req.user.id;
    const files = req.files || {};
    const { company_name, address, phone, email, gst_number } = req.body;

    if (!company_name || !address || !phone || !email) {
      return res.status(400).json({
        success: false,
        message: "All fields are required.",
      });
    }

    let logo = { url: null, publicId: null };
    if (files.logo) {
      const uploaded = await uploadSingleImage(files.logo[0].path);
      logo = { url: uploaded.image, publicId: uploaded.public_id };
      deleteFile(files.logo[0].path);
    }

    let signature = { url: null, publicId: null };
    if (files.signature) {
      const uploaded = await uploadSingleImage(files.signature[0].path);
      signature = { url: uploaded.image, publicId: uploaded.public_id };
      deleteFile(files.signature[0].path);
    }

    let driverPub = "";
    if (gst_number.length >= 6) {
      driverPub = gst_number.substring(0, 2) + gst_number.slice(-4);
    } else {
      driverPub = gst_number;
    }

    const newCompany = await CompanyDetails.create({
      driver: driverId,
      company_name,
      address,
      phone,
      email,
      logo,
      driverPub,
      gst_no: gst_number,
      signature,
    });
    await NotificationService.sendCompanyCreatedNotification(
      driverId,
      company_name,
      newCompany._id
    );

    return res.status(201).json({
      success: true,
      message: "Company details added successfully.",
      data: newCompany,
    });
  } catch (error) {
    console.error("Add Company Error:", error);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// -----------------------------------------------------------
// GET MY COMPANY DETAILS
// -----------------------------------------------------------
exports.getMyCompanyDetails = async (req, res) => {
  try {
    const driverId = req.user.id;

    const details = await CompanyDetails.findOne({ driver: driverId });

    return res.status(200).json({
      success: true,
      data: details || {},
    });
  } catch (error) {
    console.error("Get Company Error:", error);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};
exports.getCompanyDetails = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid or missing ID",
      });
    }

    // Try to find by _id
    let details = await CompanyDetails.findById(id);

    // If not found by _id, try finding by driver field
    if (!details) {
      details = await CompanyDetails.findOne({ driver: id });

      if (!details) {
        return res.status(404).json({
          success: false,
          message: "Company details not found",
        });
      }
    }

    // Determine how it was matched
    const matchedBy = details.driver?.toString() === id ? "driver" : "_id";

    // Return response
    return res.status(200).json({
      success: true,
      data: details,
      matchedBy,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

exports.updateCompanyDetails = async (req, res) => {
  try {
    const driverId = req.user.id;
    const files = req.files || {};
    const { company_name, address, phone, email } = req.body;

    let details = await CompanyDetails.findOne({ driver: driverId });

    if (!details) {
      return res.status(404).json({
        success: false,
        message: "Company details not found.",
      });
    }

    // Replace Logo if new one is uploaded
    if (files.logo) {
      if (details.logo?.publicId) {
        await deleteImage(details.logo.publicId);
      }

      const uploaded = await uploadSingleImage(files.logo[0].path);
      details.logo = { url: uploaded.image, publicId: uploaded.public_id };
      deleteFile(files.logo[0].path);
    }

    // Replace Signature if new one is uploaded
    if (files.signature) {
      if (details.signature?.publicId) {
        await deleteImage(details.signature.publicId);
      }

      const uploaded = await uploadSingleImage(files.signature[0].path);
      details.signature = { url: uploaded.image, publicId: uploaded.public_id };
      deleteFile(files.signature[0].path);
    }

    // Update basic fields
    if (company_name) details.company_name = company_name;
    if (address) details.address = address;
    if (phone) details.phone = phone;
    if (email) details.email = email;

    await details.save();
    await NotificationService.sendCompanyUpdatedNotification(
      driverId,
      company_name
    );

    return res.status(200).json({
      success: true,
      message: "Company details updated successfully.",
      data: details,
    });
  } catch (error) {
    console.error("Update Company Error:", error);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// -----------------------------------------------------------
// DELETE COMPANY DETAILS
// -----------------------------------------------------------
exports.deleteCompanyDetails = async (req, res) => {
  try {
    const driverId = req.user.id;

    const details = await CompanyDetails.findOne({ driver: driverId });

    if (!details) {
      return res.status(404).json({
        success: false,
        message: "Company details not found.",
      });
    }

    // Delete images from cloudinary
    if (details.logo?.publicId) await deleteImage(details.logo.publicId);
    if (details.signature?.publicId)
      await deleteImage(details.signature.publicId);

    await CompanyDetails.deleteOne({ driver: driverId });

    return res.status(200).json({
      success: true,
      message: "Company details deleted successfully.",
    });
  } catch (error) {
    console.error("Delete Company Error:", error);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// -----------------------------------------------------------
// ADMIN → GET ALL COMPANY DETAILS
// -----------------------------------------------------------
exports.adminGetAllCompanyDetails = async (req, res) => {
  try {
    const list = await CompanyDetails.find().populate(
      "driver",
      "driver_name driver_contact_number"
    );

    return res.status(200).json({
      success: true,
      count: list.length,
      data: list,
    });
  } catch (error) {
    console.error("Admin Get Error:", error);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

exports.FetchMyAssignedRides = async (req, res) => {
  try {
    const driverId = req.params.id;
    const { type } = req.query; // 'reserved' or 'my_posts'

    // Validation
    if (!driverId) {
      return res.status(400).json({
        success: false,
        message: "Driver ID is required",
      });
    }

    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Optional status filter
    const statusFilter = req.query.status;

    // Type validation
    if (type && !["reserved", "my_posts"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Type must be 'reserved' or 'my_posts'",
      });
    }

    let result = {};

    // RESERVED RIDES (assigned rides from both sources)
    if (!type || type === "reserved") {
      const taxiSafariQuery = { driver_id: driverId };
      const ridesPostQuery = { assignedDriverId: driverId };

      if (statusFilter) {
        taxiSafariQuery.trip_status = statusFilter;
        ridesPostQuery.rideStatus = statusFilter;
      }

      const [taxiSafariRides, ridesPostRides, taxiSafariCount, ridesPostCount] =
        await Promise.all([
          TaxiSafariRide.find(taxiSafariQuery)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean()
            .exec(),

          RidesPost.find(ridesPostQuery)
            .populate(
              "driverPostId",
              "driver_name driver_contact_number average_rating"
            )
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean()
            .exec(),

          TaxiSafariRide.countDocuments(taxiSafariQuery).exec(),
          RidesPost.countDocuments(ridesPostQuery).exec(),
        ]);

      // Merge and sort both rides by date
      const allReservedRides = [
        ...taxiSafariRides.map((r) => ({ ...r, type: "taxi_safari" })),
        ...ridesPostRides.map((r) => ({ ...r, type: "rides_post" })),
      ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      const totalReserved = taxiSafariCount + ridesPostCount;
      const totalReservedPages = Math.ceil(totalReserved / limit);

      result.reserved_rides = {
        rides: allReservedRides,
        pagination: {
          current_page: page,
          total_pages: totalReservedPages,
          total_rides: totalReserved,
          rides_per_page: limit,
          has_next_page: page < totalReservedPages,
          has_prev_page: page > 1,
        },
        summary: {
          total_rides: totalReserved,
          taxi_safari_count: taxiSafariCount,
          rides_post_count: ridesPostCount,
        },
      };
    }

    // MY POSTS (rides posted by current driver)
    if (!type || type === "my_posts") {
      const myPostsQuery = { driverPostId: driverId };

      if (statusFilter) {
        myPostsQuery.rideStatus = statusFilter;
      }

      const [myPosts, myPostsCount] = await Promise.all([
        RidesPost.find(myPostsQuery)
          .populate(
            "assignedDriverId",
            "driver_name driver_contact_number average_rating"
          )
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean()
          .exec(),

        RidesPost.countDocuments(myPostsQuery).exec(),
      ]);

      const myPostsPages = Math.ceil(myPostsCount / limit);

      result.my_posts = {
        rides: myPosts,
        pagination: {
          current_page: page,
          total_pages: myPostsPages,
          total_rides: myPostsCount,
          rides_per_page: limit,
          has_next_page: page < myPostsPages,
          has_prev_page: page > 1,
        },
      };
    }

    console.log("FetchMyAssignedRides Result:", result);
    return res.status(200).json({
      success: true,
      message: "Rides fetched successfully",
      data: result,
    });
  } catch (error) {
    console.error("FetchMyAssignedRides Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch rides",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
