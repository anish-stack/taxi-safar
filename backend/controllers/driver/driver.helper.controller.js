const { publisher } = require('../../config/redis');
const Driver = require('../../models/driver/driver.model');

exports.toggleStatus = async (req, res) => {
    try {
        const driverId = req.user?._id;
        const { status } = req.body;

        // ✅ Quick validation
        if (typeof status !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'Invalid status value (must be boolean)',
            });
        }

        if (!driverId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized access - driver not found in token',
            });
        }

        // ✅ Fast update (atomic, returns updated document)
        const updatedDriver = await Driver.findByIdAndUpdate(
            driverId,
            { is_online: status },
            { new: true, select: 'is_online updatedAt' }
        ).lean();

        if (!updatedDriver) {
            return res.status(404).json({
                success: false,
                message: 'Driver not found',
            });
        }

        // ✅ Send instant response
        return res.status(200).json({
            success: true,
            message: `Driver is now ${status ? 'online' : 'offline'}`,
            is_online: updatedDriver.is_online,

        });
    } catch (error) {
        console.error('❌ Toggle Status Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while toggling status',
            error: error.message,
        });
    }
};
exports.updateDriverLocation = async (req, res) => {
  try {
    const driverId = req.user?._id; // from JWT middleware
    if (!driverId) {
      return res.status(401).json({ success: false, message: "Unauthorized: Driver ID missing" });
    }


    const {
      latitude: lat,
      longitude: lng,
      accuracy,
      speed,
      timestamp,
      platform
    } = req.body;

    if (lat == null || lng == null) {
      return res.status(400).json({
        success: false,
        message: "Latitude and Longitude are required."
      });
    }

    const now = new Date();
    let dataSource = "redis"; // default (since Redis is always updated instantly)

    // 1️⃣ GeoJSON point
    const geoPoint = {
      type: "Point",
      coordinates: [parseFloat(lng), parseFloat(lat)]
    };

    // 2️⃣ Save latest position in Redis hash (fast lookup)
    await publisher.hSet(`driver:${driverId}`, {
      lat,
      lng,
      accuracy,
      speed,
      platform,
      updatedAt: now.toISOString()
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
        updatedAt: now
      })
    );

    // 4️⃣ Update MongoDB every 60 seconds (reduce DB writes)
    const driver = await Driver.findById(driverId).select("lastLocationUpdate");

    if (!driver?.lastLocationUpdate || now - driver.lastLocationUpdate > 60 * 1000) {
      await Driver.findByIdAndUpdate(driverId, {
        current_location: geoPoint,
        lastLocationUpdate: now
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
        source: dataSource // ✅ shows where txphe data was updated last
      }
    });

  } catch (error) {
    console.error("❌ Location update error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update driver location",
      error: error.message
    });
  }
};

exports.getDriverLocation = async (req, res) => {
  try {
    const driverId = req.params.id;

    // Try fetching from Redis first
    const location = await publisher.hGetAll(`driver:${driverId}`);

    if (location && location.lat && location.lng) {
      return res.json({
        success: true,
        source: "redis",
        data: {
          lat: parseFloat(location.lat),
          lng: parseFloat(location.lng),
          updatedAt: location.updatedAt,
        },
      });
    }

    // Fallback to MongoDB if Redis cache is missing
    const driver = await Driver.findById(driverId).select("current_location lastLocationUpdate");

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
        updatedAt: driver.lastLocationUpdate,
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
