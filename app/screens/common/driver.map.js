import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  StyleSheet,
  Image,
  Dimensions,
  ScrollView,
} from "react-native";
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from "react-native-maps";
import { scale, verticalScale, moderateScale } from "react-native-size-matters";

import useDriverStore from "../../store/driver.store";
import { Colors } from "../../constant/ui";
import { getCurrentLocation } from "../../services/PermissionService";

const { width } = Dimensions.get("window");

/* -----------------------------------
   Constants
----------------------------------- */
const BANNER_HEIGHT = verticalScale(130);

const OFFLINE_BANNERS = [
  { id: 1, image: require("./image1.png") },
  { id: 2, image: require("./image.png") },
];

const DEFAULT_COORDS = { latitude: 28.7041, longitude: 77.1025 };
const DEFAULT_RADIUS_KM = 5;

/* -----------------------------------
   Component
----------------------------------- */
export default function DriverMap() {
  const { location, is_online, driver } = useDriverStore();

  const [currentLocation, setCurrentLocation] = useState(DEFAULT_COORDS);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [locationReady, setLocationReady] = useState(false);

  const scrollRef = useRef(null);
  const intervalRef = useRef(null);
  const locationFetchingRef = useRef(false);

  const isDriverOnline = Boolean(is_online);

  const currentRadius =
    (driver?.currentRadius > 0
      ? driver.currentRadius
      : DEFAULT_RADIUS_KM) * 1000;

  /* -----------------------------------
     Fetch Location (Silent)
  ----------------------------------- */
  const fetchLocation = useCallback(async () => {
    if (locationFetchingRef.current) return;
    locationFetchingRef.current = true;

    try {
      let loc = null;

      if (location?.[0] && location?.[1]) {
        loc = { latitude: location[1], longitude: location[0] };
      } else {
        const fresh = await getCurrentLocation();
        if (fresh?.latitude && fresh?.longitude) {
          loc = fresh;
        }
      }

      if (loc) setCurrentLocation(loc);
      setLocationReady(true);
    } catch (e) {
      setLocationReady(true);
    } finally {
      locationFetchingRef.current = false;
    }
  }, [location]);

  useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);

  /* -----------------------------------
     Offline Banner Auto Scroll
  ----------------------------------- */
  useEffect(() => {
    if (isDriverOnline) {
      intervalRef.current && clearInterval(intervalRef.current);
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
    }, 8000);

    return () => clearInterval(intervalRef.current);
  }, [isDriverOnline]);

  /* -----------------------------------
     OFFLINE UI
  ----------------------------------- */
  if (!isDriverOnline) {
    return (
      <View style={styles.offlineWrapper}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            const index = Math.round(
              e.nativeEvent.contentOffset.x / width
            );
            setBannerIndex(index);
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

  /* -----------------------------------
     ONLINE MAP UI
  ----------------------------------- */
  return (
    <View style={styles.mapContainer}>
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
        rotateEnabled={false}
        pitchEnabled={false}
        toolbarEnabled={false}
      >
        <Marker coordinate={currentLocation}>
          <Image
            source={require("../../assets/car-marker.png")}
            style={styles.marker}
          />
        </Marker>

        <Circle
          center={currentLocation}
          radius={currentRadius}
          strokeColor={Colors.primary}
          strokeWidth={moderateScale(2)}
          fillColor="rgba(0,170,169,0.1)"
        />
      </MapView>

      {!locationReady && (
        <View style={styles.silentIndicator}>
          <View style={styles.pulsingDot} />
        </View>
      )}
    </View>
  );
}

/* -----------------------------------
   Styles (Responsive)
----------------------------------- */
const styles = StyleSheet.create({
  mapContainer: {
    height: BANNER_HEIGHT,
    marginVertical: verticalScale(12),
  },

  map: {
    ...StyleSheet.absoluteFillObject,
  },

  marker: {
    width: scale(24),
    height: scale(24),
  },

  offlineWrapper: {
    padding:scale(2),
    marginTop: verticalScale(6),
  },

  bannerCard: {
    width:moderateScale(width * 0.89),
    height: BANNER_HEIGHT,
    borderRadius: moderateScale(12),
    overflow: "hidden",
    backgroundColor: "#fff",
    marginHorizontal: scale(2),
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: verticalScale(3) },
    shadowOpacity: 0.12,
    shadowRadius: moderateScale(6),
  },

  bannerImage: {
    width: "100%",
    height: "100%",
  },

  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: verticalScale(8),
  },

  dot: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    backgroundColor: "#D1D5DB",
    marginHorizontal: scale(4),
  },

  dotActive: {
    width: scale(24),
    backgroundColor: "#111",
  },

  silentIndicator: {
    position: "absolute",
    top: verticalScale(12),
    right: scale(12),
    width: scale(12),
    height: scale(12),
    borderRadius: scale(6),
    backgroundColor: "rgba(220,38,38,0.8)",
    justifyContent: "center",
    alignItems: "center",
  },

  pulsingDot: {
    width: scale(6),
    height: scale(6),
    borderRadius: scale(3),
    backgroundColor: "#fff",
  },
});
