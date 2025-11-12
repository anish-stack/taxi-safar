import React, { useEffect } from 'react';
import { View, Platform, StatusBar as RNStatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { requestAppPermissions } from './services/PermissionService';
import { initializeNotifications } from './utils/initNotifications';

// Screens
import SplashScreen from './screens/common/SplashScreen';
import LoginScreen from './screens/auth/login/LoginScreen';
import SignupScreen from './screens/auth/register/signup';
import AddVehicle from './screens/auth/login/addVehcile';
import AddBank from './screens/auth/login/bankAdd';
import WaitScreen from './screens/auth/login/WaitScreen';
import HomeScreen from './screens/Home/HomeScreen';
import Profile from './screens/pages/Profile';
import RideDetails from './screens/pages/RideDetails';

const Stack = createNativeStackNavigator();

export default function App() {
  useEffect(() => {
    initializeNotifications();
    requestAppPermissions();
  }, []);

  return (


      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="splash"
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#fff' },
          }}
        >
          <Stack.Screen name="splash" component={SplashScreen} />
          <Stack.Screen name="AuthLogin" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
          <Stack.Screen name="addVehcile" component={AddVehicle} />
          <Stack.Screen name="bankAdd" component={AddBank} />
          <Stack.Screen name="wait_screen" component={WaitScreen} />
          <Stack.Screen name="Home" component={HomeScreen}/>

          <Stack.Screen name="Account" component={Profile}/>
          <Stack.Screen name="RideDetails" component={RideDetails} />

       
        </Stack.Navigator>
      </NavigationContainer>
  );
}
