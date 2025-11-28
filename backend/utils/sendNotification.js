require("dotenv").config(); // ✅ Ensure .env variables are loaded early
const admin = require("firebase-admin");




class FirebaseInitializationError extends Error {
  constructor(message) {
    super(message);
    this.name = "FirebaseInitializationError";
  }
}

class NotificationError extends Error {
  constructor(message, code) {
    super(message);
    this.name = "NotificationError";
    this.code = code;
  }
}

// ──────────────────────────────
// Logger Utility
// ──────────────────────────────
const logger = {
  info: (msg) => console.log(`ℹ️ ${msg}`),
  warn: (msg) => console.warn(`⚠️ ${msg}`),
  error: (msg) => console.error(`❌ ${msg}`),
  debug: (msg) => console.debug(`🐛 ${msg}`),
};

// ──────────────────────────────
// Firebase Initialization
// ──────────────────────────────
const initializeFirebase = () => {
  if (admin.apps.length > 0) {
    logger.info("Firebase already initialized");
    return admin;
  }

  // ✅ Required Firebase keys
  const requiredEnvVars = [
    "FIREBASE_PROJECT_ID",
    "FIREBASE_PRIVATE_KEY_ID",
    "FIREBASE_PRIVATE_KEY",
    "FIREBASE_CLIENT_ID",
    "FIREBASE_AUTH_URI",
    "FIREBASE_TOKEN_URI",
    "FIREBASE_AUTH_PROVIDER_CERT_URL",
    "FIREBASE_CERT_URL",
  ];
  //  ❌ 🚫 Missing Firebase environment variables: FIREBASE_CLIENT_EMAIL, FIREBASE_CERT_URL


  const missingVars = requiredEnvVars.filter((key) => !process.env[key]);
  if (missingVars.length > 0) {
    const missingList = missingVars.join(", ");
    logger.error(`🚫 Missing Firebase environment variables: ${missingList}`);
    throw new FirebaseInitializationError(
      `Missing Firebase env vars: ${missingList}`
    );
  }

  const privateKey = "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDTDYRWXHiaw0cK\nwFqclfOXYeYismP7MDFtXF82ylAX2ln8lab/QRY15HwBf/+qGng3VLj8cHxJWpwA\nOhklMXCuJdgIIXx4ReMq90Am9zOaTN6RXTJnyU3SkvF48iExOh6feYhWG/gFhDTZ\nJqLN4rT67Fcq4jaTq4tlmdG+TTywkoPx/SG6ZdbaRSNwyHybLFLNHm6jGRdgYyN/\nK4XWQNPL53Ou7Dw8iHJwu2WO3oum7q3g7ATRkuSMpYz6QaJ8Njg/jyfBOFlNBfQo\n+MeaH0wwxF1zPX2H7j22vfP10Gy9PuaZrcJpJcGyR4l47ekGgBG+wCphEGhWB0Wq\np+mYmiDXAgMBAAECggEAF6zOKes+SDYcU7Ns4WCHg8rNSG/J0Wqq5haqQ6OBmpC5\nmXZRgRQUYWqbvTCrmwb/HKMvYSSz0dK36eVFNCvjSlXKccG34by36qDzxwCMqa7H\nz3dXPoHmw0wNNGu3l3sVO6nOxmy6xND7e1nfLMiqqUnhJAQI6psgDFSrTPVYbSy+\nK+m+jlw7Hm3MfikGG7hHygpkKoagsy2EHY8BQ86ZGpP7sFGXI9tvcpOzgvWTUO5E\nBhs+7Yvk8Vlyhg95LPrNeym9W95EAP425Z3X8SZlqi5SnGL5SwnYeiPuLIj/0+5Q\nmr+iipEu8P8L1ZGpazi+kuE8uuyvJfV4pjha1eCUOQKBgQDzIfG17LknqWVl/slo\n6fvZOTQ2xyF1YC5CyQ+FiW9iOjXGw7YO3maAJjzZsyk6MSP7GWLIgjOUsnqxJUFb\nWyyXWAUsgfVSydl4ExM+9UdnKKPBX0vO+qxHkRSG1Ixt6Oyro8yXWeBghFSI+pDc\nYbIUWMgqNk1GkZcxdWHWXo5akwKBgQDeOPFwa2QWQLWSwUGun9KliQVcTyd4bhjt\nvmqB/thCn3UTaan3vN/7n3R02koFnJkdBSZrypQwhvDWiHNkKp1K8Q+ZP5OhnMKn\nG7WWbAxjt6dyplmx3v3jwvZEf+fm1uSgcPeVYDrwQclfTd+5rbOo7uJMAPkUjxqL\n4/zC3GsXLQKBgQChdNwv5Lj8Vqiod+9GhYOiuDMtYUWdzbZK0XxGQINAJsnJafQ/\noX9OAJaON0TciP+M40nPP2+DgpaphsUFJuHQyzn8WX0RckvBSmGQgI/fOISuiFsu\nYxb/G6AW/ZUX9AMe5FKb+6peTeJZaJPEVfhNPLwIFDFy+IH/7SSAmCBOkwKBgGjz\nq9PUZGi+FwNAkqzOfsX/eLCoEZQnK07dZ6ANpEWS2dBZTxTZ9073eCDYF62e0BGM\npSCzhFmG4afwuc7M8Yy7XQqbpDXnu2cBBzoLva46xrK3LhV7o502LukbH4M+aqv7\nrnK2CCAAcgK43Ljs+LUIXYhXzUuQapE3E+FUCJ/hAoGAR92Y0i+8nvySNSjDTC1G\nGb/EAZc11ccYcWuxLUpv/kzZfzdYix6pPVA+3LvMIu6fL3d53OUM7UFO9SAA2+Mb\nWFoASbkLc76n5mDKA1YzhjcXA9D1lNLjW9LyagOi/fHvAbzsK8RC9jSx8ttt7N8A\neyHR7ILbs4l1fpPT03uRUBQ=\n-----END PRIVATE KEY-----\n"
  try {

    if (privateKey && privateKey.includes("\\n")) {
      console.log("🔧 Fixing escaped newlines (\\n) in private key...");
      privateKey = privateKey.replace(/\\n/g, "\n");
    }

    // 🔐 Validate private key format
    if (!privateKey.includes("BEGIN PRIVATE KEY") || !privateKey.includes("END PRIVATE KEY")) {
      console.error("❌ Invalid PEM key format in privateKey!");
      throw new FirebaseInitializationError("Invalid PEM formatted message in private_key");
    }
    const credentialConfig = {
      type: process.env.FIREBASE_TYPE || "service_account",
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: privateKey,
      client_email: process.env.FIREBASE_CLIENT_EMAIL || "firebase-adminsdk-fbsvc@olyox-6215a.iam.gserviceaccount.com",
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: process.env.FIREBASE_AUTH_URI,
      token_uri: process.env.FIREBASE_TOKEN_URI,
      auth_provider_x509_cert_url:
        process.env.FIREBASE_AUTH_PROVIDER_CERT_URL,
      client_x509_cert_url: process.env.FIREBASE_CERT_URL,
    };

    admin.initializeApp({
      credential: admin.credential.cert(credentialConfig),
      databaseURL: process.env.FIREBASE_DATABASE_URL || "",
    });

    logger.info("✅ Firebase Admin SDK initialized successfully");
    return admin;
  } catch (error) {
    if (error.message.includes("invalid_grant")) {
      console.error("⚠️ HINT: Check server time (NTP sync) and service account validity.");
      console.log("🕒 Current Server Time:", new Date().toISOString());
    }

    logger.error(`🔥 Firebase Initialization Failed: ${error.message}`);
    throw new FirebaseInitializationError(error.message);
  }
};

// ──────────────────────────────
// Send Notification
// ──────────────────────────────
const sendNotification = async (token, title, body, eventData = null, channel) => {
  console.log("✅ Notification Channel:", channel);
  initializeFirebase();

  try {
    if (!token) {
      logger.error("❌ No FCM token provided");
      throw new NotificationError("No FCM token provided", "INVALID_TOKEN");
    }

    const message = {
      token,
      notification: {
        title: title || "New Ride",
        body: body || "You have a new notification",
      },
      android: {
        priority: "high",
        notification: {
          channelId: channel || "ride_channel",
          clickAction: "ACCEPT_RIDE_ACTION",
          imageUrl:
            "https://taxisafar.com/images/logo/taxisafar-logo.png",
        },
      },
    };

    // Add custom data payload if present
    if (eventData && Object.keys(eventData).length > 0) {
      const rideDetails = eventData.rideDetails || {};
      const pickup = rideDetails.pickup || {};
      const drop = rideDetails.drop || {};
      const pricing = rideDetails.pricing || {};

      message.data = {
        event: String(eventData.event || "DEFAULT_EVENT"),
        distance: String(rideDetails.distance || ""),
        distance_from_pickup_km: String(rideDetails.distance_from_pickup_km || ""),
        vehicleType: String(rideDetails.vehicleType || ""),
        rideId: String(rideDetails.rideId || ""),
        isRental: String(rideDetails.isRental || false),
        rentalHours: String(rideDetails.rentalHours || 0),
        rental_km_limit: String(rideDetails.rental_km_limit || 0),
        pickup: String(pickup.formatted_address || ""),
        drop: String(drop.formatted_address || ""),
        price: String(pricing.total_fare || ""),
      };
    }

    const response = await admin.messaging().send(message);
    logger.info(`✅ Notification sent successfully to token: ${token}`);
    return response;

  } catch (error) {
    logger.error(`❌ Notification Error: ${error.message}`);

    // ✅ Handle invalid or unregistered tokens
    if (error.errorInfo && error.errorInfo.code === "messaging/registration-token-not-registered") {
      logger.warn(`⚠️ Token invalid or app uninstalled — cleaning up: ${token}`);

      // Check if it belongs to a user
      const user = await User.findOne({ fcmToken: token });
      if (user) {
        user.appDeleted = true;
        user.fcmToken = null;
        await user.save();
        logger.info(`🧹 Cleaned invalid token for user: ${user._id}`);
      }

      // Check if it belongs to a rider
      const rider = await Rider.findOne({ fcmToken: token });
      if (rider) {
        rider.appDeleted = true;
        rider.fcmToken = null;
        await rider.save();
        logger.info(`🧹 Cleaned invalid token for rider: ${rider._id}`);
      }
    }

    if (error instanceof NotificationError) return null;
    return null;
  }
};
// ──────────────────────────────
// Test Hook (optional)
// ──────────────────────────────
if (require.main === module) {
  const testToken = process.env.TEST_FCM_TOKEN;
  if (testToken) {
    sendNotification(testToken, "Test Notification", "This is a test message")
      .then(() => logger.info("Test notification completed"))
      .catch(logger.error);
  } else {
    logger.warn("⚠️ TEST_FCM_TOKEN not found in .env file");
  }
}

module.exports = {
  initializeFirebase,
  sendNotification,
};
