import React, { useEffect } from "react";
import { View, Platform, StatusBar as RNStatusBar } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { requestAppPermissions } from "./services/PermissionService";
import { initializeNotifications } from "./utils/initNotifications";
import * as SecureStore from "expo-secure-store";

// Screens
import SplashScreen from "./screens/common/SplashScreen";
import LoginScreen from "./screens/auth/login/LoginScreen";
import SignupScreen from "./screens/auth/register/signup";
import AddVehicle from "./screens/auth/login/addVehcile";
import AddBank from "./screens/auth/login/bankAdd";
import WaitScreen from "./screens/auth/login/WaitScreen";
import HomeScreen from "./screens/Home/HomeScreen";
import Profile from "./screens/pages/Profile";
import RideDetails from "./screens/pages/RideDetails";
import OnboardScreen from "./screens/auth/onbaord";
import Driver_Post from "./screens/Driver_Post/Driver_Post";
import Reserve from "./screens/Reserve/Reserve";
import ReserveRideDetails from "./screens/Reserve/ReserveRideDetails";
import loginStore from "./store/auth.store";
import Chat from "./screens/chat/Chats";
import ChatBox from "./screens/chat/ChatBox";
import { API_URL_APP } from "./constant/api";
import locationService from "./services/LocationsService";
import ReserveRideDetailsAssigned from "./screens/Reserve/ReserverAssigned";
import TaxiSafarView from "./screens/Taxi-Safar/TaxiSafarRideView";
import RechargeScreen from "./screens/pages/recharge";
import WalletScreen from "./screens/pages/Wallet";

const Stack = createNativeStackNavigator();

export default function App() {
  const { token } = loginStore();

 useEffect(() => {
    let intervalId;

    const setup = async () => {
      try {
        // Initialize notifications & permissions
        await initializeNotifications(token);
        await requestAppPermissions();

        // Get auth token
        const storedToken = (await SecureStore.getItemAsync("auth_token")) || token;

        // Start location tracking
        const apiUrl = `${API_URL_APP}/api/v1/update-driver-location`;
        await locationService.startTracking(apiUrl, storedToken);

        // Call notifications setup every 60 seconds if needed
        intervalId = setInterval(async () => {
          try {
            await initializeNotifications(token);
            await requestAppPermissions();
          } catch (err) {
            console.error("Error in interval notifications setup:", err);
          }
        }, 30000);

      } catch (error) {
        console.error("Error in initial setup:", error);
      }
    };

    setup();

    // Cleanup on unmount
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [token]);

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="splash"
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#fff" },
        }}
      >
        <Stack.Screen name="splash" component={SplashScreen} />
        <Stack.Screen name="AuthLogin" component={LoginScreen} />
        <Stack.Screen name="Signup" component={SignupScreen} />
        <Stack.Screen name="addVehcile" component={AddVehicle} />
        <Stack.Screen name="bankAdd" component={AddBank} />
        <Stack.Screen name="wait_screen" component={WaitScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="OnboardScreen" component={OnboardScreen} />
        <Stack.Screen name="Account" component={Profile} />
        <Stack.Screen name="RideDetails" component={RideDetails} />
        <Stack.Screen name="Add" component={Driver_Post} />
        <Stack.Screen name="Reserve" component={Reserve} />
        <Stack.Screen name="DriverPostDetails" component={ReserveRideDetails} />
        <Stack.Screen name="ReserveRideDetailsAssigned" component={ReserveRideDetailsAssigned}/>
        <Stack.Screen name="TaxiSafarView" component={TaxiSafarView}/>
        <Stack.Screen name="recharge" component={RechargeScreen}/>
        <Stack.Screen name="chat" component={Chat} />
        <Stack.Screen name="ChatBox" component={ChatBox} />
        <Stack.Screen name="wallet" component={WalletScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
