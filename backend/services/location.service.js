const { publisher } = require("../config/redis");

exports.publishLocation = async (driverId, location) => {
  try {
    const channel = `driver_location_channel`;
    const message = JSON.stringify({
      driverId,
      location,
      updatedAt: new Date().toISOString(),
    });

    // Publish to Redis channel
    await publisher.publish(channel, message);
    console.log("📡 Location Published:", message);
  } catch (error) {
    console.error("❌ Redis Publish Error:", error);
  }
};

exports.getDriverLocation = async (req, res) => {
  try {
    const driverId = req.params.driverId;

    if (!driverId) {
      return res.status(400).json({
        success: false,
        message: "Driver ID is required",
      });
    }

    // Fetch from Redis
    const data = await redisClient.get(`driver_location:${driverId}`);

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "No location found for this driver",
      });
    }

    return res.status(200).json({
      success: true,
      location: JSON.parse(data),
    });
  } catch (error) {
    console.error("❌ Get Driver Location Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching location",
    });
  }
};
