// services/PermissionService.js
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { Alert, Platform } from 'react-native';

/**
 * Request all app permissions
 * @returns {Promise<boolean>} - Returns true if ALL permissions granted
 */
export const requestAppPermissions = async () => {
  try {
    let allGranted = true;

    // ===== Notification Permission =====
    console.log('🔔 Requesting notification permission...');
    const { status: notifStatus } = await Notifications.requestPermissionsAsync();
    
    if (notifStatus !== 'granted') {
      console.warn('⚠️ Notification permission denied');
      Alert.alert(
        'Notification Permission Required',
        'Please enable notifications to receive ride updates and alerts.',
        [{ text: 'OK' }]
      );
      allGranted = false;
    } else {
      console.log('✅ Notification permission granted');
    }

    // ===== Foreground Location Permission =====
    console.log('📍 Requesting foreground location permission...');
    const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
    
    if (locationStatus !== 'granted') {
      console.warn('⚠️ Foreground location permission denied');
      Alert.alert(
        'Location Permission Required',
        'Please enable location access to use this app properly. This is required for ride tracking.',
        [{ text: 'OK' }]
      );
      allGranted = false;
    } else {
      console.log('✅ Foreground location permission granted');
    }

    // ===== Background Location Permission (Android only) =====
    if (Platform.OS === 'android') {
      console.log('📍 Requesting background location permission...');
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      
      if (backgroundStatus !== 'granted') {
        console.warn('⚠️ Background location permission denied');
        Alert.alert(
          'Background Location Required',
          'Please enable "Allow all the time" location access for continuous ride tracking even when the app is closed.',
          [{ text: 'OK' }]
        );
        // Don't set allGranted to false - background location is important but not critical
        console.log('⚠️ Background location denied, but continuing...');
      } else {
        console.log('✅ Background location permission granted');
      }
    }

    // ===== Test location retrieval =====
    if (locationStatus === 'granted') {
      try {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        console.log('📍 Test location retrieved:', {
          lat: location.coords.latitude,
          lng: location.coords.longitude,
        });
      } catch (error) {
        console.error('❌ Error testing location:', error);
      }
    }

    if (allGranted) {
      console.log('✅ All critical permissions granted successfully');
    } else {
      console.warn('⚠️ Some critical permissions were denied');
    }

    return allGranted;

  } catch (error) {
    console.error('❌ Permission error:', error);
    return false;
  }
};

/**
 * Check if all critical permissions are granted
 * @returns {Promise<boolean>}
 */
export const checkAppPermissions = async () => {
  try {
    // Check notification permission
    const notifStatus = await Notifications.getPermissionsAsync();
    
    // Check location permissions
    const locationStatus = await Location.getForegroundPermissionsAsync();
    
    const allGranted = 
      notifStatus.status === 'granted' && 
      locationStatus.status === 'granted';
    
    console.log('🔍 Permission status:', {
      notifications: notifStatus.status,
      location: locationStatus.status,
      allGranted,
    });

    return allGranted;
  } catch (error) {
    console.error('❌ Error checking permissions:', error);
    return false;
  }
};

/**
 * Get current location with proper error handling
 * @returns {Promise<Object|null>}
 */
export const getCurrentLocation = async () => {
  try {
    // Check permission
    const { status } = await Location.getForegroundPermissionsAsync();

    // Request permission if not granted
    if (status !== 'granted') {
      const req = await Location.requestForegroundPermissionsAsync();
      if (req.status !== 'granted') {
        Alert.alert(
          "Location Required", 
          "Please enable location to continue.",
          [{ text: 'OK' }]
        );
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

    console.log("📍 Current location:", coords);
    return coords;

  } catch (error) {
    console.error("❌ Error getting location:", error);
    Alert.alert(
      "Location Error",
      "Unable to get your current location. Please check your location settings.",
      [{ text: 'OK' }]
    );
    return null;
  }
};