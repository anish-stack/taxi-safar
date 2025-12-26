const RidesPost = require("../../models/rides_post/Rides_Post");
const Driver = require("../../models/driver/driver.model");
const {
  addRideNotificationJob,
} = require("../../queues/RidePostNotifications");
const { getGoogleRouteData } = require("../../utils/googleDistance");
const { getDistanceInMeters } = require("../../utils/distance");
const mongoose = require("mongoose");
const NotificationService = require("../../utils/notificationService");
const sendNotification = require("../../utils/sendNotification");

exports.postRide = async (req, res) => {
  try {
    const driverId = req.user?._id;
    if (!driverId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please login.",
      });
    }

    /* =======================
       1️⃣ Extract Body Data
    ======================= */
    const {
      tripType,
      vehicleType,
      pickupDate,
      pickupTime,
      pickupAddress,
      pickupLocation,
      dropAddress,
      dropLocation,
      contactType,

      totalAmount,
      driverEarning,
      commissionAmount,

      returnDate,
      billableDistance,

      extraKmCharge = 0,
      extraMinCharge = 0,
      acceptBookingType,
      companyDetails,

      extraRequirements = [],
      notes = "",
      paymentMethod = "cash",

      stops = [],
      // 🔹 Route data from frontend
      polyLine,
      estimatedDuration,
      totalDistance,
    } = req.body;

    console.log("📥 Received ride post data", req.body);

    /* =======================
       2️⃣ Required Validation
    ======================= */
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

    if (requiredFields.some((f) => !f)) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided",
      });
    }

    /* =======================
       3️⃣ Validate Coordinates
    ======================= */
    const validateCoords = (loc, name) => {
      if (
        !loc ||
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

    /* =======================
       4️⃣ Validate Enums
    ======================= */
    const validTripTypes = [
      "one-way",
      "round-trip",
      "rental",
      "outstation",
      "hourly",
    ];
    // const validVehicleTypes = [
    //   "mini",
    //   "hatchback",
    //   "sedan",
    //   "suv",
    //   "muv",
    //   "auto",
    //   "luxury",
    //   "van",
    // ];
    const validBookingTypes = ["instant", "scheduled", "both"];

    if (!validTripTypes.includes(tripType))
      return res
        .status(400)
        .json({ success: false, message: "Invalid tripType" });

    // if (!validVehicleTypes.includes(vehicleType))
    //   return res
    //     .status(400)
    //     .json({ success: false, message: "Invalid vehicleType" });

    if (!validBookingTypes.includes(acceptBookingType))
      return res
        .status(400)
        .json({ success: false, message: "Invalid acceptBookingType" });

    /* =======================
       5️⃣ Validate Amounts
    ======================= */
    if (totalAmount <= 0 || driverEarning <= 0 || driverEarning > totalAmount) {
      return res.status(400).json({
        success: false,
        message: "Invalid totalAmount or driverEarning",
      });
    }

    /* =======================
       6️⃣ Validate Pickup Time
    ======================= */
    const pickupDateTime = new Date(`${pickupDate}T${pickupTime}:00`);
    if (isNaN(pickupDateTime) || pickupDateTime <= new Date()) {
      return res.status(400).json({
        success: false,
        message: "Pickup time must be in the future",
      });
    }

    /* =======================
       7️⃣ Driver Check
    ======================= */
    const driver = await Driver.findById(driverId).select(
      "driver_name account_status current_vehicle_id fcm_token"
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

    /* =======================
       8️⃣ Extra Requirements
    ======================= */
    const extraReqObj = {
      onlyDiesel: false,
      musicSystem: false,
      ac: false,
      carrier: false,
      allInclusive: false,
      allExclusive: false,
      foodAllowed: false,
    };

    if (Array.isArray(extraRequirements)) {
      extraRequirements.forEach((r) => {
        const k = r.toLowerCase();
        if (k.includes("diesel")) extraReqObj.onlyDiesel = true;
        if (k.includes("music")) extraReqObj.musicSystem = true;
        if (k === "ac") extraReqObj.ac = true;
        if (k.includes("carrier")) extraReqObj.carrier = true;
        if (k.includes("inclusive")) extraReqObj.allInclusive = true;
        if (k.includes("exclusive")) extraReqObj.allExclusive = true;
        if (k.includes("food")) extraReqObj.foodAllowed = true;
      });
    }

    /* =======================
       9️⃣ Commission Check
    ======================= */
    const finalCommission = commissionAmount ?? Math.round(totalAmount * 0.2);

    const calculatedEarning = totalAmount - finalCommission;

    if (Math.abs(driverEarning - calculatedEarning) > 10) {
      return res.status(400).json({
        success: false,
        message: `Driver earning should be approx ₹${calculatedEarning}`,
      });
    }

    /* =======================
       🔟 Route Calculation
    ======================= */
    let distanceKm = null;
    let durationText = null;
    let routePolyline = null;

    if (polyLine && estimatedDuration && totalDistance) {
      // ✅ Use frontend route data
      distanceKm = Number(totalDistance);
      durationText = estimatedDuration;
      routePolyline = polyLine;

      console.log("✅ Using frontend route data");
    } else {
      // 🔁 Fallback to Google
      try {
        console.log("🌍 Calling Google Directions API");
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
        console.warn("⚠️ Google routing failed:", err.message);
      }
    }

    // === Normalize Stops (Frontend → GeoJSON) ===
    let normalizedStops = [];

    if (Array.isArray(stops) && stops.length > 0) {
      normalizedStops = stops.map((stop, index) => {
        // Case 1: Already GeoJSON (your current case)
        if (
          stop.coordinates?.type === "Point" &&
          Array.isArray(stop.coordinates.coordinates) &&
          stop.coordinates.coordinates.length === 2
        ) {
          return {
            location: stop.location,
            geoLocation: {
              type: "Point",
              coordinates: stop.coordinates.coordinates, // ✅ DIRECT
            },
          };
        }

        // Case 2: lat/lng object (fallback)
        if (
          stop.coordinates &&
          typeof stop.coordinates.lat === "number" &&
          typeof stop.coordinates.lng === "number"
        ) {
          return {
            location: stop.location,
            geoLocation: {
              type: "Point",
              coordinates: [stop.coordinates.lng, stop.coordinates.lat],
            },
          };
        }

        throw new Error(`Invalid stop coordinates at index ${index}`);
      });
    }

    /* =======================
       1️⃣1️⃣ Create Ride
    ======================= */
    const newRide = new RidesPost({
      driverPostId: driverId,
      tripType,
      vehicleType,
      pickupDate: pickupDateTime,
      pickupTime,
      pickupAddress,
      pickupLocation: { type: "Point", coordinates: [pickupLng, pickupLat] },
      dropAddress,
      dropLocation: { type: "Point", coordinates: [dropLng, dropLat] },
      returnDate,
      billableDistance,
      distanceKm,
      durationText,
      routePolyline,
      totalAmount,
      commissionAmount: finalCommission,
      driverEarning: calculatedEarning,
      extraKmCharge,
      extraMinCharge,
      acceptBookingType,
      extraRequirements: extraReqObj,
      notes,
      companyId: companyDetails,
      contactType,
      stops: normalizedStops,
      paymentMethod,
      paymentStatus: "pending",
      rideStatus: "pending",
      isActive: true,
    });

    await newRide.save();

    try {
      await sendNotification.sendNotification(
        driver.fcm_token,
        "🚗 Ride Posted Successfully",
        `Your ${tripType.replace(
          "-",
          " "
        )} trip from ${pickupAddress} to ${dropAddress} is now live! Drivers can view and accept it.`
      );
      await NotificationService.sendUniversalNotification({
        driverId,
        title: "🚗 Ride Posted Successfully",
        message: `Your ${tripType.replace()} trip from ${pickupAddress} to ${dropAddress} is now live! Customers can book it.`,
        type: "ride",
        icon: "Car",
        relatedData: {
          rideId: newRide._id,
          action: "ride_posted",
          tripType,
          pickupAddress,
          dropAddress,
          totalAmount,
          driverEarning: calculatedEarning,
          pickupDate: pickupDate,
          pickupTime,
        },
      });

      console.log("🔔 Ride posted notification sent to driver:", driverId);
    } catch (notifError) {
      console.warn(
        "⚠️ Failed to send ride posted notification:",
        notifError.message
      );
    }
    /* =======================
       1️⃣2️⃣ Response
    ======================= */
    return res.status(201).json({
      success: true,
      message: "Ride posted successfully",
      data: {
        rideId: newRide._id,
        pickupDateTime,
        distanceKm,
        durationText,
        driverEarning: calculatedEarning,
        status: "pending",
      },
    });
  } catch (error) {
    console.error("❌ postRide Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to post ride",
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
  .populate("companyId")
  .populate({
    path: "assignedDriverId",
    select: "driver_name driver_contact_number profile_image average_rating current_vehicle_id",
    populate: {
      path: "current_vehicle_id",
      select: "vehicle_type vehicle_name vehicle_number",
    },
  });

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

exports.updateRide = async (req, res) => {
  try {
    const { rideId } = req.params;
    const driverId = req.user?._id;

    if (!driverId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const {
      tripType,
      vehicleType,
      pickupDate,
      pickupTime,
      pickupAddress,
      pickupLocation,
      dropAddress,
      dropLocation,
      totalAmount,
      commissionAmount,
      extraKmCharge,
      extraMinCharge,
      acceptBookingType,
      extraRequirements,
      notes,
      contactType,
      stops,
      paymentMethod,
      polyLine,
      estimatedDuration,
      totalDistance,
    } = req.body;

    /* ===============================
       🔍 Fetch Ride
    =============================== */
    const ride = await RidesPost.findOne({
      _id: rideId,
      driverPostId: driverId,
      isActive: true,
    });

    if (!ride) {
      return res.status(404).json({
        success: false,
        message: "Ride not found or unauthorized",
      });
    }

    /* ===============================
       🔁 Detect route-impacting changes
    =============================== */
    let shouldRecalculateRoute = false;

    if (
      pickupLocation?.coordinates &&
      JSON.stringify(pickupLocation.coordinates) !==
      JSON.stringify(ride.pickupLocation.coordinates)
    ) {
      shouldRecalculateRoute = true;
    }

    if (
      dropLocation?.coordinates &&
      JSON.stringify(dropLocation.coordinates) !==
      JSON.stringify(ride.dropLocation.coordinates)
    ) {
      shouldRecalculateRoute = true;
    }

    if (Array.isArray(stops)) {
      shouldRecalculateRoute = true;
    }

    /* ===============================
       🔁 Normalize Stops
    =============================== */
    let normalizedStops = ride.stops;

    if (Array.isArray(stops)) {
      normalizedStops = stops.map((stop, index) => {
        if (
          stop.coordinates?.type === "Point" &&
          Array.isArray(stop.coordinates.coordinates)
        ) {
          return {
            location: stop.location,
            geoLocation: {
              type: "Point",
              coordinates: stop.coordinates.coordinates,
            },
          };
        }

        if (stop.coordinates?.lat && stop.coordinates?.lng) {
          return {
            location: stop.location,
            geoLocation: {
              type: "Point",
              coordinates: [stop.coordinates.lng, stop.coordinates.lat],
            },
          };
        }

        throw new Error(`Invalid stop at index ${index}`);
      });
    }

    /* ===============================
       🗓 Date & Time
    =============================== */
    if (pickupDate && pickupTime) {
      const pickupDateTime = new Date(`${pickupDate}T${pickupTime}:00`);
      if (pickupDateTime <= new Date()) {
        return res.status(400).json({
          success: false,
          message: "Pickup time must be in the future",
        });
      }
      ride.pickupDate = pickupDateTime;
      ride.pickupTime = pickupTime;
    }

    /* ===============================
       🚗 Vehicle Change
    =============================== */
    if (vehicleType && vehicleType !== ride.vehicleType) {
      ride.vehicleType = vehicleType;

      // 🔁 Reset pricing if vehicle changed
      ride.totalAmount = totalAmount || 0;
      ride.commissionAmount = commissionAmount || 0;
      ride.driverEarning =
        totalAmount && commissionAmount ? totalAmount - commissionAmount : 0;
    }

    /* ===============================
       📍 Pickup / Drop
    =============================== */
    if (pickupAddress) ride.pickupAddress = pickupAddress;
    if (dropAddress) ride.dropAddress = dropAddress;

    if (pickupLocation?.coordinates?.length === 2) {
      ride.pickupLocation = {
        type: "Point",
        coordinates: pickupLocation.coordinates,
      };
    }

    if (dropLocation?.coordinates?.length === 2) {
      ride.dropLocation = {
        type: "Point",
        coordinates: dropLocation.coordinates,
      };
    }

    /* ===============================
       🧮 Pricing
    =============================== */
    if (totalAmount && commissionAmount) {
      ride.totalAmount = totalAmount;
      ride.commissionAmount = commissionAmount;
      ride.driverEarning = totalAmount - commissionAmount;
    }

    if (extraKmCharge !== undefined) ride.extraKmCharge = extraKmCharge;

    if (extraMinCharge !== undefined) ride.extraMinCharge = extraMinCharge;

    /* ===============================
       🧩 Extra Requirements
    =============================== */
    if (Array.isArray(extraRequirements)) {
      ride.extraRequirements = {
        onlyDiesel: extraRequirements.includes("onlydiesel"),
        musicSystem: extraRequirements.includes("musicsystem"),
        ac: extraRequirements.includes("ac"),
        carrier: extraRequirements.includes("withcarrier"),
        allInclusive: extraRequirements.includes("allinclusive"),
        allExclusive: extraRequirements.includes("allexclusive"),
        foodAllowed: extraRequirements.includes("foodallowed"),
      };
    }

    /* ===============================
       🗺 Route Data (NO Google call)
       — accept frontend-calculated route
    =============================== */
    if (!shouldRecalculateRoute) {
      if (polyLine) ride.routePolyline = polyLine;
      if (estimatedDuration) ride.durationText = estimatedDuration;
      if (totalDistance) ride.distanceKm = totalDistance;
    }

    /* ===============================
       🔄 Misc
    =============================== */
    if (acceptBookingType) ride.acceptBookingType = acceptBookingType;
    if (notes !== undefined) ride.notes = notes;
    if (contactType) ride.contactType = contactType;
    if (paymentMethod) ride.paymentMethod = paymentMethod;

    ride.stops = normalizedStops;

    await ride.save();

    return res.status(200).json({
      success: true,
      message: "Ride updated successfully",
      data: {
        rideId: ride._id,
        vehicleType: ride.vehicleType,
        distanceKm: ride.distanceKm,
        durationText: ride.durationText,
      },
    });
  } catch (error) {
    console.error("❌ updateRide Error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to update ride",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

exports.StartTripPost = async (req, res) => {
  try {
    const { rideId } = req.params;
    const driverId = req.user?._id;

    if (!driverId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Fetch ride
    const ride = await RidesPost.findById(rideId);
    if (!ride || ride.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Ride not found",
      });
    }

    // Check driver assignment
    if (
      !ride.assignedDriverId ||
      ride.assignedDriverId.toString() !== driverId.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not assigned to this ride",
      });
    }

    // Ride status validation
    if (["started", "completed"].includes(ride.rideStatus)) {
      return res.status(400).json({
        success: false,
        message: "Ride already started or completed",
      });
    }

    if (ride.rideStatus.includes("cancelled")) {
      return res.status(400).json({
        success: false,
        message: "Cancelled ride cannot be started",
      });
    }

    /* ===============================================
       PICKUP TIME VALIDATION
    =============================================== */

    const now = new Date();
    const pickupDate = new Date(ride.pickupDate);
    const pickupTime = ride.pickupTime; // Format: "HH:MM" e.g., "15:30"

    // Combine pickupDate and pickupTime into a single datetime
    const [pickupHours, pickupMinutes] = pickupTime.split(":").map(Number);

    const scheduledPickupDateTime = new Date(pickupDate);
    scheduledPickupDateTime.setHours(pickupHours, pickupMinutes, 0, 0);

    // Check if current time is before scheduled pickup time
    // ⏱️ Grace period in minutes
    const GRACE_MINUTES = 5;

    // Convert grace to milliseconds
    const graceMs = GRACE_MINUTES * 60 * 1000;

    // Allowed start time = pickup time - 5 minutes
    const allowedStartTime = new Date(
      scheduledPickupDateTime.getTime() - graceMs
    );

    if (now < allowedStartTime) {
      const timeDifferenceMs = allowedStartTime - now;
      const minutesRemaining = Math.ceil(timeDifferenceMs / (1000 * 60));
      const hoursRemaining = Math.floor(minutesRemaining / 60);
      const minsRemaining = minutesRemaining % 60;

      let timeMessage = "";
      if (hoursRemaining > 0) {
        timeMessage = `${hoursRemaining} hour${hoursRemaining > 1 ? "s" : ""
          } and ${minsRemaining} minute${minsRemaining !== 1 ? "s" : ""}`;
      } else {
        timeMessage = `${minutesRemaining} minute${minutesRemaining !== 1 ? "s" : ""
          }`;
      }

      return res.status(400).json({
        success: false,
        message: `You can start the ride only within ${GRACE_MINUTES} minutes of the scheduled pickup time`,
        details: {
          scheduled_pickup_time: scheduledPickupDateTime.toLocaleString(
            "en-IN",
            {
              timeZone: "Asia/Kolkata",
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }
          ),
          allowed_start_time: allowedStartTime.toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
          time_remaining: timeMessage,
          current_time: now.toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      });
    }

    /* ===============================================
       LOCATION VALIDATION
    =============================================== */

    // Fetch driver current location
    const driver = await Driver.findById(driverId);
    if (!driver?.current_location?.coordinates) {
      return res.status(400).json({
        success: false,
        message: "Driver current location not available",
      });
    }

    const [driverLng, driverLat] = driver.current_location.coordinates;
    const [pickupLng, pickupLat] = ride.pickupLocation.coordinates;

    // Distance check (500 meters)
    const distanceInMeters = getDistanceInMeters(
      driverLat,
      driverLng,
      pickupLat,
      pickupLng
    );

    // if (distanceInMeters > 5000) {
    //   return res.status(400).json({
    //     success: false,
    //     message:
    //       "You are too far from pickup location. Reach within 5km meters to start the ride.",
    //     distance: Math.round(distanceInMeters),
    //   });
    // }

    /* ===============================================
       START RIDE
    =============================================== */

    ride.rideStatus = "started";
    ride.rideStartAt = new Date();

    await ride.save();

    return res.status(200).json({
      success: true,
      message: "Ride started successfully",
      ride,
    });
  } catch (error) {
    console.error("StartTripPost error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

exports.CompleteTripPost = async (req, res) => {
  try {
    const { rideId } = req.params;
    const driverId = req.user?._id;

    if (!driverId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Fetch ride
    const ride = await RidesPost.findById(rideId)
   
      .select('+pickupAddress +dropAddress +totalAmount +driverEarning');

    if (!ride || ride.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Ride not found",
      });
    }

    // Check driver assignment
    if (
      !ride.assignedDriverId ||
      ride.assignedDriverId.toString() !== driverId.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not assigned to this ride",
      });
    }

    // Ride must be started first
    if (ride.rideStatus !== "started") {
      return res.status(400).json({
        success: false,
        message: "Ride must be started before completing",
      });
    }

    // Complete ride
    ride.rideStatus = "completed";
    ride.rideEndAt = new Date();

    await ride.save();

    /* =======================
       🔔 Send Notification to Driver
    ======================= */
    try {
      const earningAmount = ride.driverEarning || ride.totalAmount * 0.8; // fallback if not set

      await NotificationService.sendUniversalNotification({
        driverId,
        title: "🎉 Trip Completed Successfully!",
        message: `Great job! Your trip from ${ride.pickupAddress} to ${ride.dropAddress} has been completed. `,
        type: "ride",
        icon: "CheckCircle2",
        relatedData: {
          rideId: ride._id,
          action: "trip_completed",
          pickupAddress: ride.pickupAddress,
          dropAddress: ride.dropAddress,
          totalAmount: ride.totalAmount,
          driverEarning: earningAmount,
          completedAt: ride.rideEndAt,
        },
      });

      console.log("🔔 Trip completion notification sent to driver:", driverId);
    } catch (notifError) {
      console.warn("⚠️ Failed to send trip completion notification:", notifError.message);
      // Don't fail the request if notification fails
    }

    return res.status(200).json({
      success: true,
      message: "Ride completed successfully",
      data: {
        rideId: ride._id,
        rideStatus: ride.rideStatus,
        completedAt: ride.rideEndAt,
        driverEarning: ride.driverEarning,
      },
    });
  } catch (error) {
    console.error("CompleteTripPost error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
exports.createIssue = async (req, res) => {
  try {
    const { rideId } = req.params;
    const { issue } = req.body;

    if (!issue || issue.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Issue description is required",
      });
    }

    const ride = await RidesPost.findById(rideId);
    if (!ride || ride.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Ride not found",
      });
    }

    // ✅ Allowed ride statuses
    const allowedStatuses = [
      "completed",
      "cancelled-by-customer",
      "cancelled-by-driver",
      "cancelled-by-admin",
    ];

    if (!allowedStatuses.includes(ride.rideStatus)) {
      return res.status(400).json({
        success: false,
        message:
          "Issue can be reported only after ride completion or cancellation",
      });
    }

    // ✅ Ride must be ended
    if (!ride.rideEndAt) {
      return res.status(400).json({
        success: false,
        message: "Ride has not ended yet",
      });
    }

    // ✅ 20 minutes validation
    const now = new Date();
    const diffInMinutes = (now - ride.rideEndAt) / (1000 * 60);

    if (diffInMinutes > 20) {
      return res.status(400).json({
        success: false,
        message: "Issue can be reported only within 20 minutes after ride end",
      });
    }

    // ✅ Prevent duplicate issue
    if (ride.issue) {
      return res.status(400).json({
        success: false,
        message: "Issue already reported for this ride",
      });
    }

    // ✅ Save issue
    ride.issue = issue.trim();
    ride.issueCreatedAt = new Date();
    await ride.save();

    return res.status(200).json({
      success: true,
      message: "Issue reported successfully",
      data: {
        rideId: ride._id,
        issue: ride.issue,
        issueCreatedAt: ride.issueCreatedAt,
      },
    });
  } catch (error) {
    console.error("Error reporting issue:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
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
exports.addBussinessRating = async (req, res) => {
  try {
    const { rideId } = req.params;
    const { customerRating, feedback } = req.body;

    if (customerRating < 0 || customerRating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 0 and 5",
      });
    }

    // Fetch ride with company
    const ride = await RidesPost.findById(rideId).populate("companyId");

    if (!ride || ride.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Ride not found",
      });
    }

    // Ride must be completed
    if (ride.rideStatus !== "completed") {
      return res.status(400).json({
        success: false,
        message: "Rating can only be added after ride completion",
      });
    }

    // Prevent duplicate rating
    if (ride.customerRating && ride.customerRating > 0) {
      return res.status(400).json({
        success: false,
        message: "Rating already submitted for this ride",
      });
    }

    // Save rating on ride
    ride.customerRating = customerRating;
    ride.paymentStatus = "completed";
    ride.feedback = feedback || "";
    await ride.save();

    // Update company rating
    if (ride.companyId) {
      const company = ride.companyId;

      const previousTotalRatings = company.totalRatings || 0;
      const previousAvgRating = company.rating || 0;

      const newTotalRatings = previousTotalRatings + 1;

      // Calculate new average
      const newAverageRating =
        (previousAvgRating * previousTotalRatings + customerRating) /
        newTotalRatings;

      company.totalRatings = newTotalRatings;
      company.successfulRides = (company.successfulRides || 0) + 1;
      company.rating = Number(newAverageRating.toFixed(2));

      await company.save();
    }

    return res.status(200).json({
      success: true,
      message: "Rating added successfully",
      data: {
        rideId: ride._id,
        customerRating: ride.customerRating,
        companyRating: ride.companyId?.rating || 0,
        totalRatings: ride.companyId?.totalRatings || 0,
      },
    });
  } catch (error) {
    console.error("Error adding rating:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
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
exports.searchNearbyRides = async (req, res) => {
  try {
    const driverId = req.user?._id;
    const { applyRadius } = req.query;

    if (!driverId) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    // Fetch driver with preferences and current vehicle
    const driver = await Driver.findById(driverId)
      .select("driver_name current_location current_vehicle_id currentRadius preferences")
      .populate("current_vehicle_id")
      .lean();

    if (!driver) {
      return res.status(404).json({ success: false, message: "Driver not found." });
    }

    // Determine accepted vehicle types
    const currentVehicleType = driver.current_vehicle_id?.vehicle_type || null;
    const preferences = driver.preferences || {};
    const acceptedVehicleTypes = [];

    if (currentVehicleType) acceptedVehicleTypes.push(currentVehicleType);
    if (preferences.accept_mini_rides && !acceptedVehicleTypes.includes("mini")) acceptedVehicleTypes.push("mini");
    if (preferences.accept_sedan_rides && !acceptedVehicleTypes.includes("sedan")) acceptedVehicleTypes.push("sedan");
    if (preferences.accept_suv_rides && !acceptedVehicleTypes.includes("suv")) acceptedVehicleTypes.push("suv");

    const vehicleTypeQuery = acceptedVehicleTypes.length > 0 ? { vehicleType: { $in: acceptedVehicleTypes } } : {};

    // Date & time filter
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentTimeStr = now.toTimeString().slice(0, 5);

    const dateTimeFilter = {
      $or: [
        { pickupDate: { $gt: today } },
        { pickupDate: today, pickupTime: { $gte: currentTimeStr } },
      ],
    };

    // Base query: status, preferences, date/time
    const baseQuery = {
      rideStatus: "pending",
      ...vehicleTypeQuery,
      driverPostId: { $ne: driverId },
      ...dateTimeFilter,
    };

    let rides = [];

    // If applyRadius is true, filter by location + radius
    if (applyRadius === "true") {
      const [longitude, latitude] = driver.current_location?.coordinates || [null, null];
      const hasValidLocation = longitude !== null && latitude !== null && !isNaN(longitude) && !isNaN(latitude);
      const maxDistanceMeters = (driver.currentRadius || 5) * 1000;

      if (hasValidLocation) {
        rides = await RidesPost.aggregate([
          {
            $geoNear: {
              key: "pickupLocation",
              near: { type: "Point", coordinates: [longitude, latitude] },
              distanceField: "distanceInMeters",
              maxDistance: maxDistanceMeters,
              spherical: true,
              query: baseQuery,
            },
          },
          {
            $addFields: {
              dateTimeSort: {
                $concat: [
                  { $dateToString: { format: "%Y-%m-%d", date: "$pickupDate" } },
                  "T",
                  "$pickupTime",
                ],
              },
            },
          },
          { $sort: { dateTimeSort: 1, distanceInMeters: 1 } },
          { $limit: 20 },
        ]);
      }
    }

    // Fallback: if not applying radius or no valid location, just filter by preferences + date/time
    if (!rides.length) {
      rides = await RidesPost.aggregate([
        { $match: baseQuery },
        {
          $addFields: {
            dateTimeSort: {
              $concat: [
                { $dateToString: { format: "%Y-%m-%d", date: "$pickupDate" } },
                "T",
                "$pickupTime",
              ],
            },
          },
        },
        { $sort: { dateTimeSort: 1 } },
        { $limit: 20 },
      ]);
    }

    return res.status(200).json({
      success: true,
      message: rides.length ? "Rides fetched successfully." : "No rides found.",
      applyRadius: applyRadius === "true",
      count: rides.length,
      data: rides.map((ride) => ({
        ...ride,
        distance_km: ride.distanceInMeters ? (ride.distanceInMeters / 1000).toFixed(2) : "N/A",
      })),
    });

  } catch (error) {
    console.error("searchNearbyRides error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
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

exports.getMyRideAllPost = async (req, res) => {
  try {
    const driverId = req.user?._id;
    if (!driverId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please login to search rides.",
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filters = { driverPostId: driverId };

    const totalRides = await RidesPost.countDocuments(filters);

    const rides = await RidesPost.find(filters)
      .populate(
        "driverPostId",
        "driver_name driver_contact_number average_rating"
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      success: true,
      page,
      limit,
      totalPages: Math.ceil(totalRides / limit),
      totalRides,
      data: rides,
    });
  } catch (error) {
    console.error("Error in getMyRideAllPost:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching driver rides",
      error: error.message,
    });
  }
};

exports.getEarningsByDriver = async (req, res) => {
  try {
    const driverId = req.params.id || req.user?.id;

    if (!driverId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please login.",
      });
    }

    const driverObjectId = new mongoose.Types.ObjectId(driverId);

    /* ------------------------------------------------
       1️⃣ Overall Earnings Summary
    ------------------------------------------------ */
    const summaryAgg = await RidesPost.aggregate([
      {
        $match: {
          assignedDriverId: driverObjectId,
          rideStatus: "completed",
          driverEarning: { $gt: 0 },
        },
      },
      {
        $group: {
          _id: null,
          totalEarnings: { $sum: "$driverEarning" },
          totalRides: { $sum: 1 },
          averageEarningsPerRide: { $avg: "$driverEarning" },
        },
      },
    ]);

    /* ------------------------------------------------
       2️⃣ Date-wise Earnings (Daily)
       ✅ using createdAt (Date type)
    ------------------------------------------------ */
    const earningsByDate = await RidesPost.aggregate([
      {
        $match: {
          assignedDriverId: driverObjectId,
          rideStatus: "completed",
          driverEarning: { $gt: 0 },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$rideEndAt",
              timezone: "Asia/Kolkata",
            },
          },
          totalEarnings: { $sum: "$driverEarning" },
          totalRides: { $sum: 1 },
        },
      },
      { $sort: { _id: -1 } },
    ]);

    return res.status(200).json({
      success: true,
      data: {
        summary: summaryAgg[0] || {
          totalEarnings: 0,
          totalRides: 0,
          averageEarningsPerRide: 0,
        },
        earningsByDate,
      },
    });
  } catch (error) {
    console.error("❌ getEarningsByDriver error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch earnings",
    });
  }
};
