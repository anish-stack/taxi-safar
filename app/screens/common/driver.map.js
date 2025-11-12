import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Image } from 'react-native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import useDriverStore from '../../store/driver.store';
import { Colors } from '../../constant/ui';

export default function DriverMap() {
  const { location, is_online, driver ,toggleStatus } = useDriverStore();
  const [currentLocation, setCurrentLocation] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ Check online status: driver.is_online takes precedence
  const isDriverOnline =  is_online;

  // ✅ Fetch current location or use store location
  useEffect(() => {
    (async () => {
      try {
        if (location && Array.isArray(location) && location.length === 2) {
          setCurrentLocation({
            latitude: location[1],
            longitude: location[0],
          });
          setLoading(false);
          return;
        }

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.warn('Location permission not granted');
          setLoading(false);
          return;
        }

        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Highest,
        });

        setCurrentLocation({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
      } catch (error) {
        console.error('Error fetching location:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, [location ,toggleStatus]);

  // 🌀 Loading view
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00aaa9" />
        <Text style={styles.loadingText}>Getting current location...</Text>
      </View>
    );
  }

  // 🚫 Offline view
  if (!isDriverOnline) {
    return null
  }

  // 🗺️ Online: Show Map
  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude: currentLocation?.latitude || 28.7010783,
          longitude: currentLocation?.longitude || 77.1169517,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        showsUserLocation={true}
        followsUserLocation={true}
        showsMyLocationButton={true}
        showsCompass={true}
        showsScale={true}
        showsTraffic={false}
        showsBuildings={true}
        showsIndoors={true}
        loadingEnabled={true}
        loadingIndicatorColor={Colors.primary}
        customMapStyle={mapStyle}
        mapType="standard"
        rotateEnabled={true}
        scrollEnabled={true}
        zoomEnabled={true}
        pitchEnabled={false}
      >
        <Marker
          coordinate={currentLocation}
          title="You are here"
          description="Driver current location"
          pinColor={Colors.primary}
        />
        <Circle
          center={currentLocation}
          radius={200}
          strokeColor={Colors.primary}
          strokeWidth={2}
          fillColor="rgba(0, 170, 169, 0.15)"
        />
      </MapView>

      <View style={styles.overlay}>
        <Text style={styles.overlayText}>🔍 Searching for new rides nearby...</Text>
      </View>
    </View>
  );
}

// 🎨 Custom Map Style (Clean & Modern)
const mapStyle = [
  {
    featureType: 'poi',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'transit',
    elementType: 'labels.icon',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#ffffff' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.icon',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#c9e9ff' }],
  },
  {
    featureType: 'landscape',
    elementType: 'geometry',
    stylers: [{ color: '#f5f5f5' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#e5f4e3' }],
  },
];

// 🎨 Styles
const styles = StyleSheet.create({

  map: {
    position:'relative',
    width: '100%',
    height: 300,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#003873',
    fontSize: 16,
  },
  overlay: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: '#ffffffdd',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  overlayText: {
    color: '#003873',
    fontWeight: '600',
    fontSize: 14,
  },
  offlineContainer: {
    width: '100%',
    height: 300,
    backgroundColor: '#f0fffe',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  offlineImage: {
    width: 80,
    height: 80,
    marginBottom: 15,
    tintColor: '#00aaa9',
  },
  offlineTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#003873',
    marginBottom: 6,
  },
  offlineSubtitle: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
  },
});