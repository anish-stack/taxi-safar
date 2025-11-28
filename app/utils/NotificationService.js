import messaging from "@react-native-firebase/messaging";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { API_URL_APP } from "../constant/api";
import * as Application from "expo-application";

const FCM_TOKEN_KEY = "fcm_token";

/**
 * Configure Expo notification behavior
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Ask for permission to send notifications
 */
export const requestUserPermission = async () => {
  const settings = await Notifications.requestPermissionsAsync();
  const enabled =
    settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;

  if (enabled) {
    console.log("✅ Notifications permission granted");
  } else {
    console.log("❌ Notifications permission denied");
  }
};

/**
 * Get or generate FCM token
 */
export const getFCMToken = async (token) => {
  console.log("🔑 [getFCMToken] Called");

  try {
    // Try to get stored token
    let fcmToken = await AsyncStorage.getItem(FCM_TOKEN_KEY);

    // If not found, generate new
    if (!fcmToken) {
      console.log("⚙️ Generating new FCM token...");
      fcmToken = await messaging().getToken();

      if (fcmToken) {
        await AsyncStorage.setItem(FCM_TOKEN_KEY, fcmToken);
        console.log("✅ New FCM token generated and stored:", fcmToken);
      } else {
        console.log("❌ Failed to generate FCM token");
        return null;
      }
    } else {
      console.log("📦 Using stored FCM token:", fcmToken);
    }

    // ✅ Only call backend if auth token is provided
    if (token) {
      const deviceId = await Application.getAndroidId();
      const payload = {
        fcmToken,
        platform: Platform.OS,
        deviceId,
        timestamp: new Date().toISOString(),
      };

      try {
        const res = await axios.post(
          `${API_URL_APP}/api/v1/update-fcm`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        console.log("✅ FCM token synced with backend:", res.data);
      } catch (apiErr) {
        console.log("⚠️ Failed to sync FCM token with backend:", apiErr.response?.data || apiErr.message);
      }
    } else {
      console.log("ℹ️ No auth token provided — skipping backend sync.");
    }

    return fcmToken;
  } catch (err) {
    console.log("❌ Error getting/saving FCM token:", err);
    return null;
  }
};

/**
 * Create Android notification channels (Expo equivalent)
 */
export const createNotificationChannels = async () => {
  if (Platform.OS === "android") {
    const channels = [
      { id: "ride_request_channel", name: "Ride Requests" },
      { id: "ride_updates", name: "Ride Updates" },
      { id: "ride_cancel_channel", name: "Ride Cancellations" },
      { id: "payment_complete_channel", name: "Payments" },
      { id: "app_notification_channel", name: "Promotions" },
    ];

    for (const channel of channels) {
      await Notifications.setNotificationChannelAsync(channel.id, {
        name: channel.name,
        importance: Notifications.AndroidImportance.MAX,
        sound: "default",
        vibrationPattern: [250, 250, 500, 250],
        lightColor: "#00aaa9",
      });
    }
    console.log("✅ Expo notification channels created successfully");
  }
};

/**
 * Determine notification channel
 */
export const getChannelId = (remoteMessage) => {
  const title = remoteMessage.notification?.title || "";
  const body = remoteMessage.notification?.body || "";
  const content = `${title} ${body}`.toLowerCase();

  if (content.includes("cancel")) return "ride_cancel_channel";
  if (content.includes("decline")) return "ride_cancel_channel";
  if (content.includes("payment")) return "payment_complete_channel";
  if (content.includes("promotion")) return "app_notification_channel";
  if (content.includes("ride request")) return "ride_request_channel";
  return "ride_updates";
};

/**
 * Setup FCM listeners and show local notifications via Expo
 */
export const setupFCMListeners = async () => {
  console.log("🚀 FCM listener initialized");

  messaging().onMessage(async (remoteMessage) => {
    try {
      const channelId = getChannelId(remoteMessage);
      const title = remoteMessage.notification?.title || "New Notification";
      const body = remoteMessage.notification?.body || "";

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: "default",
        },
        trigger: null, // show immediately
        android: {
          channelId,
          priority: Notifications.AndroidNotificationPriority.MAX,
        },
      });

      console.log("✅ Displayed foreground notification:", title);
    } catch (err) {
      console.log("❌ Error handling FCM message:", err);
    }
  });

  messaging().onNotificationOpenedApp((remoteMessage) => {
    console.log("📲 App opened from background tap", remoteMessage);
  });

  messaging()
    .getInitialNotification()
    .then((remoteMessage) => {
      if (remoteMessage) {
        console.log("📲 App opened from quit state", remoteMessage);
      }
    });

  messaging().onTokenRefresh(async (newToken) => {
    console.log("🔄 FCM Token refreshed:", newToken);
    await AsyncStorage.setItem(FCM_TOKEN_KEY, newToken);
  });
};
