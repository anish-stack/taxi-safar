import { useEffect, useRef, useState } from 'react';
import { Platform, AppState, NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL_APP } from '../constant/api';
import { FloatingWidgetService, RidePoolingModule } from '../services/NativeModules';

const { SharedPreferences } = NativeModules;

export const useDriverServices = ({
  driverId,
  token,
  isDriverOnline = false,
  enableFloatingWidget = true,
}) => {
  const [isPoolingActive, setIsPoolingActive] = useState(false);
  const [isWidgetActive, setIsWidgetActive] = useState(false);
  const [hasOverlayPermission, setHasOverlayPermission] = useState(false);
  const appStateRef = useRef(AppState.currentState);

  // Save driver online state to native storage for persistence
  const saveDriverOnlineState = async (isOnline) => {
    try {
      // Save to AsyncStorage
      await AsyncStorage.setItem('driver_online', JSON.stringify(isOnline));
      
      // Save to native SharedPreferences for boot receiver
      if (Platform.OS === 'android' && SharedPreferences) {
        SharedPreferences.setBoolean('driver_online', isOnline);
      }
    } catch (error) {
      console.error('Error saving driver state:', error);
    }
  };

  const controlPoolingService = async (start) => {
    if (!driverId || !token) {
      console.log('Missing driverId or token');
      if (!start) setIsPoolingActive(false);
      return true;
    }

    try {
      console.log(start ? 'Starting pooling service...' : 'Stopping pooling service...');
      
      if (RidePoolingModule?.controlPoolingService) {
        await RidePoolingModule.controlPoolingService(start, driverId, token, API_URL_APP);
        setIsPoolingActive(start);
        console.log(start ? 'Pooling service started' : 'Pooling service stopped');
        return true;
      } else {
        console.warn('controlPoolingService method not found on RideModule');
        return false;
      }
    } catch (e) {
      console.error('Pooling service error:', e);
      return false;
    }
  };

  const checkOverlayPermission = async () => {
    if (Platform.OS !== 'android') return true;
    
    try {
      const hasPerm = await FloatingWidgetService.hasOverlayPermission();
      setHasOverlayPermission(hasPerm);
      return hasPerm;
    } catch (e) {
      console.error('Overlay permission check failed:', e);
      return false;
    }
  };

  const requestOverlayPermission = async () => {
    if (Platform.OS !== 'android') return;
    
    try {
      await FloatingWidgetService.requestOverlayPermission();
      setTimeout(checkOverlayPermission, 1200);
    } catch (e) {
      console.error('Request overlay permission failed:', e);
    }
  };

  const startFloatingWidget = async () => {
    if (Platform.OS !== 'android') return false;
    
    const hasPerm = await checkOverlayPermission();
    if (!hasPerm) {
      console.log('No overlay permission');
      return false;
    }

    try {
      console.log('Starting floating widget...');
      await FloatingWidgetService.showFloatingIcon();
      setIsWidgetActive(true);
      console.log('Floating widget started');
      return true;
    } catch (e) {
      console.error('Start floating widget failed:', e);
      return false;
    }
  };

  const stopFloatingWidget = async () => {
    if (Platform.OS !== 'android') return false;
    
    try {
      console.log('Stopping floating widget...');
      await FloatingWidgetService.hideFloatingIcon();
      setIsWidgetActive(false);
      console.log('Floating widget stopped');
      return true;
    } catch (e) {
      console.error('Stop floating widget failed:', e);
      return false;
    }
  };

  const checkServiceStatus = async () => {
    try {
      if (RidePoolingModule?.isPoolingServiceRunning) {
        const pooling = await RidePoolingModule.isPoolingServiceRunning();
        setIsPoolingActive(pooling);
      }

      if (Platform.OS === 'android' && FloatingWidgetService?.isFloatingIconVisible) {
        const widget = await FloatingWidgetService.isFloatingIconVisible();
        setIsWidgetActive(widget);
      }
    } catch (e) {
      console.error('Check service status failed:', e);
    }
  };

  const handleAppStateChange = (nextState) => {
    if (appStateRef.current.match(/inactive|background/) && nextState === 'active') {
      console.log('App to foreground - checking services');
      checkServiceStatus();
      
      // Restart services if they died while app was in background
      if (isDriverOnline) {
        setTimeout(() => {
          controlPoolingService(true);
          if (enableFloatingWidget) startFloatingWidget();
        }, 500);
      }
    }
    appStateRef.current = nextState;
  };

  // Effect: Start/stop services based on driver online status
  useEffect(() => {
    // Save online state for persistence
    saveDriverOnlineState(isDriverOnline);

    if (isDriverOnline && driverId && token) {
      console.log('Driver online - starting services');
      controlPoolingService(true);
      
      if (enableFloatingWidget && Platform.OS === 'android') {
        checkOverlayPermission().then((hasPerm) => {
          if (hasPerm) {
            startFloatingWidget();
          } else {
            console.log('Overlay permission required for floating widget');
          }
        });
      }
    } else if (!isDriverOnline) {
      console.log('Driver offline - stopping services');
      controlPoolingService(false);
      stopFloatingWidget();
    }
  }, [isDriverOnline, driverId, token, enableFloatingWidget]);

  // Effect: Initialize service status and app state listener
  useEffect(() => {
    checkServiceStatus();
    checkOverlayPermission();
    
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription?.remove();
    };
  }, []);

  // Effect: Keep-alive check every 30 seconds
  useEffect(() => {
    if (!isDriverOnline) return;

    const keepAliveInterval = setInterval(() => {
      console.log('Keep-alive check - ensuring services are running');
      checkServiceStatus();
      
      // Restart if not running
      if (isDriverOnline && !isPoolingActive) {
        console.log('Pooling service died - restarting');
        controlPoolingService(true);
      }
      
      if (isDriverOnline && enableFloatingWidget && !isWidgetActive) {
        console.log('Widget died - restarting');
        startFloatingWidget();
      }
    }, 30000); // Every 30 seconds

    return () => clearInterval(keepAliveInterval);
  }, [isDriverOnline, isPoolingActive, isWidgetActive, enableFloatingWidget]);

  // Effect: Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('Cleanup driver services');
      // Only stop if driver is going offline, not on component unmount
      // This allows services to persist when navigating between screens
    };
  }, []);

  return {
    // State
    isPoolingActive,
    isWidgetActive,
    hasOverlayPermission,
    
    // Pooling service controls
    startPoolingService: () => controlPoolingService(true),
    stopPoolingService: () => controlPoolingService(false),
    
    // Widget controls
    startFloatingWidget,
    stopFloatingWidget,
    requestOverlayPermission,
    
    // Status check
    checkServiceStatus,
  };
};