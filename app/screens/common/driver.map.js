import React, { useEffect, useState, useRef, useCallback } from "react";
import { View, StyleSheet, Image, Dimensions, ScrollView } from "react-native";
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from "react-native-maps";
import { scale, verticalScale, moderateScale } from "react-native-size-matters";
import axios from "axios";

import useDriverStore from "../../store/driver.store";
import { Colors } from "../../constant/ui";
import { getCurrentLocation } from "../../services/PermissionService";
import { API_URL_APP } from "../../constant/api";

const { width, height } = Dimensions.get("window");

const isSmallDevice = width < 375; // e.g. iPhone SE, older Android
const isMediumDevice = width >= 375 && width < 428; // Most common (Pixel, iPhone 12–14)
const isLargeDevice = width >= 428; // Large phones: Realme 11 Pro, S23 Ultra, etc.
const isTablet = width >= 768; // iPad, Galaxy Tab
/* -----------------------------------
   Constants
----------------------------------- */
const BANNER_HEIGHT = verticalScale(130);

const FALLBACK_BANNERS = [
  { id: 1, image: require("./image1.png") },
  { id: 2, image: require("./image.png") },
];

const DEFAULT_COORDS = { latitude: 28.7041, longitude: 77.1025 };
const DEFAULT_RADIUS_KM = 5;

/* -----------------------------------
   Component
----------------------------------- */
export default function DriverMap({  refreshing }) {
  const { location, is_online, driver } = useDriverStore();

  const [currentLocation, setCurrentLocation] = useState(DEFAULT_COORDS);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [locationReady, setLocationReady] = useState(false);
  const [banners, setBanners] = useState(FALLBACK_BANNERS);

  const scrollRef = useRef(null);
  const intervalRef = useRef(null);
  const locationFetchingRef = useRef(false);

  const isDriverOnline = Boolean(is_online);

  const currentRadius =
    (driver?.currentRadius > 0 ? driver.currentRadius : DEFAULT_RADIUS_KM) *
    1000;

  /* -----------------------------------
     Fetch Banners (API)
  ----------------------------------- */
  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const res = await axios.get(
          `${API_URL_APP}/api/v1/admin/banner?active=true`
        );

        if (res?.data?.data?.length) {
          const apiBanners = res.data.data.map((item) => ({
            id: item._id,
            image: { uri: item.url },
          }));

          setBanners(apiBanners);
        }
      } catch (err) {
        setBanners(FALLBACK_BANNERS);
      }
    };

    fetchBanners();
  }, [refreshing]);

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
  }, [location ,refreshing]);

  useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);

  /* -----------------------------------
     Offline Banner Auto Scroll
  ----------------------------------- */
  useEffect(() => {
    if (isDriverOnline || banners.length <= 1) {
      intervalRef.current && clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setBannerIndex((prev) => {
        const next = (prev + 1) % banners.length;
        scrollRef.current?.scrollTo({
          x: next * width,
          animated: true,
        });
        return next;
      });
    }, 8000);

    return () => clearInterval(intervalRef.current);
  }, [isDriverOnline, banners]);

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
            const index = Math.round(e.nativeEvent.contentOffset.x / width);
            setBannerIndex(index);
          }}
        >
          {banners.map((banner) => (
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
          {banners.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, bannerIndex === i && styles.dotActive]}
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
        {/* <Marker coordinate={currentLocation}>
          <Image
            source={require("./rec.png")}
            style={styles.marker}
          />
        </Marker> */}

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
    // marginVertical: verticalScale(12),
  },

  map: {
    ...StyleSheet.absoluteFillObject,
  },

  marker: {
    width: scale(24),
    height: scale(24),
  },

  offlineWrapper: {
    padding: isSmallDevice
      ? scale(2)
      : isMediumDevice
      ? scale(4)
      : isLargeDevice
      ? scale(6)
      : scale(8),
    marginTop: isSmallDevice
      ? verticalScale(4)
      : isMediumDevice
      ? verticalScale(6)
      : isLargeDevice
      ? verticalScale(8)
      : verticalScale(12),
  },

  bannerCard: {
   width: isSmallDevice
      ? scale(width * 0.95)
      : isMediumDevice
      ? scale(width * 0.83)
      : isLargeDevice
      ? scale(width * 0.9)
      : scale(width * 0.7), // tablet
    height: isSmallDevice
      ? verticalScale(120)
      : isMediumDevice
      ? verticalScale(130)
      : isLargeDevice
      ? verticalScale(120)
      : verticalScale(150),
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
