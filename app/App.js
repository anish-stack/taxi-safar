import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Platform,
  StatusBar as RNStatusBar,
  AppState,
  Alert,
  ActivityIndicator,
} from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import * as SecureStore from "expo-secure-store";
import { useFonts } from "expo-font";
// Services
import { requestAppPermissions } from "./services/PermissionService";
import { initializeNotifications } from "./utils/initNotifications";
import locationService from "./services/LocationsService";
import { useDriverServices } from "./hooks/useDriverServices";

// Store
import loginStore from "./store/auth.store";
import useDriverStore from "./store/driver.store";

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
import AllCategories from "./screens/AllCategories/AllCategories";
import AllVehicles from "./screens/pages/AllVehicles";
import Preferences from "./screens/pages/Preferences";

const Stack = createNativeStackNavigator();

// Configuration constants
const CONFIG = {
  NOTIFICATION_INTERVAL: 60000, // 1 minute
  LOCATION_UPDATE_INTERVAL: 60000, // 1 minute
  PERMISSION_CHECK_INTERVAL: 300000, // 5 minutes
};

export default function App() {
  const { token } = loginStore();
  const { driver, fetchDriverDetails } = useDriverStore();

  const [fontsLoaded] = useFonts({
    "SFProDisplay-Regular": require("./assets/fonts/SF-Pro-Display-Regular.otf"),
    "SFProDisplay-Medium": require("./assets/fonts/SF-Pro-Display-Medium.otf"),
    "SFProDisplay-Semibold": require("./assets/fonts/SF-Pro-Display-Bold.otf"),
    "SFProDisplay-Bold": require("./assets/fonts/SF-Pro-Display-Bold.otf"),
  });

  // Refs for cleanup
  const notificationIntervalRef = useRef(null);
  const permissionCheckIntervalRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);
  const isLocationTrackingActiveRef = useRef(false);

  // State
  const [isInitialized, setIsInitialized] = useState(false);
  const [isDriverOnline, setIsDriverOnline] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState(false);

  // Get driver info
  const driverId = driver?._id || driver;

  // Initialize driver services (Ride Pooling & Floating Widget)
  // IMPORTANT: Only initialize AFTER permissions are granted
  const {
    isPoolingActive,
    isWidgetActive,
    hasOverlayPermission,
    startPoolingService,
    stopPoolingService,
    startFloatingWidget,
    stopFloatingWidget,
    requestOverlayPermission,
  } = useDriverServices({
    driverId,
    token,
    isDriverOnline,
    enableFloatingWidget: true,
    enabled: permissionsGranted, // Only enable after permissions
  });

  /**
   * Request all permissions FIRST - before any service initialization
   */
  const requestAllPermissions = async () => {
    try {
      console.log("🔐 Requesting all permissions...");

      const granted = await requestAppPermissions();

      if (granted) {
        console.log("✅ All permissions granted");
        setPermissionsGranted(true);
        return true;
      } else {
        console.warn("⚠️ Some permissions denied");
        Alert.alert(
          "Permissions Required",
          "This app requires location and notification permissions to work properly. Please enable them in settings.",
          [{ text: "OK" }]
        );
        return false;
      }
    } catch (error) {
      console.error("❌ Error requesting permissions:", error);
      return false;
    }
  };

  /**
   * Initialize notifications and fetch driver details
   */
  const initializeApp = async (authToken) => {
    try {
      console.log("📱 Initializing app...");

      // Fetch driver details
      await fetchDriverDetails();

      // Initialize notifications (only if token exists)
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
   * ONLY call this AFTER permissions are granted
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

      if (!permissionsGranted) {
        console.warn(
          "⚠️ Cannot start location tracking - permissions not granted"
        );
        return;
      }

      console.log("📍 Starting location tracking...");

      const apiUrl = `${API_URL_APP}/api/v1/update-driver-location`;

      // Add delay to ensure permissions are fully processed
      await new Promise((resolve) => setTimeout(resolve, 1000));

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
            console.warn("⚠️ Permissions revoked, stopping services");
            setPermissionsGranted(false);
            await stopLocationTracking();
          } else if (
            !isLocationTrackingActiveRef.current &&
            token &&
            permissionsGranted
          ) {
            console.log(
              "🔄 Permissions restored, restarting location tracking"
            );
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
    console.log(`📱 App state: ${appStateRef.current} -> ${nextAppState}`);

    // App coming to foreground
    if (
      appStateRef.current.match(/inactive|background/) &&
      nextAppState === "active"
    ) {
      console.log("📱 App came to foreground");

      const authToken = (await SecureStore.getItemAsync("auth_token")) || token;

      if (authToken && permissionsGranted) {
        // Reinitialize services
        await initializeApp(authToken);
        await startLocationTracking(authToken);
      }
    }

    // App going to background
    if (
      appStateRef.current === "active" &&
      nextAppState.match(/inactive|background/)
    ) {
      console.log("📱 App went to background");
      // Services continue running in background
    }

    appStateRef.current = nextAppState;
  };

  /**
   * Main setup effect - runs once on app start
   */
  useEffect(() => {
    let appStateSubscription;

    const setup = async () => {
      try {
        console.log("🚀 Starting app setup...");

        // STEP 1: Request permissions FIRST
        const permissionsOk = await requestAllPermissions();

        if (!permissionsOk) {
          console.warn(
            "⚠️ Permissions not granted, skipping service initialization"
          );
          setIsInitialized(true);
          return;
        }

        // STEP 2: Get auth token
        const storedToken = await SecureStore.getItemAsync("auth_token");
        const authToken = storedToken || token;

        if (!authToken) {
          console.warn("⚠️ No auth token found");
          setIsInitialized(true);
          return;
        }

        // STEP 3: Initialize app (fetch driver, init notifications)
        await initializeApp(authToken);

        // STEP 4: Start location tracking (with delay)
        await startLocationTracking(authToken);

        // STEP 5: Setup periodic refreshes
        setupNotificationRefresh(authToken);
        setupPermissionCheck();

        // STEP 6: Setup app state listener
        appStateSubscription = AppState.addEventListener(
          "change",
          handleAppStateChange
        );

        setIsInitialized(true);
        console.log("✅ App setup completed successfully");
      } catch (error) {
        console.error("❌ Error in app setup:", error);
        setIsInitialized(true);
      }
    };

    setup();

    // Cleanup function
    return () => {
      console.log("🧹 Cleaning up app...");

      if (notificationIntervalRef.current) {
        clearInterval(notificationIntervalRef.current);
      }
      if (permissionCheckIntervalRef.current) {
        clearInterval(permissionCheckIntervalRef.current);
      }
      if (appStateSubscription) {
        appStateSubscription.remove();
      }

      stopLocationTracking();
    };
  }, []); // Run only once on mount

  /**
   * Handle token changes
   */
  useEffect(() => {
    const handleTokenChange = async () => {
      if (token && isInitialized && permissionsGranted) {
        console.log("🔑 Token changed, reinitializing services...");

        await stopLocationTracking();
        await startLocationTracking(token);
        await initializeNotifications(token);
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
  }, [token, isInitialized, permissionsGranted]);

  // Log service status
  useEffect(() => {
    console.log("📊 Service Status:", {
      permissionsGranted,
      isDriverOnline,
      isPoolingActive,
      isWidgetActive,
      hasOverlayPermission,
    });
  }, [
    permissionsGranted,
    isDriverOnline,
    isPoolingActive,
    isWidgetActive,
    hasOverlayPermission,
  ]);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }
  return (
    <NavigationContainer>
      <View style={{ flex: 1 }}>
        {Platform.OS === "android" && (
          <RNStatusBar backgroundColor="#F2F5F6" barStyle="dark-content" />
        )}

        <Stack.Navigator
          initialRouteName="splash"
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: "#F2F5F6" },
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
          <Stack.Screen name="preferences" component={Preferences} />


          {/* Preferences */}
          <Stack.Screen name="bankAdd" component={AddBank} />
          <Stack.Screen name="wait_screen" component={WaitScreen} />

          {/* Main Screens */}
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{ gestureEnabled: false }}
            initialParams={{
              setIsDriverOnline,
              isPoolingActive,
              isWidgetActive,
              startPoolingService,
              stopPoolingService,
              hasOverlayPermission,
              startFloatingWidget,
              stopFloatingWidget,
              requestOverlayPermission,
            }}
          />
          <Stack.Screen name="Account" component={Profile} />
          <Stack.Screen name="RideDetails" component={RideDetails} />
          <Stack.Screen name="recharge" component={RechargeScreen} />
          <Stack.Screen name="wallet" component={WalletScreen} />

          {/* Driver Post & Reserve */}
          <Stack.Screen name="Add" component={Driver_Post} />
          <Stack.Screen name="Reserve" component={Reserve} />
          <Stack.Screen
            name="DriverPostDetails"
            component={ReserveRideDetails}
          />
          <Stack.Screen
            name="ReserveRideDetailsAssigned"
            component={ReserveRideDetailsAssigned}
          />

          {/* Taxi Safari */}
          <Stack.Screen name="TaxiSafarView" component={TaxiSafarView} />
          <Stack.Screen
            name="TaxiSafarTripDetailScreen"
            component={TaxiSafarTripDetailScreen}
          />
          <Stack.Screen
            name="ProgressTaxiSafarRide"
            component={ProgressTaxiSafarRide}
          />

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
          <Stack.Screen
            name="driver-job-create"
            component={DriverJobCreateAndEdit}
          />
          <Stack.Screen name="driver-job-list" component={MyJobsPosted} />
          <Stack.Screen name="job-posted-u" component={MyJobsPosted} />

          {/* Border Tax */}
          <Stack.Screen name="BorderTax" component={BorderTaxIntro} />
          <Stack.Screen name="CreateBorderTax" component={CreateBorderTax} />
          <Stack.Screen name="ViewBorderTax" component={AllBorderTax} />

            {/* Vehciles */}
            <Stack.Screen name="all-vehicle" component={AllVehicles} />
          {/* Insurance */}
          <Stack.Screen name="Insurance" component={InsurnaceIntro} />
          <Stack.Screen name="CreateInsurance" component={ApplyForInsurance} />
          <Stack.Screen name="AllInsurance" component={AllInsurance} />

          {/* Others */}
          <Stack.Screen name="BuySellTaxi" component={BuySellTaxi} />
          <Stack.Screen name="MyTrip" component={MyTrips} />

          {/* AllCategories */}
          <Stack.Screen name="AllCategories" component={AllCategories} />
        </Stack.Navigator>
      </View>
    </NavigationContainer>
  );
}
