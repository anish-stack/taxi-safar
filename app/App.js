import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Platform,
  StatusBar as RNStatusBar,
  AppState,
  Alert,
  ActivityIndicator,
  Modal,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import * as SecureStore from "expo-secure-store";
import { useFonts } from "expo-font";
import * as Updates from "expo-updates";
import * as Application from 'expo-application';
// Services
import { requestAppPermissions } from "./services/PermissionService";
import { initializeNotifications } from "./utils/initNotifications";
import locationService from "./services/LocationsService";
import { useDriverServices } from "./hooks/useDriverServices";

// Store
import loginStore from "./store/auth.store";
import useDriverStore from "./store/driver.store";

// Hooks

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
import useSettings from "./hooks/Settings";

const Stack = createNativeStackNavigator();

// Configuration constants
const CONFIG = {
  NOTIFICATION_INTERVAL: 60000, // 1 minute
  LOCATION_UPDATE_INTERVAL: 60000, // 1 minute
  PERMISSION_CHECK_INTERVAL: 300000, // 5 minutes
};

// Update Modal Component
const UpdateModal = ({ visible, onUpdate, type = "store" }) => (
  <Modal visible={visible} transparent animationType="fade">
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>Update Required</Text>
        <Text style={styles.modalMessage}>
          {type === "store"
            ? "A new version of the app is available on the Play Store. Please update to continue using the app."
            : "An update is available. Please update to get the latest features and improvements."}
        </Text>
        <TouchableOpacity style={styles.updateButton} onPress={onUpdate}>
          <Text style={styles.updateButtonText}>Update Now</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

// Loading Screen Component
const UpdateLoadingScreen = ({ message = "Updating app..." }) => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#000" />
    <Text style={styles.loadingText}>{message}</Text>
  </View>
);

export default function App() {
  const { token } = loginStore();
  const { driver, fetchDriverDetails } = useDriverStore();

  // Fetch settings
  const { data: settingsData, loading: settingsLoading } = useSettings({
    autoFetch: true,
  });

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
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(true);
  const [isDownloadingUpdate, setIsDownloadingUpdate] = useState(false);
  const [showStoreUpdateModal, setShowStoreUpdateModal] = useState(false);
  const [storeUpdateLink, setStoreUpdateLink] = useState("");

  // Get driver info
  const driverId = driver?._id || driver;

  // Initialize driver services (Ride Pooling & Floating Widget)
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
    enabled: permissionsGranted,
  });

  /**
   * Get current app version
   */
  const getCurrentAppVersion = () => {
    return Application.nativeApplicationVersion || "1.0.0";
  };

  /**
   * Compare version strings
   * Returns true if serverVersion > currentVersion
   */
  const isServerVersionGreater = (currentVersion, serverVersion) => {
    const current = currentVersion.split(".").map(Number);
    const server = serverVersion.split(".").map(Number);

    for (let i = 0; i < Math.max(current.length, server.length); i++) {
      const c = current[i] || 0;
      const s = server[i] || 0;
      if (s > c) return true;
      if (s < c) return false;
    }
    return false;
  };

  /**
   * Check for Play Store updates
   */
  const checkPlayStoreUpdate = async () => {
    try {
      if (Platform.OS !== "android" || !settingsData?.data) {
        return false;
      }

      const currentVersion = getCurrentAppVersion();
      const serverVersion = settingsData.data.app_version_android;
      const playStoreLink = settingsData.data.app_link_android;

      console.log("📱 Current version:", currentVersion);
      console.log("📱 Server version:", serverVersion);

      if (serverVersion && isServerVersionGreater(currentVersion, serverVersion)) {
        console.log("🔄 Play Store update required");
        setStoreUpdateLink(playStoreLink || "");
        setShowStoreUpdateModal(true);
        return true;
      }

      return false;
    } catch (error) {
      console.error("❌ Error checking Play Store update:", error);
      return false;
    }
  };

  /**
   * Handle Play Store update
   */
  const handlePlayStoreUpdate = async () => {
    try {
      if (storeUpdateLink) {
        const canOpen = await Linking.canOpenURL(storeUpdateLink);
        if (canOpen) {
          await Linking.openURL(storeUpdateLink);
        } else {
          Alert.alert("Error", "Unable to open Play Store link");
        }
      }
    } catch (error) {
      console.error("❌ Error opening Play Store:", error);
      Alert.alert("Error", "Unable to open Play Store");
    }
  };

  /**
   * Check for OTA updates (Expo Updates / EAS)
   */
  const checkOTAUpdate = async () => {
    try {
      if (__DEV__) {
        console.log("🔄 Skipping OTA update check in development");
        return false;
      }

      console.log("🔄 Checking for OTA updates...");

      const update = await Updates.checkForUpdateAsync();

      if (update.isAvailable) {
        console.log("📥 OTA update available, downloading...");
        setIsDownloadingUpdate(true);

        await Updates.fetchUpdateAsync();

        console.log("✅ OTA update downloaded, reloading app...");
        await Updates.reloadAsync();

        return true;
      } else {
        console.log("✅ App is up to date");
        return false;
      }
    } catch (error) {
      console.error("❌ Error checking OTA updates:", error);
      return false;
    }
  };

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

      await fetchDriverDetails();

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

      if (!permissionsGranted) {
        console.warn("⚠️ Cannot start location tracking - permissions not granted");
        return;
      }

      console.log("📍 Starting location tracking...");

      const apiUrl = `${API_URL_APP}/api/v1/update-driver-location`;

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
    console.log(`📱 App state: ${appStateRef.current} -> ${nextAppState}`);

    if (
      appStateRef.current.match(/inactive|background/) &&
      nextAppState === "active"
    ) {
      console.log("📱 App came to foreground");

      const authToken = (await SecureStore.getItemAsync("auth_token")) || token;

      if (authToken && permissionsGranted) {
        await initializeApp(authToken);
        await startLocationTracking(authToken);
      }
    }

    if (
      appStateRef.current === "active" &&
      nextAppState.match(/inactive|background/)
    ) {
      console.log("📱 App went to background");
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

        // STEP 1: Wait for settings to load
        if (settingsLoading) {
          console.log("⏳ Waiting for settings...");
          return;
        }

        // STEP 2: Check for Play Store update FIRST
        const needsStoreUpdate = await checkPlayStoreUpdate();
        if (needsStoreUpdate) {
          console.log("⚠️ Play Store update required, blocking app");
          setIsCheckingUpdates(false);
          return;
        }

        // STEP 3: Check for OTA updates
        await checkOTAUpdate();
        setIsCheckingUpdates(false);

        // STEP 4: Request permissions
        const permissionsOk = await requestAllPermissions();

        if (!permissionsOk) {
          console.warn("⚠️ Permissions not granted, skipping service initialization");
          setIsInitialized(true);
          return;
        }

        // STEP 5: Get auth token
        const storedToken = await SecureStore.getItemAsync("auth_token");
        const authToken = storedToken || token;

        if (!authToken) {
          console.warn("⚠️ No auth token found");
          setIsInitialized(true);
          return;
        }

        // STEP 6: Initialize app
        await initializeApp(authToken);

        // STEP 7: Start location tracking
        await startLocationTracking(authToken);

        // STEP 8: Setup periodic refreshes
        setupNotificationRefresh(authToken);
        setupPermissionCheck();

        // STEP 9: Setup app state listener
        appStateSubscription = AppState.addEventListener(
          "change",
          handleAppStateChange
        );

        setIsInitialized(true);
        console.log("✅ App setup completed successfully");
      } catch (error) {
        console.error("❌ Error in app setup:", error);
        setIsCheckingUpdates(false);
        setIsInitialized(true);
      }
    };

    setup();

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
  }, [settingsLoading, settingsData]);

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

  // Show loading screens
  if (!fontsLoaded) {
    return <UpdateLoadingScreen message="Loading fonts..." />;
  }

  if (isCheckingUpdates || isDownloadingUpdate) {
    return (
      <UpdateLoadingScreen
        message={isDownloadingUpdate ? "Downloading update..." : "Checking for updates..."}
      />
    );
  }

  return (
    <NavigationContainer>
      <View style={{ flex: 1 }}>
        {Platform.OS === "android" && (
          <RNStatusBar backgroundColor="#F2F5F6" barStyle="dark-content" />
        )}

        {/* Play Store Update Modal */}
        <UpdateModal
          visible={showStoreUpdateModal}
          onUpdate={handlePlayStoreUpdate}
          type="store"
        />

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
          <Stack.Screen name="DriverPostDetails" component={ReserveRideDetails} />
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

          {/* Vehicles */}
          <Stack.Screen name="all-vehicle" component={AllVehicles} />

          {/* Insurance */}
          <Stack.Screen name="Insurance" component={InsurnaceIntro} />
          <Stack.Screen name="CreateInsurance" component={ApplyForInsurance} />
          <Stack.Screen name="AllInsurance" component={AllInsurance} />

          {/* Others */}
          <Stack.Screen name="BuySellTaxi" component={BuySellTaxi} />
          <Stack.Screen name="MyTrip" component={MyTrips} />
          <Stack.Screen name="AllCategories" component={AllCategories} />
        </Stack.Navigator>
      </View>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F2F5F6",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    width: "85%",
    maxWidth: 400,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  updateButton: {
    backgroundColor: "#000",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    width: "100%",
  },
  updateButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
});