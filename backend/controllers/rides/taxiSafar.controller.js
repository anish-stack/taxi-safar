const { getGoogleRouteData } = require("../../utils/googleDistance");
const TaxiSafariRide = require("../../models/rides/taxi_safar_ride");
const Driver = require("../../models/driver/driver.model");
const sendNotification = require("../../utils/sendNotification");
const mongoose = require("mongoose");
const Wallet = require("../../models/driver/Wallet");
const { calculateDistance } = require("../../utils/Queues");
const RidePost = require("../../models/rides_post/Rides_Post");
const { publisher } = require("../../config/redis");
const Transaction = require("../../models/driver/Transaction");

// ===== REDIS CACHE UTILITY FUNCTIONS =====
const CACHE_TTL = 3600; // 1 hour cache

/**
 * Generate Redis cache key for ride
 */
const getRideCacheKey = (rideId) => `ride:${rideId}`;

/**
 * Get ride from Redis cache
 */
const getRideFromCache = async (rideId) => {
  try {
    const cachedRide = await publisher.get(getRideCacheKey(rideId));
    if (cachedRide) {
      console.log(`✅ Cache HIT for ride: ${rideId}`);
      return JSON.parse(cachedRide);
    }
    console.log(`❌ Cache MISS for ride: ${rideId}`);
    return null;
  } catch (err) {
    console.error("Redis GET error:", err.message);
    return null;
  }
};

/**
 * Set ride in Redis cache
 */
const setRideInCache = async (rideId, rideData) => {
  try {
    const cacheKey = getRideCacheKey(rideId);
    await publisher.setEx(cacheKey, CACHE_TTL, JSON.stringify(rideData));
    console.log(`💾 Cached ride: ${rideId}`);
  } catch (err) {
    console.error("Redis SET error:", err.message);
  }
};

/**
 * Delete ride from Redis cache
 */
const deleteRideFromCache = async (rideId) => {
  try {
    const cacheKey = getRideCacheKey(rideId);
    await publisher.del(cacheKey);
    console.log(`🗑️  Deleted cache for ride: ${rideId}`);
  } catch (err) {
    console.error("Redis DEL error:", err.message);
  }
};

/**
 * Get all rides from cache (list)
 */
const getRideListFromCache = async (queryHash) => {
  try {
    const cacheKey = `rides:list:${queryHash}`;
    const cached = await publisher.get(cacheKey);
    if (cached) {
      console.log(`✅ Cache HIT for ride list: ${cacheKey}`);
      return JSON.parse(cached);
    }
    return null;
  } catch (err) {
    console.error("Redis GET list error:", err.message);
    return null;
  }
};

/**
 * Set ride list in cache
 */
const setRideListInCache = async (queryHash, data) => {
  try {
    const cacheKey = `rides:list:${queryHash}`;
    await publisher.setEx(cacheKey, CACHE_TTL, JSON.stringify(data));
    console.log(`💾 Cached ride list: ${cacheKey}`);
  } catch (err) {
    console.error("Redis SET list error:", err.message);
  }
};

/**
 * Delete ride list cache pattern
 */
const invalidateRideListCache = async () => {
  try {
    // Scan and delete all ride:list:* keys
    let cursor = 0;
    do {
      const result = await publisher.scan(cursor, {
        MATCH: "rides:list:*",
        COUNT: 100,
      });
      cursor = result.cursor;
      if (result.keys.length > 0) {
        await publisher.del(result.keys);
        console.log(`🗑️  Deleted ${result.keys.length} cached ride lists`);
      }
    } while (cursor !== 0);
  } catch (err) {
    console.error("Redis invalidate list error:", err.message);
  }
};

// ===== CONTROLLERS WITH REDIS =====

// Create New Ride
exports.createNewRide = async (req, res) => {
  try {
    const {
      invoice_id,
      user_id,
      name,
      contact,
      vehicle_type,
      vehicle_name,
      pickup_address,
      pickup_location,
      destination_address,
      destination_location,
      trip_type,
      category,
      departure_date,
      return_date,
      original_amount,
      paid_amount,
      payment_method,
      is_scheduled,
      scheduled_time,
      promo_code,
      discount_amount,
      special_instructions,
    } = req.body;

    // Validate required fields
    if (
      !user_id ||
      !vehicle_type ||
      !vehicle_name ||
      !trip_type ||
      !category ||
      !departure_date ||
      !original_amount
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const pickupLat = pickup_location?.coordinates?.[1] || 0;
    const pickupLng = pickup_location?.coordinates?.[0] || 0;
    const dropLat = destination_location?.coordinates?.[1] || 0;
    const dropLng = destination_location?.coordinates?.[0] || 0;

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
    } catch (err) {
      console.warn("Google routing failed:", err.message);
    }

    const lastRide = await TaxiSafariRide.findOne().sort({ trip_id: -1 });
    const trip_id = lastRide ? lastRide.trip_id + 1 : 1001;

    const newRide = new TaxiSafariRide({
      trip_id,
      user_id,
      name,
      contact,
      vehicle_type,
      vehicle_name,
      pickup_address,
      pickup_location,
      destination_address,
      destination_location,
      trip_type,
      category,
      departure_date,
      return_date,
      distance: distanceKm,
      durationText,
      routePolyline,
      original_amount,
      paid_amount,
      invoice_id,
      payment_method,
      trip_status: "searching",
      is_scheduled,
      scheduled_time,
      promo_code,
      discount_amount,
      special_instructions,
      current_location: pickup_location,
      createdBy: req.user?._id,
    });

    newRide.generateOTP();
    await newRide.save();

    // 💾 Cache the newly created ride
    await setRideInCache(newRide._id.toString(), newRide.toObject());

    // 🗑️ Invalidate ride list cache
    await invalidateRideListCache();

    return res.status(201).json({
      success: true,
      message: "Ride created successfully",
      data: newRide,
    });
  } catch (err) {
    console.error("Create ride error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to create ride",
      error: err.message,
    });
  }
};

// Update Ride
exports.updateRide = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    delete updates.trip_id;
    delete updates.invoice_id;
    delete updates.payment_id;
    delete updates.createdAt;

    const ride = await TaxiSafariRide.findById(id);

    if (!ride) {
      return res.status(404).json({
        success: false,
        message: "Ride not found",
      });
    }

    if (
      [
        "trip_completed",
        "cancelled_by_user",
        "cancelled_by_driver",
        "cancelled_by_system",
      ].includes(ride.trip_status)
    ) {
      return res.status(400).json({
        success: false,
        message: "Cannot update completed or cancelled rides",
      });
    }

    if (updates.pickup_location || updates.destination_location) {
      const pickupLat =
        updates.pickup_location?.coordinates?.[1] ||
        ride.pickup_location.coordinates[1];
      const pickupLng =
        updates.pickup_location?.coordinates?.[0] ||
        ride.pickup_location.coordinates[0];
      const dropLat =
        updates.destination_location?.coordinates?.[1] ||
        ride.destination_location.coordinates[1];
      const dropLng =
        updates.destination_location?.coordinates?.[0] ||
        ride.destination_location.coordinates[0];

      try {
        const googleData = await getGoogleRouteData(
          pickupLat,
          pickupLng,
          dropLat,
          dropLng
        );
        updates.distance = googleData.distanceKm;
        updates.durationText = googleData.durationText;
        updates.routePolyline = googleData.polyline;
      } catch (err) {
        console.warn("Google routing failed during update:", err.message);
      }
    }

    updates.updatedBy = req.user?._id;

    const updatedRide = await TaxiSafariRide.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    // 🗑️ Delete from cache to force fresh data on next fetch
    await deleteRideFromCache(id);
    await invalidateRideListCache();

    return res.status(200).json({
      success: true,
      message: "Ride updated successfully",
      data: updatedRide,
    });
  } catch (err) {
    console.error("Update ride error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to update ride",
      error: err.message,
    });
  }
};

// Get All Rides with Filters + Cache
exports.getRides = async (req, res) => {
  try {
    const {
      user_id,
      driver_id,
      trip_status,
      category,
      payment_status,
      from_date,
      to_date,
      page = 1,
      limit = 10,
    } = req.query;

    // Generate cache key from query parameters
    const queryHash = Buffer.from(
      JSON.stringify({
        user_id,
        driver_id,
        trip_status,
        category,
        payment_status,
        from_date,
        to_date,
        page,
        limit,
      })
    ).toString("base64");

    // ✅ Try to get from cache first
    const cachedResult = await getRideListFromCache(queryHash);
    if (cachedResult) {
      return res.status(200).json(cachedResult);
    }

    const query = {};

    if (user_id) query.user_id = user_id;
    if (driver_id) query.driver_id = driver_id;
    if (trip_status) query.trip_status = trip_status;
    if (category) query.category = category;
    if (payment_status) query.payment_status = payment_status;

    if (from_date || to_date) {
      query.departure_date = {};
      if (from_date) query.departure_date.$gte = new Date(from_date);
      if (to_date) query.departure_date.$lte = new Date(to_date);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const rides = await TaxiSafariRide.find(query)
      .populate("driver_id", "name contact rating")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await TaxiSafariRide.countDocuments(query);

    const response = {
      success: true,
      data: rides,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    };

    // 💾 Cache the result
    await setRideListInCache(queryHash, response);

    return res.status(200).json(response);
  } catch (err) {
    console.error("Get rides error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch rides",
      error: err.message,
    });
  }
};

// Get Ride By ID + Cache
exports.getRideTaxiById = async (req, res) => {
  try {
    const { id } = req.params;

    // ✅ Try cache first
    const cachedRide = await getRideFromCache(id);
    if (cachedRide) {
      return res.status(200).json({
        success: true,
        data: cachedRide,
        source: "cache",
      });
    }

    // If not in cache, fetch from DB
    const ride = await TaxiSafariRide.findById(id)
      .populate("driver_id", "name contact rating vehicle_number")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    if (!ride) {
      return res.status(404).json({
        success: false,
        message: "Ride not found",
      });
    }

    // 💾 Cache for future requests
    await setRideInCache(id, ride.toObject());

    return res.status(200).json({
      success: true,
      data: ride,
      source: "database",
    });
  } catch (err) {
    console.error("Get ride by ID error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch ride",
      error: err.message,
    });
  }
};

// Delete Ride
exports.deleteRide = async (req, res) => {
  try {
    const { id } = req.params;

    const ride = await TaxiSafariRide.findById(id);

    if (!ride) {
      return res.status(404).json({
        success: false,
        message: "Ride not found",
      });
    }

    if (["trip_started", "trip_completed"].includes(ride.trip_status)) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete rides that are in progress or completed",
      });
    }

    ride.trip_status = "cancelled_by_system";
    ride.cancelled_at = new Date();
    ride.cancelled_by = "system";
    ride.cancellation_reason = "Deleted by admin";
    ride.updatedBy = req.user?._id;

    await ride.save();

    // 🗑️ Remove from cache
    await deleteRideFromCache(id);
    await invalidateRideListCache();

    return res.status(200).json({
      success: true,
      message: "Ride deleted successfully",
      data: ride,
    });
  } catch (err) {
    console.error("Delete ride error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to delete ride",
      error: err.message,
    });
  }
};

// Cancel Ride
exports.cancelRide = async (req, res) => {
  try {
    const { id } = req.params;
    const { cancelled_by, cancellation_reason } = req.body;

    if (!cancelled_by || !["user", "driver"].includes(cancelled_by)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid cancellation request. Must specify cancelled_by as user or driver",
      });
    }

    const ride = await TaxiSafariRide.findById(id);

    if (!ride) {
      return res.status(404).json({
        success: false,
        message: "Ride not found",
      });
    }

    if (
      [
        "trip_completed",
        "cancelled_by_user",
        "cancelled_by_driver",
        "cancelled_by_system",
      ].includes(ride.trip_status)
    ) {
      return res.status(400).json({
        success: false,
        message: "Ride is already completed or cancelled",
      });
    }

    const cancellationCharge = ride.calculateCancellationCharge();

    ride.trip_status = `cancelled_by_${cancelled_by}`;
    ride.cancelled_at = new Date();
    ride.cancelled_by = cancelled_by;
    ride.cancellation_reason = cancellation_reason || "No reason provided";
    ride.cancellation_charge = cancellationCharge;
    ride.updatedBy = req.user?._id;

    if (
      ride.payment_status === "captured" &&
      cancellationCharge < ride.paid_amount
    ) {
      ride.refund_amount = ride.paid_amount - cancellationCharge;
      ride.refund_status = "pending";
    }

    await ride.save();

    // 🗑️ Invalidate cache
    await deleteRideFromCache(id);
    await invalidateRideListCache();

    return res.status(200).json({
      success: true,
      message: "Ride cancelled successfully",
      data: {
        ride,
        cancellation_charge: cancellationCharge,
        refund_amount: ride.refund_amount,
      },
    });
  } catch (err) {
    console.error("Cancel ride error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to cancel ride",
      error: err.message,
    });
  }
};

// Verify OTP
exports.verifyOtp = async (req, res) => {
  try {
    const { id } = req.params;
    const { otp } = req.body;

    if (!otp) {
      return res.status(400).json({
        success: false,
        message: "OTP is required",
      });
    }

    const ride = await TaxiSafariRide.findById(id);

    if (!ride) {
      return res.status(404).json({
        success: false,
        message: "Ride not found",
      });
    }

    if (ride.otp_verified) {
      return res.status(400).json({
        success: false,
        message: "OTP already verified",
      });
    }

    const isValid = ride.verifyOTP(otp);

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    if (ride.trip_status === "driver_arrived") {
      ride.trip_status = "trip_started";
      ride.trip_started_at = new Date();
    }

    await ride.save();

    // 🗑️ Invalidate cache
    await deleteRideFromCache(id);

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      data: ride,
    });
  } catch (err) {
    console.error("Verify OTP error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to verify OTP",
      error: err.message,
    });
  }
};

// Update Location of Ride
exports.updateLocationOfRide = async (req, res) => {
  try {
    const { id } = req.params;
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: "Latitude and longitude are required",
      });
    }

    const ride = await TaxiSafariRide.findById(id);

    if (!ride) {
      return res.status(404).json({
        success: false,
        message: "Ride not found",
      });
    }

    if (
      !["driver_assigned", "driver_arrived", "trip_started"].includes(
        ride.trip_status
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Cannot update location for this ride status",
      });
    }

    ride.current_location = {
      type: "Point",
      coordinates: [longitude, latitude],
    };
    ride.last_location_update = new Date();

    await ride.save();

    // 🗑️ Delete cache as location changed
    await deleteRideFromCache(id);

    return res.status(200).json({
      success: true,
      message: "Location updated successfully",
      data: {
        current_location: ride.current_location,
        last_location_update: ride.last_location_update,
      },
    });
  } catch (err) {
    console.error("Update location error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to update location",
      error: err.message,
    });
  }
};

// Admin Change Status
exports.adminChangeStatusWithoutAnyRestriction = async (req, res) => {
  try {
    const { id } = req.params;
    const { trip_status, reason } = req.body;

    const validStatuses = [
      "searching",
      "reserved",
      "driver_assigned",
      "driver_arrived",
      "trip_started",
      "trip_completed",
      "cancelled_by_user",
      "cancelled_by_driver",
      "cancelled_by_system",
      "no_driver_found",
    ];

    if (!trip_status || !validStatuses.includes(trip_status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid trip status",
        validStatuses,
      });
    }

    const ride = await TaxiSafariRide.findById(id);

    if (!ride) {
      return res.status(404).json({
        success: false,
        message: "Ride not found",
      });
    }

    const oldStatus = ride.trip_status;
    ride.trip_status = trip_status;

    if (trip_status === "trip_started" && !ride.trip_started_at) {
      ride.trip_started_at = new Date();
    }

    if (trip_status === "trip_completed" && !ride.trip_completed_at) {
      ride.trip_completed_at = new Date();
    }

    if (trip_status.includes("cancelled")) {
      ride.cancelled_at = new Date();
      ride.cancelled_by = "admin";
      ride.cancellation_reason = reason || "Changed by admin";
    }

    ride.notes =
      (ride.notes || "") +
      `\nAdmin changed status from ${oldStatus} to ${trip_status} at ${new Date().toISOString()}. Reason: ${
        reason || "Not provided"
      }`;
    ride.updatedBy = req.user?._id;

    await ride.save();

    // 🗑️ Invalidate cache
    await deleteRideFromCache(id);
    await invalidateRideListCache();

    return res.status(200).json({
      success: true,
      message: "Status updated successfully by admin",
      data: {
        ride,
        old_status: oldStatus,
        new_status: trip_status,
      },
    });
  } catch (err) {
    console.error("Admin change status error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to change status",
      error: err.message,
    });
  }
};

// Fetch Nearby Taxi Safari Rides
exports.FetchNearByTaxiSafarRides = async (req, res) => {
  try {
    const driverId = req.user?._id;
    const { applyRadius } = req.query;

    if (!driverId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please log in.",
      });
    }

    const driver = await Driver.findById(driverId)
      .select(
        "driver_name current_location lastLocationUpdate current_vehicle_id currentRadius"
      )
      .populate({
        path: "current_vehicle_id",
        select: "vehicle_type",
      });

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found.",
      });
    }

    if (
      !driver.current_location ||
      !driver.current_location.coordinates ||
      driver.current_location.coordinates.length !== 2
    ) {
      return res.status(400).json({
        success: false,
        message: "Your location is missing or outdated.",
      });
    }

    const [longitude, latitude] = driver.current_location.coordinates;

    if (isNaN(longitude) || isNaN(latitude)) {
      return res.status(400).json({
        success: false,
        message: "Invalid location coordinates.",
      });
    }

    const searchRadiusKm = driver.currentRadius || 5;
    const maxDistanceMeters = searchRadiusKm * 1000;
    const vehicleType = driver.current_vehicle_id?.vehicle_type;

    if (!vehicleType) {
      return res.status(400).json({
        success: false,
        message: "Vehicle not selected.",
      });
    }

    /** ---------------------------
     * Cache Key (radius aware)
     * --------------------------*/
    const nearbyRidesCacheKey = `nearby:rides:${driverId}:${vehicleType}:${applyRadius}`;

    const cached = await publisher.get(nearbyRidesCacheKey);
    if (cached) {
      return res.status(200).json(JSON.parse(cached));
    }

    /** ---------------------------
     * Date Filter (Today + Future)
     * --------------------------*/
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    /** ---------------------------
     * Geo Query Builder
     * --------------------------*/
    const geoQuery = {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [longitude, latitude],
        },
      },
    };

    // ✅ Apply radius only when requested
    if (applyRadius === "true") {
      geoQuery.$near.$maxDistance = maxDistanceMeters;
    }

    /** ---------------------------
     * Main Query
     * --------------------------*/
    const nearbyRides = await TaxiSafariRide.find({
      trip_status: "searching",
      vehicle_type: vehicleType,
      created_by: { $ne: driverId },
      departure_date: { $gte: todayStart },
      pickup_location: geoQuery,
    })
      // ❌ DO NOT sort by createdAt (breaks distance order)
      .limit(20)
      .select(
        "-invoice_id -routePolyline -trip_id -user_id -contact -card -upi -bank -wallet -acquirer_data -all_details -refund_amount -refund_status"
      )
      .lean();

    if (!nearbyRides.length) {
      const response = {
        success: true,
        message: "No nearby rides available.",
        applyRadius: applyRadius === "true",
        radius_used_km: applyRadius === "true" ? searchRadiusKm : "NOT APPLIED",
        driver_location: [longitude, latitude],
        data: [],
      };

      await publisher.setEx(nearbyRidesCacheKey, 300, JSON.stringify(response));
      return res.status(200).json(response);
    }

    const response = {
      success: true,
      message: "Nearby rides fetched successfully.",
      applyRadius: applyRadius === "true",
      radius_used_km: applyRadius === "true" ? searchRadiusKm : "NOT APPLIED",
      count: nearbyRides.length,
      driver_location: [longitude, latitude],
      data: nearbyRides, // 🔥 nearest → farthest
    };

    await publisher.setEx(nearbyRidesCacheKey, 600, JSON.stringify(response));
    return res.status(200).json(response);
  } catch (error) {
    console.error("FetchNearByTaxiSafarRides error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch nearby rides.",
    });
  }
};

// Accept Ride with Redis Cache Invalidation
exports.acceptRide = async (req, res) => {
  const driverId = req.user.id;
  const { rideId } = req.params;

  if (!rideId || !mongoose.Types.ObjectId.isValid(rideId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid ride ID provided",
    });
  }

  const session = await mongoose.startSession();

  try {
    await session.startTransaction();

    // Step 1: Atomically claim the ride
    const ride = await TaxiSafariRide.findOneAndUpdate(
      {
        _id: rideId,
        trip_status: "searching",
      },
      {
        $set: {
          trip_status: "driver_assigned",
          driver_id: driverId,
          driver_assigned_at: new Date(),
        },
      },
      { new: true, session }
    );

    if (!ride) {
      throw {
        status: 409,
        success: false,
        message:
          "This ride has already been accepted by another driver. Please check for other available rides.",
      };
    }

    // Step 2: Load driver + wallet
    const driver = await Driver.findById(driverId)
      .select("fcm_token name phone wallet")
      .populate({
        path: "wallet",
        select: "balance lockAmounts",
      })
      .session(session);

    if (!driver) {
      throw {
        status: 404,
        success: false,
        message: "Driver account not found. Please contact support.",
      };
    }

    // Auto-create wallet if missing
    if (!driver.wallet) {
      const newWallet = await Wallet.create(
        [
          {
            driver: driver._id,
            balance: 0,
            lockAmounts: [],
          },
        ],
        { session }
      );

      driver.wallet = newWallet[0]._id;
      await driver.save({ session });

      throw {
        status: 403,
        success: false,
        message:
          "Your wallet is empty. Please add money to your wallet before accepting rides.",
        action: "add_money",
      };
    }

    const wallet = await Wallet.findById(driver.wallet).session(session);

    if (!wallet) {
      throw {
        status: 404,
        success: false,
        message: "Wallet not found. Please add money to activate your wallet.",
        action: "add_money",
      };
    }

    const rideAmount = Number(ride.original_amount) || 0;
    const requiredLockAmount = Math.round(rideAmount * 0.2);

    // Calculate available balance
    const totalLocked = wallet.lockAmounts
      .filter((lock) => !lock.isReleased)
      .reduce((sum, lock) => sum + lock.amount_lock, 0);

    const availableBalance = wallet.balance - totalLocked;

    if (availableBalance < requiredLockAmount) {
      // Send notification (non-blocking)
      if (driver.fcm_token) {
        await sendNotification
          .sendNotification(
            driver.fcm_token,
            "Insufficient Balance",
            `Add ₹${
              requiredLockAmount - availableBalance
            } more to accept this ride`,
            { type: "low_balance" },
            "low_balance_alert"
          )
          .catch((err) => console.error("FCM Error:", err));
      }

      throw {
        status: 403,
        success: false,
        message: `Insufficient wallet balance. You need ₹${requiredLockAmount} but only have ₹${availableBalance} available.`,
        details: {
          required: requiredLockAmount,
          available: availableBalance,
          shortfall: requiredLockAmount - availableBalance,
          rideAmount: rideAmount,
        },
        action: "add_money",
      };
    }

    // Step 3: Lock 20% amount
    await Wallet.findByIdAndUpdate(
      wallet._id,
      {
        $inc: { balance: -requiredLockAmount },
        $push: {
          lockAmounts: {
            amount_lock: requiredLockAmount,
            forRide: rideId,
            lockedAt: new Date(),
            isReleased: false,
          },
        },
      },
      { session }
    );

    // Commit transaction
    await session.commitTransaction();

    // ✅ DELETE RIDE CACHE on status change
    await deleteRideCache(rideId);

    // ✅ CACHE updated ride data
    await cacheRide(rideId, ride);

    // Success notification (after commit, non-blocking)
    if (driver.fcm_token) {
      await sendNotification
        .sendNotification(
          driver.fcm_token,
          "Ride Accepted Successfully! 🎉",
          `Trip of ₹${rideAmount} accepted. ₹${requiredLockAmount} locked from wallet.`,
          { rideId, type: "ride_accepted" },
          "ride_accepted"
        )
        .catch((err) => console.error("FCM Error:", err));
    }

    return res.status(200).json({
      success: true,
      message: "Ride accepted successfully! Navigate to pickup location.",
      data: {
        rideId: ride._id,
        tripAmount: rideAmount,
        lockedAmount: requiredLockAmount,
        remainingBalance: wallet.balance - requiredLockAmount - totalLocked,
        pickupLocation: ride.pickup_location,
      },
    });
  } catch (error) {
    // Abort transaction only if it's still in progress
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    console.error("acceptRide Error:", error);

    // Handle custom errors (thrown by us)
    if (error.status) {
      return res.status(error.status).json(error);
    }

    // Handle specific MongoDB errors
    if (error.name === "MongoError" || error.name === "MongoServerError") {
      return res.status(500).json({
        success: false,
        message: "Database error occurred. Please try again in a moment.",
      });
    }

    // Generic error
    return res.status(500).json({
      success: false,
      message:
        "Unable to accept ride at this moment. Please try again or contact support if the issue persists.",
    });
  } finally {
    await session.endSession();
  }
};

// Mark Reached At Pickup Location with Redis
exports.markReachedAtPickupLocation = async (req, res) => {
  try {
    const driverId = req.user?._id;
    const { rideId } = req.params;

    if (!driverId || !rideId) {
      return res.status(400).json({
        success: false,
        message: "Driver ID and Ride ID required",
      });
    }

    // ✅ TRY REDIS CACHE FIRST
    let rideData = await getRideFromCache(rideId);

    // If not in cache, fetch from DB
    if (!rideData) {
      rideData = await TaxiSafariRide.findById(rideId)
        .select("pickup_location driver_id trip_status customer_id")
        .lean();
    }

    if (!rideData || String(rideData.driver_id) !== String(driverId)) {
      return res.status(404).json({
        success: false,
        message: "Ride not found",
      });
    }

    // Extract pickup coordinates
    const [pickupLng, pickupLat] = rideData.pickup_location.coordinates;

    // ---- STEP 1: Fetch driver live location from Redis ----
    const redisKey = `driver:${driverId}`;
    const redisLocation = await redisClient.hGetAll(redisKey);

    let DriverDb;
    let driverLat, driverLng;

    if (redisLocation && redisLocation.lat && redisLocation.lng) {
      driverLat = parseFloat(redisLocation.lat);
      driverLng = parseFloat(redisLocation.lng);
    } else {
      // ---- STEP 2: Fallback to MongoDB driver last known location ----
      DriverDb = await Driver.findById(driverId)
        .select("current_location fcm_token")
        .lean();

      if (!DriverDb || !DriverDb.current_location?.coordinates) {
        return res.status(400).json({
          success: false,
          message: "Driver location unavailable",
        });
      }

      const [lng, lat] = DriverDb.current_location.coordinates;
      driverLat = lat;
      driverLng = lng;
    }

    // ---- STEP 3: Calculate distance between Driver → Pickup ----
    const distance = calculateDistance(
      driverLat,
      driverLng,
      pickupLat,
      pickupLng
    );

    if (distance > 200) {
      return res.status(400).json({
        success: false,
        message: `Driver must be within 200m of pickup. Current distance: ${Math.round(
          distance
        )} meters`,
      });
    }

    // ---- STEP 4: Atomic Update ----
    const updatedRide = await TaxiSafariRide.findOneAndUpdate(
      {
        _id: rideId,
        driver_id: driverId,
        trip_status: { $ne: "driver_arrived" },
      },
      {
        $set: {
          trip_status: "driver_arrived",
          driverReachedAt: new Date(),
        },
      },
      {
        new: true,
        projection: "customer_id trip_status pickup_address",
      }
    ).lean();

    if (!updatedRide) {
      return res.status(200).json({
        success: true,
        message: "Already marked as reached",
      });
    }

    // ✅ DELETE AND RECACHE with new status
    await deleteRideCache(rideId);
    await cacheRide(rideId, updatedRide);

    // ---- STEP 5: Async Notification ----
    (async () => {
      try {
        const token = DriverDb?.fcm_token;
        if (token) {
          await sendNotification.sendNotification(
            token,
            "You are Arrived at pickup location",
            "Ask OTP to Customer and Start Your Ride.",
            {},
            "ride_updates"
          );
        }
      } catch (err) {
        console.error("Notification Error:", err);
      }
    })();

    return res.status(200).json({
      success: true,
      message: "Driver marked as arrived successfully",
      data: updatedRide,
    });
  } catch (error) {
    console.error("markReachedAtPickupLocation Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to mark reached",
    });
  }
};

// Verify Ride OTP with Redis
exports.verifyRideOtp = async (req, res) => {
  try {
    const driverId = req.user?._id;
    const { rideId } = req.params;
    const { otp } = req.body;

    if (!driverId || !rideId || !otp) {
      return res.status(400).json({
        success: false,
        message: "Driver ID, Ride ID, and OTP are required",
      });
    }

    // 🔍 1. ATOMIC OTP verify — Only first request succeeds
    const ride = await TaxiSafariRide.findOneAndUpdate(
      {
        _id: rideId,
        driver_id: driverId,
        trip_status: "driver_arrived", // OTP only valid at this stage
        ride_otp: otp, // OTP must match
        otp_verified: false, // Ensure OTP isn't already used
      },
      {
        $set: {
          otp_verified: true,
          otp_verified_at: new Date(),
          trip_status: "trip_started",
          trip_started_at: new Date(),
        },
      },
      { new: true }
    ).lean();

    // ❌ OTP incorrect OR already used
    if (!ride) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP or OTP already verified",
      });
    }

    // ✅ DELETE AND RECACHE with new status
    await deleteRideCache(rideId);
    await cacheRide(rideId, ride);

    // 🔔 2. Send notification to driver (non-blocking)
    (async () => {
      try {
        const DriverDb = await Driver.findById(driverId).select("fcm_token");
        if (DriverDb?.fcm_token) {
          await sendNotification.sendNotification(
            DriverDb.fcm_token,
            "OTP Verified",
            "OTP verified successfully. Ride has been started.",
            { rideId },
            "ride_updates"
          );
        }
      } catch (err) {
        console.error("Notification Error:", err);
      }
    })();

    return res.status(200).json({
      success: true,
      message: "OTP verified and ride started",
      data: ride,
    });
  } catch (error) {
    console.error("verifyRideOtp Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to verify OTP",
    });
  }
};

// Complete Ride with Redis Cache Invalidation
exports.completeRide = async (req, res) => {
  const { rideId } = req.body;
  const driverId = req.user?._id;

  // Start MongoDB Session for Transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Validate Auth & Input
    if (!driverId) {
      await session.abortTransaction();
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    if (!rideId) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "rideId is required.",
      });
    }

    // 2. Fetch Ride with Session
    const ride = await TaxiSafariRide.findById(rideId).session(session);
    if (!ride) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Ride not found.",
      });
    }

    if (ride.driver_id.toString() !== driverId.toString()) {
      await session.abortTransaction();
      return res.status(403).json({
        success: false,
        message: "Unauthorized: This ride does not belong to you.",
      });
    }

    if (ride.trip_status !== "trip_started") {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: `Ride is already ${ride.trip_status}. Cannot complete again.`,
      });
    }

    // 3. Fetch Driver Location
    const driver = await Driver.findById(driverId)
      .select("current_location")
      .session(session);

    if (!driver?.current_location?.coordinates?.length) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Driver's current location is missing.",
      });
    }

    const driverLat = driver.current_location.coordinates[1];
    const driverLng = driver.current_location.coordinates[0];
    const dropLat = ride.destination_location.coordinates[1];
    const dropLng = ride.destination_location.coordinates[0];

    // 4. Haversine Distance Calculation
    const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
      const R = 6371;
      const toRad = (deg) => (deg * Math.PI) / 180;
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);

      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    const distanceDiffKm = calculateDistanceKm(
      dropLat,
      dropLng,
      driverLat,
      driverLng
    );
    let extraKm = 0;
    let extraFare = 0;

    if (distanceDiffKm > 1) {
      extraKm = Math.round(distanceDiffKm * 100) / 100;
      const ratePerKm = ride.extra_km_rate || 12;
      extraFare = Math.round(extraKm * ratePerKm);
    }

    const originalAmount = ride.original_amount || 0;
    const revisedAmount = originalAmount + extraFare;

    // 5. Update Ride
    ride.trip_completed_at = new Date();
    ride.actual_drop_location = {
      type: "Point",
      coordinates: [driverLng, driverLat],
    };
    ride.extra_km_travelled = extraKm;
    ride.extra_km_fare = extraFare;
    ride.revised_amount = revisedAmount;
    ride.trip_status = "trip_completed";

    await ride.save({ session });

    // 6. Release Wallet Lock & Create Transaction
    const wallet = await Wallet.findOne({ driver: driverId }).session(session);
    if (!wallet) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Driver wallet not found.",
      });
    }

    const lockIndex = wallet.lockAmounts.findIndex(
      (lock) => lock.forRide?.toString() === rideId && !lock.isReleased
    );

    if (lockIndex === -1) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "No active lock found for this ride.",
      });
    }

    const lockedAmount = wallet.lockAmounts[lockIndex].amount_lock;

    // Release lock
    wallet.lockAmounts[lockIndex].isReleased = true;
    wallet.lockAmounts[lockIndex].releasedAt = new Date();
    wallet.balance += lockedAmount;

    // Create transaction record
    const transaction = new Transaction({
      driver: driverId,
      ride: rideId,
      type: "credit",
      amount: lockedAmount,
      status: "completed",
      paymentMethod: "lock_release",
      description: `Security lock released for completed ride #${rideId}`,
      completedAt: new Date(),
    });

    await transaction.save({ session });
    wallet.transactions.push(transaction._id);
    await wallet.save({ session });

    // Commit Transaction
    await session.commitTransaction();
    session.endSession();

    // ✅ DELETE RIDE CACHE on completion
    await deleteRideCache(rideId);
    // Optionally, cache the completed ride data
    await cacheRide(rideId, ride);

    // 7. Background FCM Notification (Fire-and-forget)
    (async () => {
      try {
        const driverDoc = await Driver.findById(driverId).select(
          "fcm_token name"
        );
        if (!driverDoc?.fcm_token) return;

        const title =
          extraFare > 0
            ? "Ride Completed – Extra Charges Applied"
            : "Ride Completed Successfully";

        const message =
          extraFare > 0
            ? `Earned ₹${revisedAmount} (+₹${extraFare} extra for ${extraKm} km)`
            : `Ride completed. Earned ₹${originalAmount}.`;

        await sendNotification.sendNotification(
          driverDoc.fcm_token,
          title,
          message,
          { rideId, type: "ride_completed" },
          "payment_channel"
        );
      } catch (err) {
        console.error("FCM Error (Ride Complete):", err.message);
      }
    })();

    // 8. Success Response
    return res.status(200).json({
      success: true,
      message: "Ride completed successfully.",
      data: {
        rideId: ride._id,
        originalAmount,
        extraKm,
        extraFare,
        revisedAmount,
        lockReleased: lockedAmount,
        tripCompletedAt: ride.trip_completed_at,
      },
    });
  } catch (error) {
    // Rollback on any error
    await session.abortTransaction();
    session.endSession();

    console.error("Complete Ride Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to complete ride. Transaction rolled back.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

exports.rideStatus = async (req, res) => {
  const { rideId } = req.params;

  if (!rideId || rideId.length < 12 || rideId.length > 24) {
    return res.status(400).json({ success: false, message: "Invalid rideId" });
  }

  console.log("rideId", rideId);

  try {
    // 1️⃣ Check TaxiSafariRide
    let ride = await TaxiSafariRide.findById(rideId)
      .select("trip_status -_id")
      .lean();

    if (ride) {
      return res.status(200).json({
        success: true,
        status: ride.trip_status,
        source: "taxi",
      });
    }

    // 2️⃣ Check RidePost
    ride = await RidePost.findById(rideId).select("rideStatus -_id").lean();

    if (ride) {
      return res.status(200).json({
        success: true,
        status: ride.rideStatus,
        source: "post",
      });
    }

    // 3️⃣ Not found
    console.log("Ride not found in either collection:", rideId);
    return res.status(404).json({
      success: false,
      message: "Ride not found",
      status: "not_found",
    });
  } catch (error) {
    console.error("rideStatus error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      status: "error",
    });
  }
};
