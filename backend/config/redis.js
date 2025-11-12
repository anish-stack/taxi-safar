const redis = require("redis");

// Create separate clients for publishing and subscribing
const publisher = redis.createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});
const subscriber = redis.createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

// Connection handlers
publisher.on("connect", () => console.log("✅ Redis Publisher connected"));
subscriber.on("connect", () => console.log("✅ Redis Subscriber connected"));
publisher.on("error", (err) => console.error("❌ Redis Publisher Error:", err));
subscriber.on("error", (err) => console.error("❌ Redis Subscriber Error:", err));

(async () => {
  try {
    await publisher.connect();
    await subscriber.connect();
  } catch (err) {
    console.error("❌ Redis connection failed:", err);
  }
})();

module.exports = { publisher, subscriber };
