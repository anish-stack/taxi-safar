// services/PermissionService.js
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { Alert, Platform } from 'react-native';

export const requestAppPermissions = async () => {
  try {
    // ===== Notification Permission =====
    const { status: notifStatus } = await Notifications.requestPermissionsAsync();
    if (notifStatus !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please enable notifications for updates and alerts.'
      );
    }

    // ===== Foreground Location Permission =====
    const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
    if (locationStatus !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please enable location access to use this app properly.'
      );
      return;
    }

    // ===== Background Location Permission (Android only) =====
    if (Platform.OS === 'android') {
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus !== 'granted') {
        Alert.alert(
          'Background Location',
          'Please enable background location for continuous tracking.'
        );
      }
    }

    // ===== Test location retrieval =====
    const location = await Location.getCurrentPositionAsync({});
    console.log('📍 Current location:', location);

    console.log('✅ All permissions requested successfully');
  } catch (error) {
    console.error('Permission error:', error);
  }
};

export const getCurrentLocation = async () => {
  try {
    // Check permission
    const { status } = await Location.getForegroundPermissionsAsync();

    // Request permission if not granted
    if (status !== 'granted') {
      const req = await Location.requestForegroundPermissionsAsync();
      if (req.status !== 'granted') {
        Alert.alert("Location Required", "Please enable location to continue.");
        return null;
      }
    }

    // Get location
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    const coords = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy,
    };

    console.log("📍 Fetched Location:", coords);
    return coords;

  } catch (error) {
    console.error("❌ Error getting location:", error);
    return null;
  }
};
