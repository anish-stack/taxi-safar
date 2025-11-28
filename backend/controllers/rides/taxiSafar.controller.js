const { getGoogleRouteData } = require("../../utils/googleDistance");
const TaxiSafariRide = require("../../models/rides/taxi_safar_ride");
const Driver = require("../../models/driver/driver.model");
const sendNotification = require("../../utils/sendNotification");
const mongoose = require("mongoose");
const Wallet = require("../../models/driver/Wallet")
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

    // Extract coordinates for Google API
    const pickupLat = pickup_location?.coordinates?.[1] || 0;
    const pickupLng = pickup_location?.coordinates?.[0] || 0;
    const dropLat = destination_location?.coordinates?.[1] || 0;
    const dropLng = destination_location?.coordinates?.[0] || 0;

    let distanceKm = null;
    let durationText = null;
    let routePolyline = null;

    // Get route data from Google Maps API
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

    // Generate trip_id
    const lastRide = await TaxiSafariRide.findOne().sort({ trip_id: -1 });
    const trip_id = lastRide ? lastRide.trip_id + 1 : 1001;

    // Create new ride
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

    // Generate OTP
    newRide.generateOTP();

    await newRide.save();

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

    // Prevent updating certain fields
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

    // Check if ride can be updated based on status
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

    // If updating location coordinates, recalculate route
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

// Get All Rides with Filters
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

    return res.status(200).json({
      success: true,
      data: rides,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error("Get rides error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch rides",
      error: err.message,
    });
  }
};

// Get Ride By ID
exports.getRideTaxiById = async (req, res) => {
  try {
    const { id } = req.params;

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

    return res.status(200).json({
      success: true,
      data: ride,
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

// Delete Ride (Soft delete - mark as cancelled by system)
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

    // Only allow deletion of rides that haven't started
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

    // Check if ride can be cancelled
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

    // Calculate cancellation charge
    const cancellationCharge = ride.calculateCancellationCharge();

    ride.trip_status = `cancelled_by_${cancelled_by}`;
    ride.cancelled_at = new Date();
    ride.cancelled_by = cancelled_by;
    ride.cancellation_reason = cancellation_reason || "No reason provided";
    ride.cancellation_charge = cancellationCharge;
    ride.updatedBy = req.user?._id;

    // Update refund status if payment was made
    if (
      ride.payment_status === "captured" &&
      cancellationCharge < ride.paid_amount
    ) {
      ride.refund_amount = ride.paid_amount - cancellationCharge;
      ride.refund_status = "pending";
    }

    await ride.save();

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

    // Update trip status to started if OTP is verified
    if (ride.trip_status === "driver_arrived") {
      ride.trip_status = "trip_started";
      ride.trip_started_at = new Date();
    }

    await ride.save();

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

// Update Location of Ride (Driver's current location)
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

    // Only update location for active rides
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

// Admin Change Status Without Any Restriction
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

    // Set timestamps based on status
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

exports.FetchNearByTaxiSafarRides = async (req, res) => {
  try {
    console.log("taxi safar");
    const driverId = req.user?._id;

    // 1. Authentication Check
    if (!driverId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please log in.",
      });
    }

    // 2. Fetch Driver with necessary fields
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

    // 3. Validate Driver Location
    if (
      !driver.current_location ||
      !driver.current_location.coordinates ||
      driver.current_location.coordinates.length !== 2
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Your location is missing or outdated. Please update your location.",
      });
    }

    const [longitude, latitude] = driver.current_location.coordinates;

    if (isNaN(longitude) || isNaN(latitude)) {
      return res.status(400).json({
        success: false,
        message: "Invalid location coordinates.",
      });
    }

    // 4. Determine Search Radius & Vehicle Type
    const searchRadiusKm = driver.currentRadius || 5;
    const maxDistanceMeters = searchRadiusKm * 1000;
    const vehicleType = driver.current_vehicle_id?.vehicle_type || null;

    if (!vehicleType) {
      return res.status(400).json({
        success: false,
        message:
          "No vehicle assigned. Please select a vehicle to search rides.",
      });
    }

    console.log(`Searching rides for Driver: ${driver.driver_name}`);
    console.log(
      `Location: [${longitude}, ${latitude}] | Radius: ${searchRadiusKm}km | Vehicle: ${vehicleType}`
    );

    // 5. Geospatial + Filters Query (Single Efficient Query)
    const nearbyRides = await TaxiSafariRide.find({
      trip_status: "searching",
      vehicle_type: vehicleType,
      // Exclude rides possibly created by this driver (optional safety)
      created_by: { $ne: driverId },
      pickup_location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [longitude, latitude],
          },
          $maxDistance: maxDistanceMeters,
        },
      },
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .select(
        "-invoice_id -routePolyline -trip_id -user_id -contact -card -upi -bank -wallet -acquirer_data -all_details -refund_amount -refund_status"
      )
      .lean();

    const rideCount = nearbyRides.length;

    console.log(`Found ${rideCount} nearby ride(s) matching criteria.`);

    // 6. No rides found → Helpful debugging response
    if (rideCount === 0) {
      // Optional: Get counts for better debugging (only in dev or when needed)
      const [totalPending, matchingVehicleType] = await Promise.all([
        TaxiSafariRide.countDocuments({ trip_status: "searching" }),
        TaxiSafariRide.countDocuments({
          trip_status: "searching",
          vehicle_type: vehicleType,
        }),
      ]);

      return res.status(200).json({
        success: true,
        message: "No nearby rides available at the moment.",
        debug: {
          your_vehicle_type: vehicleType,
          total_searching_rides: totalPending,
          rides_matching_your_vehicle: matchingVehicleType,
          search_radius_km: searchRadiusKm,
          your_location: [longitude, latitude],
        },
        tips: [
          "Try increasing your search radius",
          "Wait for new ride requests",
          "Ensure your vehicle type matches customer needs",
          "Check if you're online and location is updated",
        ],
        data: [],
      });
    }

    // 7. Success Response
    return res.status(200).json({
      success: true,
      message: "Nearby rides fetched successfully.",
      count: rideCount,
      search_radius_km: searchRadiusKm,
      driver_location: [longitude, latitude],
      data: nearbyRides,
    });
  } catch (error) {
    console.error("Error in FetchNearByTaxiSafarRides:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch nearby rides.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

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
        message: "This ride has already been accepted by another driver. Please check for other available rides.",
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
      const newWallet = await Wallet.create([{
        driver: driver._id,
        balance: 0,
        lockAmounts: [],
      }], { session });

      driver.wallet = newWallet[0]._id;
      await driver.save({ session });
      
      throw {
        status: 403,
        success: false,
        message: "Your wallet is empty. Please add money to your wallet before accepting rides.",
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
        await sendNotification.sendNotification(
          driver.fcm_token,
          "Insufficient Balance",
          `Add ₹${requiredLockAmount - availableBalance} more to accept this ride`,
          { type: "low_balance" },
          "low_balance_alert"
        ).catch(err => console.error("FCM Error:", err));
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

    // Success notification (after commit, non-blocking)
    if (driver.fcm_token) {
     await sendNotification.sendNotification(
        driver.fcm_token,
        "Ride Accepted Successfully! 🎉",
        `Trip of ₹${rideAmount} accepted. ₹${requiredLockAmount} locked from wallet.`,
        { rideId, type: "ride_accepted" },
        "ride_accepted"
      ).catch(err => console.error("FCM Error:", err));
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
    if (error.name === 'MongoError' || error.name === 'MongoServerError') {
      return res.status(500).json({
        success: false,
        message: "Database error occurred. Please try again in a moment.",
      });
    }

    // Generic error
    return res.status(500).json({
      success: false,
      message: "Unable to accept ride at this moment. Please try again or contact support if the issue persists.",
    });
  } finally {
    await session.endSession();
  }
};