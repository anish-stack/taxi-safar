const { subscriber, publisher } = require("../config/redis");
const Driver = require("../models/driver/driver.model");
const haversine = require("haversine-distance");

exports.subscribeToLocations = async () => {
  try {
    await subscriber.subscribe("driver_location_channel", async (message) => {
      const data = JSON.parse(message);
      const { driverId, lat, lng, updatedAt } = data;

      if (!driverId || !lat || !lng) return;

      try {
        const redisKey = `driver:${driverId}`;
        const newLat = parseFloat(lat);
        const newLng = parseFloat(lng);

        // 1️⃣ Get last known location from Redis
        const lastData = await publisher.hGetAll(redisKey);
        let shouldUpdate = true;
        let distance = 0;

        if (lastData?.lat && lastData?.lng) {
          const oldPoint = {
            lat: parseFloat(lastData.lat),
            lon: parseFloat(lastData.lng),
          };
          const newPoint = { lat: newLat, lon: newLng };

          distance = haversine(oldPoint, newPoint); // meters

          if (distance < 100) {
            shouldUpdate = false;
            // console.log(`⏩ Skipped ${driverId} — moved only ${distance.toFixed(1)}m`);
          }
        }

        // 2️⃣ Update Redis with latest position
        await publisher.hSet(redisKey, {
          lat: newLat,
          lng: newLng,
          updatedAt: updatedAt || new Date().toISOString(),
        });

        // 3️⃣ Update MongoDB only if distance > 100m
        if (shouldUpdate) {
          await Driver.findByIdAndUpdate(driverId, {
            current_location: {
              type: "Point",
              coordinates: [newLng, newLat],
            },
            lastLocationUpdate: new Date(updatedAt || Date.now()),
          });

          console.log(`✅ Updated DB for ${driverId} (moved ${Math.round(distance)}m)`);
        }

      } catch (err) {
        console.error("❌ Error processing driver location:", err.message);
      }
    });

    console.log("✅ Subscribed to driver location updates (Redis)");

  } catch (error) {
    console.error("❌ Redis Subscription Error:", error);
  }
};
