// firebase-messaging.js
import messaging from '@react-native-firebase/messaging';
import notifee, { EventType } from '@notifee/react-native';


// Called when a message is received in the background or killed state
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('📩 Background message received:', remoteMessage);

  // Optional: display a notification using Notifee
  await notifee.displayNotification({
    title: remoteMessage.notification?.title || 'New Message',
    body: remoteMessage.notification?.body || '',
    android: {
      channelId: 'ride_come', // make sure this channel exists
      smallIcon: 'ic_launcher', // your drawable icon
    },
  });
});

notifee.onBackgroundEvent(async ({ type, detail }) => {
  console.log('🛠 Notifee background event:', type, detail);

  if (type === EventType.PRESS) {
    console.log('📲 User pressed the notification', detail.notification);
    // You can handle deep links or navigate to a specific screen here
    // For example, open ride details:
    // const rideId = detail.notification.data?.rideId;
    // navigateToRideScreen(rideId);
  } else if (type === EventType.DISMISSED) {
    console.log('❌ Notification dismissed', detail.notification);
  }
});
