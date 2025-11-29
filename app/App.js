import React, { useEffect, useRef, useState } from "react";
import { View, Platform, StatusBar as RNStatusBar, AppState } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import * as SecureStore from "expo-secure-store";

// Services
import { requestAppPermissions } from "./services/PermissionService";
import { initializeNotifications } from "./utils/initNotifications";
import locationService from "./services/LocationsService";

// Store
import loginStore from "./store/auth.store";

// Constants
import { API_URL_APP } from "./constant/api";

// Screens - Auth
import SplashScreen from "./screens/common/SplashScreen";
import LoginScreen from "./screens/auth/login/LoginScreen";
import SignupScreen from "./screens/auth/register/signup";
import OnboardScreen from "./screens/auth/onbaord";
import AddVehicle from "./screens/auth/login/addVehcile";
import AddBank from "./screens/auth/login/bankAdd";
import WaitScreen from "./screens/auth/login/WaitScreen";

// Screens - Main
import HomeScreen from "./screens/Home/HomeScreen";
import Profile from "./screens/pages/Profile";
import RideDetails from "./screens/pages/RideDetails";
import RechargeScreen from "./screens/pages/recharge";
import WalletScreen from "./screens/pages/Wallet";

// Screens - Driver Post & Reserve
import Driver_Post from "./screens/Driver_Post/Driver_Post";
import Reserve from "./screens/Reserve/Reserve";
import ReserveRideDetails from "./screens/Reserve/ReserveRideDetails";
import ReserveRideDetailsAssigned from "./screens/Reserve/ReserverAssigned";

// Screens - Taxi Safari
import TaxiSafarView from "./screens/Taxi-Safar/TaxiSafarRideView";
import TaxiSafarTripDetailScreen from "./screens/Taxi-Safar/TaxiSafarRideView";
import ProgressTaxiSafarRide from "./screens/Taxi-Safar/ProgressTaxiSafarRide";

// Screens - Chat
import Chat from "./screens/chat/Chats";
import ChatBox from "./screens/chat/ChatBox";

// Screens - Company & Quotation
import CompanyDetails from "./screens/company-details/CompanyDetails";
import QuotationIntro from "./screens/Quotation/QuotationIntro";
import CreateQuotations from "./screens/Quotation/CreateQuotations";
import Quotation from "./screens/Quotation/Quotation";
import EditQuotations from "./screens/Quotation/EditQuotations";

// Screens - Driver Jobs
import DriverJobIntro from "./screens/DriverJobs/DriverJobIntro";
import DriverJobCreateAndEdit from "./screens/DriverJobs/DriverJobCreateAndEdit";
import Jobs from "./screens/DriverJobs/Jobs";
import MyJobsPosted from "./screens/DriverJobs/MyJobsPosted";

// Screens - Border Tax
import BorderTaxIntro from "./screens/BorderTax/BorderTaxIntro";
import CreateBorderTax from "./screens/BorderTax/CreateBorderTax";
import AllBorderTax from "./screens/BorderTax/AllBorderTax";

// Screens - Insurance
import InsurnaceIntro from "./screens/Insurance/InsurnaceIntro";
import ApplyForInsurance from "./screens/Insurance/ApplyForInsurance";
import AllInsurance from "./screens/Insurance/AllInsurance";

// Screens - Others
import BuySellTaxi from "./screens/BuySellTaxi/BuySellTaxi";
import MyTrips from "./screens/MyTrips/MyTrips";

const Stack = createNativeStackNavigator();

// Configuration constants
const CONFIG = {
  NOTIFICATION_INTERVAL: 60000, // 1 minute
  LOCATION_UPDATE_INTERVAL: 10000, // 10 seconds
  PERMISSION_CHECK_INTERVAL: 300000, // 5 minutes
};

export default function App() {
  const { token } = loginStore();
  
  // Refs for cleanup
  const notificationIntervalRef = useRef(null);
  const permissionCheckIntervalRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);
  const isLocationTrackingActiveRef = useRef(false);
  
  // State
  const [isInitialized, setIsInitialized] = useState(false);

  /**
   * Initialize notifications and request permissions
   */
  const initializeApp = async (authToken) => {
    try {
      console.log("📱 Initializing app...");
      
      // Request permissions first
      const permissionsGranted = await requestAppPermissions();
      console.log("✅ Permissions granted:", permissionsGranted);

      // Initialize notifications
      if (authToken) {
        await initializeNotifications(authToken);
        console.log("🔔 Notifications initialized");
      }

      return true;
    } catch (error) {
      console.error("❌ Error initializing app:", error);
      return false;
    }
  };

  /**
   * Start location tracking service
   */
  const startLocationTracking = async (authToken) => {
    try {
      if (isLocationTrackingActiveRef.current) {
        console.log("📍 Location tracking already active");
        return;
      }

      if (!authToken) {
        console.warn("⚠️ No auth token available for location tracking");
        return;
      }

      console.log("📍 Starting location tracking...");
      
      const apiUrl = `${API_URL_APP}/api/v1/update-driver-location`;
      await locationService.startTracking(apiUrl, authToken);
      
      isLocationTrackingActiveRef.current = true;
      console.log("✅ Location tracking started successfully");
    } catch (error) {
      console.error("❌ Error starting location tracking:", error);
      isLocationTrackingActiveRef.current = false;
    }
  };

  /**
   * Stop location tracking service
   */
  const stopLocationTracking = async () => {
    try {
      if (!isLocationTrackingActiveRef.current) {
        return;
      }

      console.log("📍 Stopping location tracking...");
      await locationService.stopTracking();
      isLocationTrackingActiveRef.current = false;
      console.log("✅ Location tracking stopped");
    } catch (error) {
      console.error("❌ Error stopping location tracking:", error);
    }
  };

  /**
   * Setup periodic notification refresh
   */
  const setupNotificationRefresh = (authToken) => {
    if (notificationIntervalRef.current) {
      clearInterval(notificationIntervalRef.current);
    }

    notificationIntervalRef.current = setInterval(async () => {
      try {
        if (authToken && appStateRef.current === "active") {
          await initializeNotifications(authToken);
          console.log("🔄 Notifications refreshed");
        }
      } catch (error) {
        console.error("❌ Error refreshing notifications:", error);
      }
    }, CONFIG.NOTIFICATION_INTERVAL);
  };

  /**
   * Setup periodic permission check
   */
  const setupPermissionCheck = () => {
    if (permissionCheckIntervalRef.current) {
      clearInterval(permissionCheckIntervalRef.current);
    }

    permissionCheckIntervalRef.current = setInterval(async () => {
      try {
        if (appStateRef.current === "active") {
          const granted = await requestAppPermissions();
          
          if (!granted) {
            console.warn("⚠️ Permissions were revoked, stopping location tracking");
            await stopLocationTracking();
          } else if (!isLocationTrackingActiveRef.current && token) {
            console.log("🔄 Permissions restored, restarting location tracking");
            await startLocationTracking(token);
          }
        }
      } catch (error) {
        console.error("❌ Error checking permissions:", error);
      }
    }, CONFIG.PERMISSION_CHECK_INTERVAL);
  };

  /**
   * Handle app state changes (foreground/background)
   */
  const handleAppStateChange = async (nextAppState) => {
    console.log(`📱 App state changed: ${appStateRef.current} -> ${nextAppState}`);

    // App coming to foreground
    if (appStateRef.current.match(/inactive|background/) && nextAppState === "active") {
      console.log("📱 App came to foreground");
      
      const authToken = await SecureStore.getItemAsync("auth_token") || token;
      
      if (authToken) {
        // Reinitialize everything
        await initializeApp(authToken);
        await startLocationTracking(authToken);
      }
    }
    
    // App going to background
    if (appStateRef.current === "active" && nextAppState.match(/inactive|background/)) {
      console.log("📱 App went to background");
      // Keep location tracking active in background if supported
      // iOS: Requires background location permission
      // Android: Should continue working
    }

    appStateRef.current = nextAppState;
  };

  /**
   * Main setup effect
   */
  useEffect(() => {
    let appStateSubscription;

    const setup = async () => {
      try {
        console.log("🚀 Starting app setup...");

        // Get auth token
        const storedToken = await SecureStore.getItemAsync("auth_token");
        const authToken = storedToken || token;

        if (!authToken) {
          console.warn("⚠️ No auth token found");
          setIsInitialized(true);
          return;
        }

        // Initialize app (permissions & notifications)
        const initialized = await initializeApp(authToken);
        
        if (initialized) {
          // Start location tracking
          await startLocationTracking(authToken);
          
          // Setup periodic refreshes
          setupNotificationRefresh(authToken);
          setupPermissionCheck();
          
          // Setup app state listener
          appStateSubscription = AppState.addEventListener("change", handleAppStateChange);
        }

        setIsInitialized(true);
        console.log("✅ App setup completed");
      } catch (error) {
        console.error("❌ Error in app setup:", error);
        setIsInitialized(true);
      }
    };

    setup();

    // Cleanup function
    return () => {
      console.log("🧹 Cleaning up app...");
      
      // Clear intervals
      if (notificationIntervalRef.current) {
        clearInterval(notificationIntervalRef.current);
      }
      if (permissionCheckIntervalRef.current) {
        clearInterval(permissionCheckIntervalRef.current);
      }

      // Remove app state listener
      if (appStateSubscription) {
        appStateSubscription.remove();
      }

      // Stop location tracking
      stopLocationTracking();
    };
  }, [token]);

  /**
   * Handle token changes
   */
  useEffect(() => {
    const handleTokenChange = async () => {
      if (token && isInitialized) {
        console.log("🔑 Token changed, reinitializing services...");
        
        // Restart location tracking with new token
        await stopLocationTracking();
        await startLocationTracking(token);
        
        // Reinitialize notifications
        await initializeNotifications(token);
        
        // Reset intervals
        setupNotificationRefresh(token);
      } else if (!token && isLocationTrackingActiveRef.current) {
        console.log("🔑 Token removed, stopping services...");
        await stopLocationTracking();
        
        if (notificationIntervalRef.current) {
          clearInterval(notificationIntervalRef.current);
        }
      }
    };

    handleTokenChange();
  }, [token, isInitialized]);

  return (
    <NavigationContainer>
      <View style={{ flex: 1 }}>
        {/* Status Bar */}
        {Platform.OS === "android" && (
          <RNStatusBar backgroundColor="#FFF" barStyle="dark-content" />
        )}

        <Stack.Navigator
          initialRouteName="splash"
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: "#fff" },
            animation: "slide_from_right",
          }}
        >
          {/* Auth Screens */}
          <Stack.Screen 
            name="splash" 
            component={SplashScreen}
            options={{ animation: "fade" }}
          />
          <Stack.Screen name="OnboardScreen" component={OnboardScreen} />
          <Stack.Screen name="AuthLogin" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
          <Stack.Screen name="addVehcile" component={AddVehicle} />
          <Stack.Screen name="bankAdd" component={AddBank} />
          <Stack.Screen name="wait_screen" component={WaitScreen} />

          {/* Main Screens */}
          <Stack.Screen 
            name="Home" 
            component={HomeScreen}
            options={{ gestureEnabled: false }}
          />
          <Stack.Screen name="Account" component={Profile} />
          <Stack.Screen name="RideDetails" component={RideDetails} />
          <Stack.Screen name="recharge" component={RechargeScreen} />
          <Stack.Screen name="wallet" component={WalletScreen} />

          {/* Driver Post & Reserve */}
          <Stack.Screen name="Add" component={Driver_Post} />
          <Stack.Screen name="Reserve" component={Reserve} />
          <Stack.Screen name="DriverPostDetails" component={ReserveRideDetails} />
          <Stack.Screen name="ReserveRideDetailsAssigned" component={ReserveRideDetailsAssigned} />

          {/* Taxi Safari */}
          <Stack.Screen name="TaxiSafarView" component={TaxiSafarView} />
          <Stack.Screen name="TaxiSafarTripDetailScreen" component={TaxiSafarTripDetailScreen} />
          <Stack.Screen name="ProgressTaxiSafarRide" component={ProgressTaxiSafarRide} />

          {/* Chat */}
          <Stack.Screen name="chat" component={Chat} />
          <Stack.Screen name="ChatBox" component={ChatBox} />

          {/* Company & Quotation */}
          <Stack.Screen name="company-details" component={CompanyDetails} />
          <Stack.Screen name="Quotation" component={QuotationIntro} />
          <Stack.Screen name="create-quotation" component={CreateQuotations} />
          <Stack.Screen name="see-quotation" component={Quotation} />
          <Stack.Screen name="edit-quotation" component={EditQuotations} />

          {/* Driver Jobs */}
          <Stack.Screen name="DriverJobs" component={DriverJobIntro} />
          <Stack.Screen name="driver-job-create" component={DriverJobCreateAndEdit} />
          <Stack.Screen name="driver-job-list" component={MyJobsPosted} />
          <Stack.Screen name="job-posted-u" component={MyJobsPosted} />

          {/* Border Tax */}
          <Stack.Screen name="BorderTax" component={BorderTaxIntro} />
          <Stack.Screen name="CreateBorderTax" component={CreateBorderTax} />
          <Stack.Screen name="ViewBorderTax" component={AllBorderTax} />

          {/* Insurance */}
          <Stack.Screen name="Insurance" component={InsurnaceIntro} />
          <Stack.Screen name="CreateInsurance" component={ApplyForInsurance} />
          <Stack.Screen name="AllInsurance" component={AllInsurance} />

          {/* Others */}
          <Stack.Screen name="BuySellTaxi" component={BuySellTaxi} />
          <Stack.Screen name="MyTrip" component={MyTrips} />
        </Stack.Navigator>
      </View>
    </NavigationContainer>
  );
}