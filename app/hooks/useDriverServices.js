// hooks/useDriverServices.js
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
  enabled = true, // NEW: Only start services when permissions are granted
}) => {
  const [isPoolingActive, setIsPoolingActive] = useState(false);
  const [isWidgetActive, setIsWidgetActive] = useState(false);
  const [hasOverlayPermission, setHasOverlayPermission] = useState(false);
  const appStateRef = useRef(AppState.currentState);
  const servicesInitializedRef = useRef(false);

  /**
   * Save driver online state to native storage for persistence
   */
  const saveDriverOnlineState = async (isOnline) => {
    try {
      // Save to AsyncStorage
      await AsyncStorage.setItem('driver_online', JSON.stringify(isOnline));
      
      // Save to native SharedPreferences for boot receiver
      if (Platform.OS === 'android' && SharedPreferences) {
        await SharedPreferences.setBoolean('driver_online', isOnline);
      }
      
      console.log(`💾 Driver state saved: ${isOnline ? 'ONLINE' : 'OFFLINE'}`);
    } catch (error) {
      console.error('❌ Error saving driver state:', error);
    }
  };

  /**
   * Control pooling service (start/stop)
   */
  const controlPoolingService = async (start) => {
    // Check if services are enabled (permissions granted)
    if (!enabled) {
      console.warn('⚠️ Services not enabled yet (waiting for permissions)');
      return false;
    }

    if (!driverId || !token) {
      console.log('⚠️ Missing driverId or token');
      if (!start) setIsPoolingActive(false);
      return false;
    }

    try {
      console.log(start ? '🚀 Starting pooling service...' : '🛑 Stopping pooling service...');
      
      if (RidePoolingModule?.controlPoolingService) {
        await RidePoolingModule.controlPoolingService(start, driverId, token, API_URL_APP);
        setIsPoolingActive(start);
        console.log(start ? '✅ Pooling service started' : '✅ Pooling service stopped');
        return true;
      } else {
        console.warn('⚠️ controlPoolingService method not found on RidePoolingModule');
        return false;
      }
    } catch (error) {
      console.error('❌ Pooling service error:', error);
      setIsPoolingActive(false);
      return false;
    }
  };

  /**
   * Check overlay permission status
   */
  const checkOverlayPermission = async () => {
    if (Platform.OS !== 'android') return true;
    
    try {
      const hasPerm = await FloatingWidgetService.hasOverlayPermission();
      setHasOverlayPermission(hasPerm);
      console.log(`🔍 Overlay permission: ${hasPerm ? 'GRANTED' : 'DENIED'}`);
      return hasPerm;
    } catch (error) {
      console.error('❌ Overlay permission check failed:', error);
      return false;
    }
  };

  /**
   * Request overlay permission
   */
  const requestOverlayPermission = async () => {
    if (Platform.OS !== 'android') return true;
    
    try {
      console.log('🔐 Requesting overlay permission...');
      await FloatingWidgetService.requestOverlayPermission();
      
      // Check permission after a delay
      setTimeout(async () => {
        const granted = await checkOverlayPermission();
        if (granted) {
          console.log('✅ Overlay permission granted');
        } else {
          console.log('⚠️ Overlay permission denied');
        }
      }, 1200);
    } catch (error) {
      console.error('❌ Request overlay permission failed:', error);
    }
  };

  /**
   * Start floating widget
   */
  const startFloatingWidget = async () => {
    // Check if services are enabled (permissions granted)
    if (!enabled) {
      console.warn('⚠️ Services not enabled yet (waiting for permissions)');
      return false;
    }

    if (Platform.OS !== 'android') {
      console.warn('⚠️ Floating widget only available on Android');
      return false;
    }
    
    const hasPerm = await checkOverlayPermission();
    if (!hasPerm) {
      console.log('⚠️ No overlay permission - cannot start floating widget');
      return false;
    }

    try {
      console.log('🚀 Starting floating widget...');
      await FloatingWidgetService.showFloatingIcon();
      setIsWidgetActive(true);
      console.log('✅ Floating widget started');
      return true;
    } catch (error) {
      console.error('❌ Start floating widget failed:', error);
      setIsWidgetActive(false);
      return false;
    }
  };

  /**
   * Stop floating widget
   */
  const stopFloatingWidget = async () => {
    if (Platform.OS !== 'android') return false;
    
    try {
      console.log('🛑 Stopping floating widget...');
      await FloatingWidgetService.hideFloatingIcon();
      setIsWidgetActive(false);
      console.log('✅ Floating widget stopped');
      return true;
    } catch (error) {
      console.error('❌ Stop floating widget failed:', error);
      return false;
    }
  };

  /**
   * Check service status (both pooling and widget)
   */
  const checkServiceStatus = async () => {
    try {
      // Check pooling service
      if (RidePoolingModule?.isPoolingServiceRunning) {
        const pooling = await RidePoolingModule.isPoolingServiceRunning();
        setIsPoolingActive(pooling);
        console.log(`📊 Pooling service: ${pooling ? 'RUNNING' : 'STOPPED'}`);
      }

      // Check widget
      if (Platform.OS === 'android' && FloatingWidgetService?.isFloatingIconVisible) {
        const widget = await FloatingWidgetService.isFloatingIconVisible();
        setIsWidgetActive(widget);
        console.log(`📊 Floating widget: ${widget ? 'VISIBLE' : 'HIDDEN'}`);
      }
    } catch (error) {
      console.error('❌ Check service status failed:', error);
    }
  };

  /**
   * Handle app state changes (foreground/background)
   */
  const handleAppStateChange = (nextState) => {
    console.log(`📱 App state: ${appStateRef.current} -> ${nextState}`);

    // App coming to foreground
    if (appStateRef.current.match(/inactive|background/) && nextState === 'active') {
      console.log('📱 App to foreground - checking services');
      checkServiceStatus();
      
      // Restart services if they died while app was in background
      // ONLY if permissions are granted and driver is online
      if (enabled && isDriverOnline && driverId && token) {
        setTimeout(() => {
          console.log('🔄 Restarting services after returning to foreground');
          controlPoolingService(true);
          if (enableFloatingWidget) startFloatingWidget();
        }, 500);
      }
    }
    
    appStateRef.current = nextState;
  };

  /**
   * Effect: Start/stop services based on driver online status
   * ONLY runs when permissions are enabled
   */
  useEffect(() => {
    const handleServicesToggle = async () => {
      // Save online state for persistence
      await saveDriverOnlineState(isDriverOnline);

      // Don't start services if permissions not granted
      if (!enabled) {
        console.log('⏳ Waiting for permissions before managing services...');
        return;
      }

      if (isDriverOnline && driverId && token) {
        console.log('🚗 Driver ONLINE - starting services');
        
        // Start pooling service
        const poolingStarted = await controlPoolingService(true);
        
        // Start floating widget if enabled
        if (enableFloatingWidget && Platform.OS === 'android') {
          const hasPerm = await checkOverlayPermission();
          if (hasPerm) {
            await startFloatingWidget();
          } else {
            console.log('⚠️ Overlay permission required for floating widget');
          }
        }

        servicesInitializedRef.current = true;
      } else if (!isDriverOnline && servicesInitializedRef.current) {
        console.log('🚗 Driver OFFLINE - stopping services');
        await controlPoolingService(false);
        await stopFloatingWidget();
        servicesInitializedRef.current = false;
      }
    };

    handleServicesToggle();
  }, [isDriverOnline, driverId, token, enableFloatingWidget, enabled]);

  /**
   * Effect: Initialize service status and app state listener
   */
  useEffect(() => {
    const initialize = async () => {
      if (!enabled) {
        console.log('⏳ Services initialization waiting for permissions...');
        return;
      }

      console.log('🔧 Initializing driver services...');
      await checkServiceStatus();
      await checkOverlayPermission();
    };

    initialize();
    
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription?.remove();
    };
  }, [enabled]);

  /**
   * Effect: Keep-alive check every 30 seconds
   * Ensures services stay running if driver is online
   */
  useEffect(() => {
    if (!enabled || !isDriverOnline) return;

    console.log('⏰ Starting keep-alive monitor (30s interval)');

    const keepAliveInterval = setInterval(async () => {
      console.log('💓 Keep-alive check - ensuring services are running');
      await checkServiceStatus();
      
      // Restart pooling if not running
      if (isDriverOnline && !isPoolingActive && driverId && token) {
        console.log('🔄 Pooling service died - restarting');
        await controlPoolingService(true);
      }
      
      // Restart widget if not running
      if (isDriverOnline && enableFloatingWidget && !isWidgetActive) {
        console.log('🔄 Widget died - restarting');
        await startFloatingWidget();
      }
    }, 30000); // Every 30 seconds

    return () => {
      console.log('⏰ Stopping keep-alive monitor');
      clearInterval(keepAliveInterval);
    };
  }, [isDriverOnline, isPoolingActive, isWidgetActive, enableFloatingWidget, enabled, driverId, token]);

  /**
   * Effect: Log service status changes
   */
  useEffect(() => {
    console.log('📊 Service Status Update:', {
      enabled,
      isDriverOnline,
      isPoolingActive,
      isWidgetActive,
      hasOverlayPermission,
    });
  }, [enabled, isDriverOnline, isPoolingActive, isWidgetActive, hasOverlayPermission]);

  /**
   * Effect: Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      console.log('🧹 Cleanup driver services hook');
      // Services persist across navigation - only stop when driver goes offline
      // The actual cleanup happens in the isDriverOnline effect
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