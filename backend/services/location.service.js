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
