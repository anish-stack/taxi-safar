import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Image,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from "react-native-maps";
import useDriverStore from "../../store/driver.store";
import { Colors } from "../../constant/ui";
import { getCurrentLocation } from "../../services/PermissionService";

const { width } = Dimensions.get("window");

const OFFLINE_BANNERS = [
  { id: 1, image: "https://i.ytimg.com/vi/Bp0uMcrgils/hq720.jpg" },
  { id: 2, image: "https://i.ytimg.com/vi/PdtgpstgEZo/hq720.jpg" },
];

const DEFAULT_COORDS = { latitude: 28.7041, longitude: 77.1025 };
const DEFAULT_RADIUS_KM = 5;

export default function DriverMap() {
  const { location, is_online, driver } = useDriverStore();
  const [currentLocation, setCurrentLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bannerIndex, setBannerIndex] = useState(0);
  const scrollViewRef = useRef(null);
  const intervalRef = useRef(null);

  const isDriverOnline = !!is_online;
  const currentRadius =
    (driver?.currentRadius > 0 ? driver.currentRadius : DEFAULT_RADIUS_KM) *
    1000; // Convert km → meters

  // Auto-scroll banners when offline
  useEffect(() => {
    if (isDriverOnline || OFFLINE_BANNERS.length <= 1) {
      intervalRef.current && clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setBannerIndex((prev) => {
        const next = (prev + 1) % OFFLINE_BANNERS.length;
        scrollViewRef.current?.scrollTo({ x: next * width, animated: true });
        return next;
      });
    }, 4000);

    return () => intervalRef.current && clearInterval(intervalRef.current);
  }, [isDriverOnline]);

  const handleScroll = (event) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / width);
    setBannerIndex(index);
  };

  // Get location with fallback
  const fetchLocation = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let loc = null;

      // Priority 1: Use location from store
      if (
        location &&
        Array.isArray(location) &&
        location.length === 2 &&
        location[0] &&
        location[1]
      ) {
        loc = { latitude: location[1], longitude: location[0] };
      } else {
        // Priority 2: Get fresh location
        const freshLoc = await getCurrentLocation();
        if (freshLoc?.latitude && freshLoc?.longitude) {
          loc = freshLoc;
        }
      }

      if (loc) {
        setCurrentLocation(loc);
      } else {
        throw new Error("Unable to get your location");
      }
    } catch (err) {
      console.error("Location fetch error:", err);
      setError(err.message || "Location access denied or unavailable");
      setCurrentLocation(DEFAULT_COORDS); // Fallback
    } finally {
      setLoading(false);
    }
  }, [location]);

  useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);

  // Re-fetch location if store updates (optional)
  useEffect(() => {
    if (location && !currentLocation) {
      fetchLocation();
    }
  }, [location]);

  // Show error alert once
  useEffect(() => {
    if (error && !loading) {
      Alert.alert("Location Error", error + "\nUsing default location.", [
        { text: "Retry", onPress: fetchLocation },
      ]);
    }
  }, [error, loading]);

  // Loading State
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Fetching your location...</Text>
      </View>
    );
  }

  // Offline State - Beautiful Banner Slider
  if (!isDriverOnline) {
    return (
      <View style={styles.offlineContainer}>
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          decelerationRate="fast"
          snapToInterval={width}
        >
          {OFFLINE_BANNERS.map((banner, index) => (
            <View key={banner.id} style={styles.slide}>
              <Image
                source={{ uri: banner.image }}
                style={styles.bannerImage}
                resizeMode="cover"
              />
              <View style={styles.offlineOverlay}>
                <Text style={styles.offlineTitle}>You're Offline</Text>
                <Text style={styles.offlineSubtitle}>
                  Go online to start accepting rides
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Pagination Dots */}
        <View style={styles.pagination}>
          {OFFLINE_BANNERS.map((_, idx) => (
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

  // Online State - Map with Dynamic Radius
  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        region={{
          ...currentLocation,
          latitudeDelta: 0.015,
          longitudeDelta: 0.012,
        }}
        showsUserLocation
        followsUserLocation
        loadingEnabled
      >
        {currentLocation && (
          <>
            {/* Custom Car Marker */}
            <Marker coordinate={currentLocation} anchor={{ x: 0.5, y: 0.5 }}>
              <View style={styles.carContainer}>
                <Image
                  source={require("../../assets/car-marker.png")}
                  style={styles.carMarker}
                  resizeMode="contain"
                />
              </View>
            </Marker>

            {/* Dynamic Service Radius Circle */}
            <Circle
              key={currentRadius} // Force re-render on radius change
              center={currentLocation}
              radius={currentRadius}
              strokeColor={Colors.primary}
              strokeWidth={2.5}
              fillColor="rgba(0, 170, 169, 0.2)"
              zIndex={-1}
            />
          </>
        )}
      </MapView>
    </View>
  );
}

// Enhanced Styles
const styles = StyleSheet.create({
  container: {
    height: 420,
    overflow: "hidden",
    marginVertical: 12,
  },
  loadingContainer: {
    height: 320,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fffe",
    borderRadius: 20,
  },
  loadingText: {
    marginTop: 16,
    color: "#003873",
    fontSize: 16,
    fontWeight: "500",
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  carContainer: {
    // backgroundColor: 'white',
    padding: 6,
    // borderRadius: 30,
    elevation: 5,
  },
  carMarker: {
    width: 22,
    height: 22,
  },
  statusBadge: {
    position: "absolute",
    top: 16,
    left: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 30,
    elevation: 6,
  },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#4CAF50",
    marginRight: 8,
  },
  statusText: {
    fontWeight: "600",
    color: "#003873",
    fontSize: 14,
  },
  radiusInfo: {
    position: "absolute",
    bottom: 16,
    alignSelf: "center",
    backgroundColor: "rgba(0, 170, 169, 0.9)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 30,
  },
  radiusText: {
    color: "white",
    fontWeight: "700",
    fontSize: 13,
  },
  offlineContainer: {
    height: 300,
    // borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#000",
    elevation: 6,
  },
  slide: {
    width,
    height: "100%",
    position: "relative",
  },
  bannerImage: {
    width: "100%",
    height: "100%",
  },
  offlineOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },
  offlineTitle: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "bold",
    textAlign: "center",
  },
  offlineSubtitle: {
    color: "#ddd",
    fontSize: 16,
    marginTop: 8,
    textAlign: "center",
  },
  pagination: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    marginHorizontal: 5,
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  activeDot: {
    backgroundColor: "#fff",
    width: 24,
    borderRadius: 6,
  },
});
