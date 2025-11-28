import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Image,
  Dimensions,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import useDriverStore from '../../store/driver.store';
import { Colors } from '../../constant/ui';
import { getCurrentLocation } from '../../services/PermissionService';

const { width } = Dimensions.get('window');

const offlineBanners = [
  {
    image:
      'https://i.ytimg.com/vi/Bp0uMcrgils/hq720.jpg',
  },
  {
    image:
      'https://i.ytimg.com/vi/PdtgpstgEZo/hq720.jpg',
  },
];

export default function DriverMap() {
  const { location, is_online } = useDriverStore();
  const [currentLocation, setCurrentLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bannerIndex, setBannerIndex] = useState(0);
  const scrollViewRef = useRef(null);
  const isDriverOnline = is_online;

  // Auto scroll banners
  useEffect(() => {
    if (isDriverOnline || offlineBanners.length <= 1) return;

    const timer = setInterval(() => {
      setBannerIndex((prev) => {
        const next = prev === offlineBanners.length - 1 ? 0 : prev + 1;
        scrollViewRef.current?.scrollTo({ x: next * width, animated: true });
        return next;
      });
    }, 4000);

    return () => clearInterval(timer);
  }, [isDriverOnline]);

  // Manual scroll - update dot index
  const handleScroll = (event) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    setBannerIndex(index);
  };

  // ---- NEW CLEAN LOCATION HANDLER (using getCurrentLocation only) ----
  useEffect(() => {
    const loadLocation = async () => {
      try {
        // If user already has location from store
        if (location && Array.isArray(location) && location.length === 2) {
          setCurrentLocation({
            latitude: location[1],
            longitude: location[0],
          });
          setLoading(false);
          return;
        }

        // Fetch current location from your service
        const loc = await getCurrentLocation();
        if (loc) {
          setCurrentLocation({
            latitude: loc.latitude,
            longitude: loc.longitude,
          });
        }
      } catch (err) {
        console.log('Location Error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadLocation();
  }, [location]);

  // Loading screen
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00aaa9" />
        <Text style={styles.loadingText}>Getting current location...</Text>
      </View>
    );
  }

  // OFFLINE UI (Slider)
  if (!isDriverOnline) {
    return (
      <View style={styles.offlineContainer}>
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          style={{ flex: 1 }}
        >
          {offlineBanners.map((banner, index) => (
            <View key={index} style={styles.slide}>
              <Image
                source={{ uri: banner.image }}
                style={styles.bannerImage}
                resizeMode="cover"
              />
            </View>
          ))}
        </ScrollView>

        {/* Dots */}
        <View style={styles.pagination}>
          {offlineBanners.map((_, idx) => (
            <View
              key={idx}
              style={[
                styles.dot,
                bannerIndex === idx ? styles.activeDot : styles.inactiveDot,
              ]}
            />
          ))}
        </View>
      </View>
    );
  }

  // ONLINE UI (Map)
  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        region={{
          latitude: currentLocation?.latitude || 28.7010783,
          longitude: currentLocation?.longitude || 77.1169517,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        showsUserLocation={true}
        followsUserLocation={true}
      >
        {currentLocation && (
          <>
            <Marker coordinate={currentLocation}>
              <Image
                source={require('../../assets/car-marker.png')}
                style={{ width: 40, height: 40 }}
              />
            </Marker>

            <Circle
              center={currentLocation}
              radius={200}
              strokeColor={Colors.primary}
              strokeWidth={2}
              fillColor="rgba(0, 170, 169, 0.15)"
            />
          </>
        )}
      </MapView>

      <View style={styles.overlay}>
        <Text style={styles.overlayText}>Searching for new rides nearby...</Text>
      </View>
    </View>
  );
}

// ----------------- Styles -----------------
const styles = StyleSheet.create({
  container: {
    height: 300,
    borderRadius: 16,
    overflow: 'hidden',
    marginVertical: 10,
  },
  loadingContainer: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fffe',
  },
  loadingText: {
    marginTop: 10,
    color: '#003873',
    fontSize: 16,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  offlineContainer: {
    height: 270,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  slide: {
    width,
    height: '100%',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  pagination: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#fff',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  inactiveDot: {
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  overlay: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: '#ffffffdd',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  overlayText: {
    color: '#003873',
    fontWeight: '600',
    fontSize: 14,
  },
});
