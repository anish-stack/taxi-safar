import { requestUserPermission, createNotificationChannels, setupFCMListeners, getFCMToken } from './NotificationService';

let initialized = false;

export const initializeNotifications = async (token) => {
  console.log('🚀 Starting notification initialization...');
  if (initialized) return; 
  initialized = true;

  try {
    console.log('🔔 Initializing Notification Services...');

    await requestUserPermission();
    await createNotificationChannels();
    setupFCMListeners();

    const userToken = token || null; // or your auth token
    console.log('🔑 User token:', userToken);
    if (userToken) {
      await getFCMToken(userToken);
    } else {
      console.log("ℹ️ User not logged in — skipping FCM token upload");
    }

    console.log('✅ Notification setup complete');
  } catch (err) {
    console.log('❌ Notification setup failed:', err);
  }
};
