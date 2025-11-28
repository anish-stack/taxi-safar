import { NativeModules, Platform, PermissionsAndroid } from 'react-native';

const { LocationUpdateModule } = NativeModules;

class LocationService {
  constructor() {
    this.isTracking = false;
    this.apiUrl = null;
    this.token = null;
  }

  /**
   * Request location permissions for Android
   * @returns {Promise<boolean>} - Returns true if permissions granted
   */
  async requestLocationPermissions() {
    try {
      if (Platform.OS !== 'android') {
        return true;
      }

      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
      ]);

      const fineLocationGranted = 
        granted['android.permission.ACCESS_FINE_LOCATION'] === 
        PermissionsAndroid.RESULTS.GRANTED;
      
      const coarseLocationGranted = 
        granted['android.permission.ACCESS_COARSE_LOCATION'] === 
        PermissionsAndroid.RESULTS.GRANTED;

      return fineLocationGranted && coarseLocationGranted;
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      return false;
    }
  }

  /**
   * Request background location permission (Android 10+)
   * @returns {Promise<boolean>}
   */
  async requestBackgroundLocationPermission() {
    try {
      if (Platform.OS !== 'android') {
        return true;
      }

      if (Platform.Version >= 29) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
          {
            title: 'Background Location Permission',
            message: 'This app needs background location access to track your location when the app is closed or not in use.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );

        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }

      return true; // Not needed for Android < 10
    } catch (error) {
      console.error('Error requesting background location permission:', error);
      return false;
    }
  }

  /**
   * Check if location permissions are granted
   * @returns {Promise<boolean>}
   */
  async checkLocationPermissions() {
    try {
      if (Platform.OS !== 'android') {
        return true;
      }

      const fineLocation = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      
      const coarseLocation = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION
      );

      return fineLocation && coarseLocation;
    } catch (error) {
      console.error('Error checking location permissions:', error);
      return false;
    }
  }

  /**
   * Start location tracking service
   * @param {string} apiUrl - Your API endpoint URL
   * @param {string} token - Authorization token
   * @returns {Promise<boolean>} - Returns true if service started successfully
   */
  async startTracking(apiUrl, token) {
    try {
      if (Platform.OS !== 'android') {
        console.warn('Location tracking is only available on Android');
        return false;
      }

      // Validate inputs
      if (!apiUrl || typeof apiUrl !== 'string' || apiUrl.trim() === '') {
        throw new Error('Valid API URL is required');
      }

      if (!token || typeof token !== 'string' || token.trim() === '') {
        throw new Error('Valid token is required');
      }

      // Check permissions
      const hasPermissions = await this.checkLocationPermissions();
      if (!hasPermissions) {
        const granted = await this.requestLocationPermissions();
        if (!granted) {
          throw new Error('Location permissions not granted');
        }
      }

      // Request background location permission if needed
      if (Platform.Version >= 29) {
        await this.requestBackgroundLocationPermission();
      }

      // Store configuration
      this.apiUrl = apiUrl.trim();
      this.token = token.trim();

      // Start the service
      const result = await LocationUpdateModule.startLocationUpdates(
        this.apiUrl,
        this.token
      );

      if (result) {
        this.isTracking = true;
        console.log('✅ Location tracking started successfully',result);
        console.log('📍 API URL:', this.apiUrl);
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ Failed to start location tracking:', error.message);
      this.isTracking = false;
      // throw error;
    }
  }

  /**
   * Stop location tracking service
   * @returns {Promise<boolean>}
   */
  async stopTracking() {
    try {
      if (Platform.OS !== 'android') {
        console.warn('Location tracking is only available on Android');
        return false;
      }

      const result = await LocationUpdateModule.stopLocationUpdates();

      if (result) {
        this.isTracking = false;
        this.apiUrl = null;
        this.token = null;
        console.log('✅ Location tracking stopped successfully');
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ Failed to stop location tracking:', error.message);
      throw error;
    }
  }

  /**
   * Check if location service is currently running
   * @returns {Promise<boolean>}
   */
  async isRunning() {
    try {
      if (Platform.OS !== 'android') {
        return false;
      }

      const result = await LocationUpdateModule.isServiceRunning();
      this.isTracking = result;
      return result;
    } catch (error) {
      console.error('❌ Failed to check service status:', error.message);
      return false;
    }
  }

  /**
   * Request battery optimization exemption
   * This allows the service to run in the background without being killed
   * @returns {Promise<boolean>} - Returns true if already optimized
   */
  async requestBatteryOptimization() {
    try {
      if (Platform.OS !== 'android') {
        return true;
      }

      const result = await LocationUpdateModule.requestBatteryOptimization();
      
      if (result) {
        console.log('✅ Battery optimization already disabled');
      } else {
        console.log('⚙️ Battery optimization settings opened');
      }

      return result;
    } catch (error) {
      console.error('❌ Failed to request battery optimization:', error.message);
      throw error;
    }
  }

  /**
   * Check if battery optimization is disabled for the app
   * @returns {Promise<boolean>}
   */
  async isBatteryOptimizationDisabled() {
    try {
      if (Platform.OS !== 'android') {
        return true;
      }

      const result = await LocationUpdateModule.isBatteryOptimizationDisabled();
      return result;
    } catch (error) {
      console.error('❌ Failed to check battery optimization status:', error.message);
      return false;
    }
  }

  /**
   * Get current tracking status
   * @returns {boolean}
   */
  getTrackingStatus() {
    return this.isTracking;
  }

  /**
   * Get current API URL
   * @returns {string|null}
   */
  getApiUrl() {
    return this.apiUrl;
  }

  /**
   * Complete setup for location tracking
   * This is a convenience method that handles all setup steps
   * @param {string} apiUrl - Your API endpoint URL
   * @param {string} token - Authorization token
   * @returns {Promise<object>} - Returns status object
   */
  async completeSetup(apiUrl, token) {
    try {
      const result = {
        success: false,
        permissions: false,
        backgroundPermission: false,
        batteryOptimization: false,
        serviceStarted: false,
        message: '',
      };

      // Step 1: Check and request location permissions
      console.log('📍 Step 1: Checking location permissions...');
      const hasPermissions = await this.checkLocationPermissions();
      
      if (!hasPermissions) {
        const granted = await this.requestLocationPermissions();
        if (!granted) {
          result.message = 'Location permissions denied';
          return result;
        }
      }
      
      result.permissions = true;
      console.log('✅ Location permissions granted');

      // Step 2: Request background location (Android 10+)
      if (Platform.Version >= 29) {
        console.log('📍 Step 2: Requesting background location permission...');
        const backgroundGranted = await this.requestBackgroundLocationPermission();
        result.backgroundPermission = backgroundGranted;
        
        if (backgroundGranted) {
          console.log('✅ Background location permission granted');
        } else {
          console.log('⚠️ Background location permission denied (service may not work properly)');
        }
      } else {
        result.backgroundPermission = true;
      }

      // Step 3: Check battery optimization
      console.log('🔋 Step 3: Checking battery optimization...');
      const batteryOptimized = await this.isBatteryOptimizationDisabled();
      result.batteryOptimization = batteryOptimized;
      
      if (!batteryOptimized) {
        console.log('⚠️ Battery optimization is enabled. Requesting to disable...');
        await this.requestBatteryOptimization();
      } else {
        console.log('✅ Battery optimization is disabled');
      }

      // Step 4: Start location tracking
      console.log('🚀 Step 4: Starting location tracking service...');
      const serviceStarted = await this.startTracking(apiUrl, token);
      result.serviceStarted = serviceStarted;

      if (serviceStarted) {
        result.success = true;
        result.message = 'Location tracking setup completed successfully';
        console.log('✅ Setup completed successfully!');
      } else {
        result.message = 'Failed to start location tracking service';
        console.log('❌ Failed to start service');
      }

      return result;
    } catch (error) {
      console.error('❌ Setup failed:', error.message);
      return {
        success: false,
        permissions: false,
        backgroundPermission: false,
        batteryOptimization: false,
        serviceStarted: false,
        message: error.message,
      };
    }
  }
}

// Export singleton instance
const locationService = new LocationService();
export default locationService;
