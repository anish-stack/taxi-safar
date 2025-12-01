import { create } from 'zustand';
import axios from 'axios';
import { getData } from '../utils/storage';
import { API_URL_APP } from '../constant/api';
import loginStore from './auth.store';

// Configuration
const CONFIG = {
  LOCATION_UPDATE_INTERVAL: 10000, // 10 seconds
  AUTO_FETCH_DELAY: 100, // Initial fetch delay
};

// Location update interval reference (global scope)
let locationUpdateInterval = null;

const useDriverStore = create((set, get) => ({
  // State
  driver: null,
  loading: false,
  error: null,
  is_online: false,
  on_ride: null,
  toggleStatus: false,
  location: null,
  currentRadius: null,
  locationUpdateEnabled: false,
  lastLocationUpdate: null,

  /**
   * Fetch driver details
   */
  fetchDriverDetails: async (navigation) => {
    try {
      set({ loading: true, error: null });
      const token = loginStore.getState().token;
      if (!token) {
        console.warn('⚠️ No token found for fetchDriverDetails');
        set({ loading: false, error: 'No token found' });
        return;
      }

      const res = await axios.get(`${API_URL_APP}/api/v1/driver-details`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const driverData = res.data.data || res.data;

      set({
        driver: driverData,
        is_online: res.data?.is_online ?? false,
        on_ride: res.data?.is_OnRide ?? null,
        location: res.data.location,
        currentRadius: res.data.currentRadius,
        loading: false,
        error: null,
      });

      
      // Auto-start location updates if online
      if (res.data?.is_online) {
        get().startLocationUpdates();
      }

      return driverData;
    } catch (error) {
      console.error('❌ Fetch driver error:', error.response?.status, error.message);

      // Handle 401 - Token expired
      if (error.response?.status === 401) {
        console.log('⚠️ Token expired — logging out...');
        const { logout } = loginStore.getState();
        logout();
        
        if (navigation) {
          navigation.navigate('splash');
        }
      }

      set({
        error: error.response?.data?.message || 'Failed to fetch driver details',
        loading: false,
      });

      return null;
    }
  },

  /**
   * Toggle driver online/offline status
   */
  toggle: async (status, navigation) => {
    try {
      set({ loading: true, error: null });
      const token = loginStore.getState().token;

      if (!token) {
        console.warn('⚠️ No token found for toggle');
        set({ loading: false, error: 'No token found' });
        return;
      }

      const res = await axios.post(
        `${API_URL_APP}/api/v1/toggle-status`,
        { status },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const newOnlineStatus = res.data?.data?.is_online ?? status;

      set({
        is_online: newOnlineStatus,
        loading: false,
        error: null,
      });

      console.log(`✅ Driver status toggled: ${newOnlineStatus ? 'ONLINE' : 'OFFLINE'}`);

      // Start/stop location updates based on status
      if (newOnlineStatus) {
        get().startLocationUpdates();
      } else {
        get().stopLocationUpdates();
      }

      return newOnlineStatus;
    } catch (error) {
      console.error('❌ Toggle driver error:', error.response?.status, error.message);

      // Handle 401 - Token expired
      if (error.response?.status === 401) {
        console.log('⚠️ Token expired — logging out...');
        const { logout } = loginStore.getState();
        logout();
        
        if (navigation) {
          navigation.navigate('splash');
        }
      }

      set({
        error: error.response?.data?.message || 'Failed to toggle driver status',
        loading: false,
      });

      return null;
    }
  },

  /**
   * Update driver radius area
   */
  IncreaseRadiusArea: async (radius, Alert) => {
    set({ loading: true, error: null });
    const token = loginStore.getState().token;

    if (!token) {
      console.warn('⚠️ No token found for radius update');
      set({ loading: false, error: 'No token found' });
      return;
    }

    try {
      const response = await axios.put(
        `${API_URL_APP}/api/v1/update-radius`,
        { radius },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        if (Alert) {
          Alert.alert('Radius Updated', response.data.message);
        }
        
        set({
          currentRadius: response.data.currentRadius || radius,
          loading: false,
          error: null,
        });

        console.log(`✅ Radius updated to: ${radius}km`);
        return response.data.currentRadius || radius;
      } else {
        set({
          currentRadius: get().currentRadius || 5,
          loading: false,
        });
        return null;
      }
    } catch (error) {
      console.error('❌ Error updating radius:', error.response?.status, error.message);
      
      set({
        loading: false,
        error: error.response?.data?.message || 'Failed to update radius.',
      });
      
      return null;
    }
  },

  
  /**
   * Fetch current driver location from backend
   */
  updateLocation: async () => {
    try {
      const token = loginStore.getState().token;

      if (!token) {
        console.warn('⚠️ No token found for location update');
        return null;
      }

      const response = await axios.get(
        `${API_URL_APP}/api/v1/get-driver-location`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success && response.data.data) {
        const locationData = {
          lat: response.data.data.lat,
          lng: response.data.data.lng,
          updatedAt_utc: response.data.data.updatedAt_utc,
          updatedAt_ist: response.data.data.updatedAt_ist,
          source: response.data.source, // 'redis' or 'database'
        };

        set({
          location: locationData,
          lastLocationUpdate: new Date(),
          error: null,
        });

        // console.log(`📍 Location updated: (${locationData.lat}, ${locationData.lng}) [${locationData.source}]`);
        
        return locationData;
      }

      return null;
    } catch (error) {
      console.error('❌ Error updating location:', error.response?.status, error.message);
      
      // Don't set error for location updates to avoid UI disruption
      // Just log it
      if (error.response?.status === 401) {
        console.log('⚠️ Token expired during location update');
        get().stopLocationUpdates();
      }
      
      return null;
    }
  },

  /**
   * Start automatic location updates every 10 seconds
   */
  startLocationUpdates: () => {
    const state = get();

    // Don't start if already running
    if (state.locationUpdateEnabled && locationUpdateInterval) {
      return;
    }

    console.log('📍 Starting automatic location updates (every 10 seconds)');

    // Clear any existing interval
    if (locationUpdateInterval) {
      clearInterval(locationUpdateInterval);
    }

    // Fetch location immediately
    get().updateLocation();

    // Set up interval for automatic updates
    locationUpdateInterval = setInterval(() => {
      const currentState = get();
      
      // Only update if driver is online
      if (currentState.is_online) {
        get().updateLocation();
      } else {
        console.log('📍 Driver offline, skipping location update');
      }
    }, CONFIG.LOCATION_UPDATE_INTERVAL);

    set({ locationUpdateEnabled: true });
    console.log('✅ Location updates started');
  },

  /**
   * Stop automatic location updates
   */
  stopLocationUpdates: () => {
    console.log('📍 Stopping automatic location updates');

    if (locationUpdateInterval) {
      clearInterval(locationUpdateInterval);
      locationUpdateInterval = null;
    }

    set({ locationUpdateEnabled: false });
    console.log('✅ Location updates stopped');
  },

  /**
   * Manual location refresh (can be called from UI)
   */
  refreshLocation: async () => {
    return await get().updateLocation();
  },

  /**
   * Reset store state (useful for logout)
   */
  resetStore: () => {
    console.log('🔄 Resetting driver store');
    
    // Stop location updates
    get().stopLocationUpdates();

    // Reset state
    set({
      driver: null,
      loading: false,
      error: null,
      is_online: false,
      on_ride: null,
      toggleStatus: false,
      location: null,
      currentRadius: null,
      locationUpdateEnabled: false,
      lastLocationUpdate: null,
    });
  },

  /**
   * Get location update status
   */
  getLocationUpdateStatus: () => {
    const state = get();
    return {
      enabled: state.locationUpdateEnabled,
      lastUpdate: state.lastLocationUpdate,
      location: state.location,
      isOnline: state.is_online,
    };
  },
}));

/**
 * Auto-initialization when store is created
 * Fetches driver details if token exists
 */
(async () => {
  try {
    const token = await getData('auth_token');
    
    if (token) {
      console.log('🔑 Token found, auto-fetching driver details...');
      
      setTimeout(() => {
        useDriverStore.getState().fetchDriverDetails();
      }, CONFIG.AUTO_FETCH_DELAY);
    } else {
      console.log('⚠️ No token found during initialization');
    }
  } catch (error) {
    console.error('❌ Error during store initialization:', error);
  }
})();

/**
 * Cleanup function for when app unmounts or module reloads
 */
if (module.hot) {
  module.hot.dispose(() => {
    console.log('🧹 Cleaning up driver store');
    useDriverStore.getState().stopLocationUpdates();
  });
}

export default useDriverStore;