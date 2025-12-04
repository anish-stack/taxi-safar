const RidesPost = require("../../models/rides_post/Rides_Post");
const Driver = require("../../models/driver/driver.model");
const {
  addRideNotificationJob,
} = require("../../queues/RidePostNotifications");
const { getGoogleRouteData } = require("../../utils/googleDistance");

exports.postRide = async (req, res) => {
  try {
    const driverId = req.user?._id;
    if (!driverId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please login to post a ride.",
      });
    }

    const {
      tripType,
      vehicleType,
      pickupDate,
      pickupTime,
      pickupAddress,
      contactType,
      pickupLocation,
      dropAddress,
      dropLocation,
      totalAmount,
      driverEarning,
      extraKmCharge = 0,
      extraMinCharge = 0,
      acceptBookingType,
      extraRequirements = [], // ← This comes as array from frontend
      notes = "",
      paymentMethod = "cash",
      commissionAmount,
    } = req.body;

    console.log("Received ride post data:", req.body);

    // === Validate Required Fields ===
    const requiredFields = [
      tripType,
      vehicleType,
      pickupDate,
      pickupTime,
      pickupAddress,
      pickupLocation,
      dropAddress,
      dropLocation,
      totalAmount,
      driverEarning,
      acceptBookingType,
    ];

    if (requiredFields.some((field) => !field)) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided",
      });
    }

    // === Validate Coordinates ===
    const validateCoords = (loc, name) => {
      if (
        !loc ||
        !loc.coordinates ||
        !Array.isArray(loc.coordinates) ||
        loc.coordinates.length !== 2
      ) {
        throw new Error(`Invalid ${name} coordinates`);
      }
      const [lng, lat] = loc.coordinates;
      if (typeof lng !== "number" || typeof lat !== "number") {
        throw new Error(`${name} coordinates must be numbers`);
      }
      return [lng, lat];
    };

    const [pickupLng, pickupLat] = validateCoords(
      pickupLocation,
      "pickupLocation"
    );
    const [dropLng, dropLat] = validateCoords(dropLocation, "dropLocation");

    // === Validate Enums ===
    const validTripTypes = [
      "one-way",
      "round-trip",
      "rental",
      "outstation",
      "hourly",
    ];
    const validVehicleTypes = [
      "hatchback",
      "sedan",
      "suv",
      "muv",
      "mini",
      "auto",
      "luxury",
      "van",
    ];
    const validBookingTypes = ["instant", "scheduled", "both"];

    if (!validTripTypes.includes(tripType))
      return res
        .status(400)
        .json({ success: false, message: "Invalid tripType" });
    if (!validVehicleTypes.includes(vehicleType))
      return res
        .status(400)
        .json({ success: false, message: "Invalid vehicleType" });
    if (!validBookingTypes.includes(acceptBookingType))
      return res
        .status(400)
        .json({ success: false, message: "Invalid acceptBookingType" });

    // === Validate Amounts ===
    if (totalAmount <= 0 || driverEarning <= 0 || driverEarning > totalAmount) {
      return res.status(400).json({
        success: false,
        message: "Invalid totalAmount or driverEarning",
      });
    }

    // === Validate Future DateTime ===
    const pickupDateTime = new Date(`${pickupDate}T${pickupTime}:00`);
    if (isNaN(pickupDateTime.getTime()) || pickupDateTime <= new Date()) {
      return res
        .status(400)
        .json({ success: false, message: "Pickup time must be in the future" });
    }

    // === Check Driver ===
    const driver = await Driver.findById(driverId).select(
      "driver_name account_status current_vehicle_id"
    );
    if (!driver)
      return res
        .status(404)
        .json({ success: false, message: "Driver not found" });
    if (driver.account_status !== "active")
      return res
        .status(403)
        .json({ success: false, message: "Account not active" });
    if (!driver.current_vehicle_id)
      return res
        .status(400)
        .json({ success: false, message: "Please register a vehicle" });

    // === Convert extraRequirements array → object with booleans ===
    const extraReqObj = {
      onlyDiesel: false,
      musicSystem: false,
      ac: false,
      carrier: false,
      allInclusive: false,
      allExclusive: false,
      foodAllowed: false,
    };

    // Map incoming array strings to boolean fields
    if (Array.isArray(extraRequirements)) {
      extraRequirements.forEach((req) => {
        const key = req.toLowerCase().replace(/_/g, ""); // "all_inclusive" → "allinclusive"
        if (key === "allinclusive") extraReqObj.allInclusive = true;
        if (key === "ac" || key.includes("aircondition")) extraReqObj.ac = true;
        if (key.includes("music")) extraReqObj.musicSystem = true;
        if (key.includes("carrier") || key.includes("roof"))
          extraReqObj.carrier = true;
        if (key.includes("diesel")) extraReqObj.onlyDiesel = true;
        if (key.includes("food")) extraReqObj.foodAllowed = true;
        if (key.includes("exclusive")) extraReqObj.allExclusive = true;
      });
    }

    // Optional: Auto-calculate commission
    const finalCommission = commissionAmount || Math.round(totalAmount * 0.2);
    const calculatedEarning = totalAmount - finalCommission;

    // Allow small rounding tolerance
    if (Math.abs(driverEarning - calculatedEarning) > 10) {
      return res.status(400).json({
        success: false,
        message: `Driver earning should be ≈ ₹${calculatedEarning} (you entered ₹${driverEarning})`,
      });
    }

    let distanceKm = null;
    let durationText = null;
    let routePolyline = null;

    try {
      const googleData = await getGoogleRouteData(
        pickupLat,
        pickupLng,
        dropLat,
        dropLng
      );
      distanceKm = googleData.distanceKm;
      durationText = googleData.durationText;
      routePolyline = googleData.polyline;

      console.log("Google Distance:", distanceKm, "km");
      console.log("ETA:", durationText);
    } catch (err) {
      console.warn("Google routing failed (non-blocking):", err.message);
    }
    // === Create Ride Post ===
    const newRide = new RidesPost({
      driverPostId: driverId,
      tripType,
      vehicleType,
      pickupDate: pickupDateTime,
      pickupTime,
      distanceKm,
      contactType,
      durationText,
      routePolyline,
      pickupAddress,
      pickupLocation: { type: "Point", coordinates: [pickupLng, pickupLat] },
      dropAddress,
      dropLocation: { type: "Point", coordinates: [dropLng, dropLat] },
      totalAmount,
      commissionAmount: finalCommission,
      driverEarning: calculatedEarning,
      extraKmCharge,
      extraMinCharge,
      acceptBookingType,
      extraRequirements: extraReqObj,
      notes,
      paymentMethod,
      paymentStatus: "pending",
      rideStatus: "pending",
      isActive: true,
    });

    await newRide.save();

    // === Queue Notification ===
    try {
      await addRideNotificationJob({
        ridePostId: newRide._id.toString(),
        pickupAddress,
        dropAddress,
        pickupLocation: newRide.pickupLocation,
        vehicleType,
        driverName: driver.driver_name,
        driverEarning: newRide.driverEarning,
        tripType,
        allInclusive: extraReqObj.allInclusive,
      });
    } catch (err) {
      console.warn("Notification failed (non-blocking):", err.message);
    }

    // === Success ===
    return res.status(201).json({
      success: true,
      message: "Ride posted successfully!",
      data: {
        rideId: newRide._id,
        pickupDateTime: `${pickupDate} ${pickupTime}`,
        totalAmount,
        driverEarning: newRide.driverEarning,
        extraRequirements: newRide.extraRequirements, // → { allInclusive: true, ac: false, ... }
        status: "pending",
      },
    });
  } catch (error) {
    console.error("postRide Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to post ride. Please try again.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Get all rides with filters
exports.getAllRides = async (req, res) => {
  try {
    const {
      tripType,
      vehicleType,
      paymentStatus,
      driverPostId,
      pickupDate,
      page = 1,
      limit = 10,
    } = req.query;

    // Build filter object
    const filter = {};
    if (tripType) filter.tripType = tripType;
    if (vehicleType) filter.vehicleType = vehicleType;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (driverPostId) filter.driverPostId = driverPostId;
    if (pickupDate) {
      const startDate = new Date(pickupDate);
      const endDate = new Date(pickupDate);
      endDate.setDate(endDate.getDate() + 1);
      filter.pickupDate = { $gte: startDate, $lt: endDate };
    }

    // Pagination
    const skip = (page - 1) * limit;

    const rides = await RidesPost.find(filter)
      .populate("driverPostId", "driver_name driver_contact_number")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalRides = await RidesPost.countDocuments(filter);

    return res.status(200).json({
      success: true,
      data: rides,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalRides / limit),
        totalRides,
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Error fetching rides:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get single ride by ID
exports.getRideById = async (req, res) => {
  try {
    const { rideId } = req.params;

    const ride = await RidesPost.findById(rideId)
      .populate(
        "driverPostId",
        "driver_name driver_contact_number profile_image average_rating"
      )
      .populate(
        "assignedDriverId",
        "driver_name driver_contact_number profile_image average_rating"
      );

    if (!ride) {
      return res.status(404).json({
        success: false,
        message: "Ride not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: ride,
    });
  } catch (error) {
    console.error("Error fetching ride:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Update ride details
exports.updateRide = async (req, res) => {
  try {
    const { rideId } = req.params;
    const updateData = req.body;

    // Prevent updating certain fields
    delete updateData.driverPostId;
    delete updateData.createdAt;

    const updatedRide = await RidesPost.findByIdAndUpdate(
      rideId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedRide) {
      return res.status(404).json({
        success: false,
        message: "Ride not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Ride updated successfully",
      data: updatedRide,
    });
  } catch (error) {
    console.error("Error updating ride:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Delete ride
exports.deleteRide = async (req, res) => {
  try {
    const { rideId } = req.params;

    const deletedRide = await RidesPost.findByIdAndDelete(rideId);

    if (!deletedRide) {
      return res.status(404).json({
        success: false,
        message: "Ride not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Ride deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting ride:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Update payment status
exports.updatePaymentStatus = async (req, res) => {
  try {
    const { rideId } = req.params;
    const { paymentStatus, partialPaymentAmount } = req.body;

    if (
      !["pending", "completed", "failed", "refunded"].includes(paymentStatus)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment status",
      });
    }

    const updateData = { paymentStatus };
    if (partialPaymentAmount !== undefined) {
      updateData.partialPaymentAmount = partialPaymentAmount;
    }

    const updatedRide = await RidesPost.findByIdAndUpdate(
      rideId,
      { $set: updateData },
      { new: true }
    );

    if (!updatedRide) {
      return res.status(404).json({
        success: false,
        message: "Ride not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Payment status updated successfully",
      data: updatedRide,
    });
  } catch (error) {
    console.error("Error updating payment status:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Add customer rating
exports.addCustomerRating = async (req, res) => {
  try {
    const { rideId } = req.params;
    const { customerRating } = req.body;

    if (customerRating < 0 || customerRating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 0 and 5",
      });
    }

    const updatedRide = await RidesPost.findByIdAndUpdate(
      rideId,
      { $set: { customerRating } },
      { new: true }
    );

    if (!updatedRide) {
      return res.status(404).json({
        success: false,
        message: "Ride not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Rating added successfully",
      data: updatedRide,
    });
  } catch (error) {
    console.error("Error adding rating:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get rides by driver
exports.getRidesByDriver = async (req, res) => {
  try {
    const { driverPostId } = req.params;
    const { page = 1, limit = 10, paymentStatus } = req.query;

    const filter = { driverPostId };
    if (paymentStatus) filter.paymentStatus = paymentStatus;

    const skip = (page - 1) * limit;

    const rides = await RidesPost.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalRides = await RidesPost.countDocuments(filter);

    // Calculate total earnings
    const earnings = await RidesPost.aggregate([
      {
        $match: {
          driverPostId: require("mongoose").Types.ObjectId(driverPostId),
        },
      },
      {
        $group: {
          _id: null,
          totalEarnings: { $sum: "$driverEarning" },
          totalCommission: { $sum: "$commissionAmount" },
          totalAmount: { $sum: "$totalAmount" },
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      data: rides,
      earnings: earnings[0] || {
        totalEarnings: 0,
        totalCommission: 0,
        totalAmount: 0,
      },
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalRides / limit),
        totalRides,
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Error fetching driver rides:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Search rides by location (nearby rides)
exports.searchNearbyRides = async (req, res) => {
  try {
    const driverId = req.user?._id;

    if (!driverId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please login to search rides.",
      });
    }

    // Fetch driver
    const driver = await Driver.findById(driverId)
      .select(
        "driver_name current_location lastLocationUpdate current_vehicle_id currentRadius"
      )
      .populate("current_vehicle_id");

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found.",
      });
    }

    // Check location
    if (!driver.current_location || !driver.current_location.coordinates) {
      return res.status(400).json({
        success: false,
        message:
          "Driver location missing. Please update location to search nearby rides.",
      });
    }

    const [longitude, latitude] = driver.current_location.coordinates;

    if (!longitude || !latitude) {
      return res.status(400).json({
        success: false,
        message: "Driver location is invalid.",
      });
    }

    const maxDistanceMeters = (driver.currentRadius || 5) * 1000;
    const currentVehicleType = driver.current_vehicle_id?.vehicle_type || null;

    // Count rides
    const totalRides = await RidesPost.countDocuments();
    console.log("rides", totalRides);
    if (totalRides === 0) {
      return res.status(200).json({
        success: true,
        message: "No rides exist in database.",
        reason: "No rides created yet",
        data: [],
      });
    }

    const allRides = await RidesPost.find({ rideStatus: "pending" });

    //  ✅ Required console logs (ONLY with keyword "driver post")
    console.log("driver post → pending rides count:", allRides.length);

    allRides.forEach((r) =>
      console.log(
        "driver post → pickup coordinates:",
        r.pickupLocation.coordinates
      )
    );
    console.log("longitude, latitude", longitude, latitude);

    // Count rides matching vehicle type
    const vehicleMatchCount = await RidesPost.countDocuments({
      vehcleType: currentVehicleType,
    });

    // Count pending rides
    const pendingRidesCount = await RidesPost.countDocuments({
      rideStatus: "pending",
    });

    // MAIN QUERY — Nearby rides
    const rides = await RidesPost.find({
      pickupLocation: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [longitude, latitude],
          },
          $maxDistance: maxDistanceMeters,
        },
      },
      rideStatus: "pending",
      driverPostId: { $ne: driverId },
      vehcleType: currentVehicleType,
    })
      .populate(
        "driverPostId",
        "driver_name driver_contact_number average_rating"
      )
      .limit(20);

    // Only needed console
    console.log("driver post → nearby rides found:", rides.length);

    // If no rides found
    if (rides.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No nearby rides found.",
        reason: {
          vehicleTypeMatch: vehicleMatchCount,
          pendingRides: pendingRidesCount,
          possibleCauses: [
            "Ride is outside your radius",
            "No pending rides for your vehicle type",
            "Driver posted their own ride (excluded)",
            "Ride pickup location not near your coordinates",
          ],
        },
        driver_location: driver.current_location.coordinates,
        radius_used_in_meters: maxDistanceMeters,
        data: [],
      });
    }

    return res.status(200).json({
      success: true,
      driver_location: driver.current_location.coordinates,
      radius_used_in_meters: maxDistanceMeters,
      count: rides.length,
      data: rides,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get ride statistics
exports.getRideStatistics = async (req, res) => {
  try {
    const { startDate, endDate, driverPostId } = req.query;

    const matchStage = {};
    if (startDate && endDate) {
      matchStage.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }
    if (driverPostId) {
      matchStage.driverPostId =
        require("mongoose").Types.ObjectId(driverPostId);
    }

    const statistics = await RidesPost.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalRides: { $sum: 1 },
          totalRevenue: { $sum: "$totalAmount" },
          totalCommission: { $sum: "$commissionAmount" },
          totalDriverEarnings: { $sum: "$driverEarning" },
          averageRating: { $avg: "$customerRating" },
          completedPayments: {
            $sum: {
              $cond: [{ $eq: ["$paymentStatus", "completed"] }, 1, 0],
            },
          },
          pendingPayments: {
            $sum: {
              $cond: [{ $eq: ["$paymentStatus", "pending"] }, 1, 0],
            },
          },
        },
      },
    ]);

    const tripTypeBreakdown = await RidesPost.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$tripType",
          count: { $sum: 1 },
          revenue: { $sum: "$totalAmount" },
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      statistics: statistics[0] || {},
      tripTypeBreakdown,
    });
  } catch (error) {
    console.error("Error fetching statistics:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.getMyRide = async (req, res) => {
  try {
    const driverId = req.user?._id;

    if (!driverId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please login to search rides.",
      });
    }

    // ------ Pagination ------
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // ------ Base Filters ------
    const filters = {
      assignedDriverId: driverId,
      rideStatus: { $nin: ["completed", "cancelled"] }, // always exclude completed/cancelled
    };

    // Optional rideStatus filter from query (still exclude completed/cancelled)
    if (req.query.rideStatus) {
      const statusFilter = req.query.rideStatus
        .split(",")
        .filter((s) => !["completed", "cancelled"].includes(s));

      if (statusFilter.length) {
        filters.rideStatus.$in = statusFilter;
      }
    }

    // Date range filter
    if (req.query.startDate && req.query.endDate) {
      filters.createdAt = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate),
      };
    }

    // Pickup / Drop address search
    if (req.query.pickup) {
      filters.pickupAddress = { $regex: req.query.pickup, $options: "i" };
    }

    if (req.query.drop) {
      filters.dropAddress = { $regex: req.query.drop, $options: "i" };
    }

    // ------ Fetch Rides ------
    const rides = await RidesPost.find(filters)
      .populate(
        "driverPostId",
        "driver_name driver_contact_number average_rating"
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    console.log("Fetched Rides:", rides); // log after fetching

    // ------ Count Total for Pagination ------
    const totalRides = await RidesPost.countDocuments(filters);

    return res.status(200).json({
      success: true,
      page,
      limit,
      totalPages: Math.ceil(totalRides / limit),
      totalRides,
      data: rides,
    });
  } catch (error) {
    console.error("Error in getMyRide:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching driver rides",
      error: error.message,
    });
  }
};
