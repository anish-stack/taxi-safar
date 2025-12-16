import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  ScrollView,
} from "react-native";
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from "react-native-maps";

import useDriverStore from "../../store/driver.store";
import { Colors } from "../../constant/ui";
import { getCurrentLocation } from "../../services/PermissionService";

const { width } = Dimensions.get("window");

// 16:9 Banner Height
const BANNER_HEIGHT = width * 0.45;

// Offline Banners
const OFFLINE_BANNERS = [
  { id: 1, image: require("./image1.png") },
  { id: 2, image: require("./image.png") },
];

const DEFAULT_COORDS = { latitude: 28.7041, longitude: 77.1025 };
const DEFAULT_RADIUS_KM = 5;

export default function DriverMap() {
  const { location, is_online, driver } = useDriverStore();

  // Use default location immediately, update later
  const [currentLocation, setCurrentLocation] = useState(DEFAULT_COORDS);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [locationReady, setLocationReady] = useState(false);

  const scrollRef = useRef(null);
  const intervalRef = useRef(null);
  const locationFetchedRef = useRef(false);

  const isDriverOnline = !!is_online;

  const currentRadius =
    (driver?.currentRadius > 0 ? driver.currentRadius : DEFAULT_RADIUS_KM) *
    1000;



  const fetchLocation = useCallback(async () => {
    // Prevent multiple simultaneous fetches
    if (locationFetchedRef.current) return;
    locationFetchedRef.current = true;

    try {
      let loc = null;

      // Priority 1: Use store location if available (fastest)
      if (location && Array.isArray(location) && location[0] && location[1]) {
        loc = { latitude: location[1], longitude: location[0] };
        console.log("📍 Using store location:", loc);
      }
      // Priority 2: Fetch fresh location (silent)
      else {
        console.log("📍 Fetching fresh location...");
        const fresh = await getCurrentLocation();
        if (fresh?.latitude && fresh?.longitude) {
          loc = fresh;
          console.log("📍 Fresh location acquired:", loc);
        }
      }

      // Update location silently (no loader shown)
      if (loc) {
        setCurrentLocation(loc);
        setLocationReady(true);
      } else {
        // Keep default location, mark as ready
        console.log("📍 Using default location");
        setLocationReady(true);
      }
    } catch (err) {
      console.error("❌ Location error:", err);
      // Keep default location on error
      setLocationReady(true);
    } finally {
      locationFetchedRef.current = false;
    }
  }, [location]);

  useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);

  useEffect(() => {
    if (isDriverOnline && !locationReady) {
      fetchLocation();
    }
  }, [isDriverOnline, locationReady, fetchLocation]);


  useEffect(() => {
    if (isDriverOnline) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setBannerIndex((prev) => {
        const next = (prev + 1) % OFFLINE_BANNERS.length;
        scrollRef.current?.scrollTo({
          x: next * width,
          animated: true,
        });
        return next;
      });
    }, 800000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isDriverOnline]);

// -----------------------------
// 🚀 OFFLINE UI (Card Slider)
// -----------------------------
if (!isDriverOnline) {
  return (
    <View style={styles.offlineWrapper}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        decelerationRate="fast"
        snapToInterval={width - 32}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(
            e.nativeEvent.contentOffset.x / (width - 32)
          );
          setBannerIndex(idx);
        }}
      >
        {OFFLINE_BANNERS.map((banner) => (
          <View key={banner.id} style={styles.bannerCard}>
            <Image
              source={banner.image}
              style={styles.bannerImage}
              resizeMode="cover"
            />
          </View>
        ))}
      </ScrollView>

      {/* Pagination */}
      <View style={styles.pagination}>
        {OFFLINE_BANNERS.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              bannerIndex === i && styles.dotActive,
            ]}
          />
        ))}
      </View>
    </View>
  );
}


  // -----------------------------
  // 🚀 ONLINE UI (Map + Radius + Car)
  // No loading screen - show immediately
  // -----------------------------
  return (
    <View style={styles.mapContainer}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          ...currentLocation,
          latitudeDelta: 0.015,
          longitudeDelta: 0.012,
        }}
        region={{
          ...currentLocation,
          latitudeDelta: 0.015,
          longitudeDelta: 0.012,
        }}
        showsUserLocation={false} // Disable default blue dot
        followsUserLocation={true}
        loadingEnabled={false}
        loadingIndicatorColor="transparent"
        loadingBackgroundColor="transparent"
        moveOnMarkerPress={false}
        toolbarEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
      >
        {currentLocation && (
          <Marker
            coordinate={{
              latitude: currentLocation.latitude,
              longitude: currentLocation.longitude,
            }}
          >
            <Image
              source={require("../../assets/car-marker.png")}
              style={{ width: 24, height: 24 }}
            />
          </Marker>
        )}

        {/* Search Radius Circle */}
        <Circle
          center={currentLocation}
          radius={currentRadius}
          strokeColor={Colors.primary}
          strokeWidth={2.5}
          fillColor="rgba(0, 170, 169, 0.090)"
        />
      </MapView>

      {/* Silent location indicator (optional) */}
      {!locationReady && (
        <View style={styles.silentIndicator}>
          <View style={styles.pulsingDot} />
        </View>
      )}
    </View>
  );
}

// -----------------------------------------
// 🎨 Styles
// -----------------------------------------
const styles = StyleSheet.create({
  mapContainer: {
    height: BANNER_HEIGHT,
    marginVertical: 12,
  },

  map: {
    ...StyleSheet.absoluteFillObject,
  },
offlineWrapper: {
  marginTop: 5,
  marginLeft:-15,
},

bannerCard: {
  padding:4,
  width: width,
  height: BANNER_HEIGHT,
  borderRadius: 12,
  overflow: "hidden",

  backgroundColor: "#fff",
  elevation:1,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.12,
  shadowRadius: 8,
},

bannerImage: {
  width: "100%",
  height: "100%",
},

pagination: {
  flexDirection: "row",
  justifyContent: "center",
 
},

dot: {
  width: 8,
  height: 8,
  borderRadius: 4,
  backgroundColor: "#D1D5DB",
  marginHorizontal: 4,
},

dotActive: {
  width: 24,
  backgroundColor: "#111",
  borderRadius: 6,
},


  // Silent loading indicator (subtle)
  silentIndicator: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "rgba(220, 38, 38, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },

  pulsingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#fff",
  },
});
