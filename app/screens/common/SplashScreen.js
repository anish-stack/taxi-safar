import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Image, StatusBar } from 'react-native';
import logo from '../../assets/taxisafar-logo.png';
import { Colors } from '../../constant/ui';
import loginStore from '../../store/auth.store';

export default function SplashScreen({ navigation }) {
  const { token, authenticated, loading } = loginStore();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (authenticated && token) {
        navigation.replace('Home'); 
      } else {
        navigation.replace('AuthLogin'); 
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [authenticated, token]);

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={Colors.primary} barStyle="light-content" />
      <Image source={logo} style={styles.logo} resizeMode="contain" />
    
      <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 20 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 160,
    height: 160,
  },
  appName: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#003873',
    marginTop: 10,
    letterSpacing: 1,
  },
  text: {
    marginTop: 10,
    fontSize: 16,
    color: Colors.black,
    fontStyle: 'italic',
  },
});
