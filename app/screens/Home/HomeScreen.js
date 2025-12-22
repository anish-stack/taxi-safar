// screens/HomeScreen.js
import React, {
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  AppState,
  TouchableOpacity,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import useDriverStore from "../../store/driver.store";
import loginStore from "../../store/auth.store";
import { fetchWithRetry } from "../../utils/fetchWithRetry";
import { API_URL_APP } from "../../constant/api";
import Layout from "../common/layout";
import DriverMap from "../common/driver.map";
import Categories from "../common/Categories";
import RideFilterDropdown from "./RideFilterDropdown";
import DriverPostCard from "../Reserve/DriverPostCard";
import TaxiSafarTripCard from "../Reserve/TaxiSafarTripCard";

const ITEMS_PER_PAGE = 50;
const SCROLL_THRESHOLD = 0.5;
const DEBOUNCE_DELAY = 300;

const FILTER_OPTIONS = ["All Rides", "Driver Post Rides", "Taxi Safar Rides"];

const isFutureRideIST = (pickupDate, pickupTime) => {
  if (!pickupDate || !pickupTime) return false;
  const dateObj = new Date(pickupDate);
  const [hours, minutes] = pickupTime.split(":").map(Number);
  dateObj.setHours(hours, minutes, 0, 0);
  const now = new Date();
  return dateObj.getTime() > now.getTime();
};

// Skeleton Loading Component
const SkeletonCard = () => (
  <View style={styles.skeletonCard}>
    <View style={styles.skeletonHeader}>
      <View style={styles.skeletonCircle} />
      <View style={styles.skeletonTextBlock}>
        <View style={[styles.skeletonLine, { width: '60%' }]} />
        <View style={[styles.skeletonLine, { width: '40%', marginTop: 8 }]} />
      </View>
    </View>
    <View style={styles.skeletonBody}>
      <View style={[styles.skeletonLine, { width: '90%' }]} />
      <View style={[styles.skeletonLine, { width: '70%', marginTop: 8 }]} />
      <View style={[styles.skeletonLine, { width: '80%', marginTop: 8 }]} />
    </View>
    <View style={styles.skeletonFooter}>
      <View style={[styles.skeletonButton, { width: '45%' }]} />
      <View style={[styles.skeletonButton, { width: '45%' }]} />
    </View>
  </View>
);

const SkeletonList = () => (
  <View style={styles.skeletonContainer}>
    {[1, 2, 3, 4].map((i) => (
      <SkeletonCard key={i} />
    ))}
  </View>
);

// Memoized Card Components
const MemoizedDriverPostCard = React.memo(DriverPostCard, (prev, next) => {
  return (
    prev.trip._id === next.trip._id &&
    prev.trip._uniqueId === next.trip._uniqueId
  );
});

const MemoizedTaxiSafarTripCard = React.memo(
  TaxiSafarTripCard,
  (prev, next) => {
    return (
      prev.trip._id === next.trip._id &&
      prev.trip._uniqueId === next.trip._uniqueId
    );
  }
);

export default function HomeScreen({ route }) {
  const { driver, fetchDriverDetails } = useDriverStore();
  const { token } = loginStore();

  const {
    setIsDriverOnline,
    startFloatingWidget,
    startPoolingService,
    stopPoolingService,
    stopFloatingWidget,
    requestOverlayPermission,
  } = route.params || {};

  const [taxiSafarTrips, setTaxiSafarTrips] = useState([]);
  const [taxiPage, setTaxiPage] = useState(1);
  const [hasMoreTaxi, setHasMoreTaxi] = useState(true);

  const [driverPosts, setDriverPosts] = useState([]);
  const [driverPage, setDriverPage] = useState(1);
  const [hasMoreDriver, setHasMoreDriver] = useState(true);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState("All Rides");

  const intervalRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);
  const fetchTimeoutRef = useRef(null);
  const lastFetchTimeRef = useRef(0);

  // Initialize services when driver goes online
  useEffect(() => {
    if (driver?.is_online !== undefined) {
      setIsDriverOnline?.(driver.is_online);

      if (driver.is_online) {
        const init = async () => {
          try {
            await startFloatingWidget?.();
            await startPoolingService?.();
          } catch (err) {
            // Silent error handling
          }
        };
        init();
      }
    }
  }, [
    driver?.is_online,
    setIsDriverOnline,
    startFloatingWidget,
    startPoolingService,
  ]);

  // Request overlay permission on mount
  useEffect(() => {
    requestOverlayPermission?.();
  }, [requestOverlayPermission]);


  /**
   * Fetch rides from both APIs
   */
  const fetchRides = useCallback(
    async (taxiPageNum = 1, driverPageNum = 1, isRefresh = false, isLoadMore = false) => {
      if (!token) return;

      lastFetchTimeRef.current = Date.now();

      try {
        if (isLoadMore) {
          setLoadingMore(true);
        } else if (!isRefresh && !loading) {
          setLoading(true);
        }
        if (isRefresh) setRefreshing(true);

        const [taxiRes, driverRes] = await Promise.all([
          fetchWithRetry(() =>
            fetch(
              `${API_URL_APP}/api/v1/Fetch-Near-By-Taxi-Safar-Rides?page=${taxiPageNum}&limit=${ITEMS_PER_PAGE}`,
              { headers: { Authorization: `Bearer ${token}` } }
            ).then((res) => res.json())
          ),
          fetchWithRetry(() =>
            fetch(
              `${API_URL_APP}/api/v1/fetch-nearby-rides?page=${driverPageNum}&limit=${ITEMS_PER_PAGE}`,
              { headers: { Authorization: `Bearer ${token}` } }
            ).then((res) => res.json())
          ),
        ]);

        const newTaxiTrips = (
          taxiRes?.success && Array.isArray(taxiRes.data) ? taxiRes.data : []
        )
          .filter((item) => item && item._id)
          .map((item) => ({
            ...item,
            _rideType: "taxi",
            _uniqueId: `taxi-${item._id}`,
          }));

        const newDriverPosts = (
          driverRes?.success && Array.isArray(driverRes.data)
            ? driverRes.data
            : []
        )
          .filter((item) => item && item._id)
          .filter((item) => isFutureRideIST(item.pickupDate, item.pickupTime))
          .map((item) => ({
            ...item,
            _rideType: "driver",
            _uniqueId: `driver-${item._id}`,
          }));

        const deduplicate = (existing, incoming) =>
          incoming.filter(
            (inc) => !existing.some((ex) => ex._uniqueId === inc._uniqueId)
          );

        if (isRefresh || taxiPageNum === 1) {
          setTaxiSafarTrips(newTaxiTrips);
        } else {
          setTaxiSafarTrips((prev) => [
            ...prev,
            ...deduplicate(prev, newTaxiTrips),
          ]);
        }

        if (isRefresh || driverPageNum === 1) {
          setDriverPosts(newDriverPosts);
        } else {
          setDriverPosts((prev) => [
            ...prev,
            ...deduplicate(prev, newDriverPosts),
          ]);
        }

        setHasMoreTaxi(newTaxiTrips.length === ITEMS_PER_PAGE);
        setHasMoreDriver(newDriverPosts.length === ITEMS_PER_PAGE);

      } catch (error) {
        // Silent error handling
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [token, loading, selectedFilter]
  );

  /**
   * Handle Load More button click
   */
  const handleLoadMore = useCallback(() => {
    if (loadingMore) return;

    const needsMoreTaxi = selectedFilter === "All Rides" || selectedFilter === "Taxi Safar Rides";
    const needsMoreDriver = selectedFilter === "All Rides" || selectedFilter === "Driver Post Rides";

    let nextTaxiPage = taxiPage;
    let nextDriverPage = driverPage;

    if (needsMoreTaxi && hasMoreTaxi) {
      nextTaxiPage = taxiPage + 1;
      setTaxiPage(nextTaxiPage);
    }

    if (needsMoreDriver && hasMoreDriver) {
      nextDriverPage = driverPage + 1;
      setDriverPage(nextDriverPage);
    }

    if ((needsMoreTaxi && hasMoreTaxi) || (needsMoreDriver && hasMoreDriver)) {
      fetchRides(nextTaxiPage, nextDriverPage, false, true);
    }
  }, [loadingMore, selectedFilter, taxiPage, driverPage, hasMoreTaxi, hasMoreDriver]);

  const onRefresh = useCallback(() => {
    setTaxiPage(1);
    setDriverPage(1);
    setHasMoreTaxi(true);
    setHasMoreDriver(true);
    setTaxiSafarTrips([]);
    setDriverPosts([]);
    requestOverlayPermission?.();
    fetchDriverDetails();
    fetchRides(1, 1, true);
  }, [fetchRides, requestOverlayPermission, fetchDriverDetails]);

  useFocusEffect(
    useCallback(() => {
      fetchDriverDetails();
      fetchRides(1, 1, false);

      const subscription = AppState.addEventListener("change", (nextState) => {
        if (
          appStateRef.current.match(/inactive|background/) &&
          nextState === "active"
        ) {
          fetchRides(1, 1, false);
        }
        appStateRef.current = nextState;
      });

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        if (fetchTimeoutRef.current) {
          clearTimeout(fetchTimeoutRef.current);
          fetchTimeoutRef.current = null;
        }
        subscription?.remove();
      };
    }, [fetchDriverDetails])
  );

  /**
   * Cleanup interval and timeout on unmount
   */
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
        fetchTimeoutRef.current = null;
      }
    };
  }, []);

  /**
   * Get filtered rides using useMemo
   */
  const filteredRides = useMemo(() => {
    let ridesToShow = [];

    if (selectedFilter === "Driver Post Rides") {
      ridesToShow = driverPosts.filter((item) => item?._rideType === "driver");
    } else if (selectedFilter === "Taxi Safar Rides") {
      ridesToShow = taxiSafarTrips.filter((item) => item?._rideType === "taxi");
    } else {
      const taxiRides = taxiSafarTrips.filter(
        (item) => item?._rideType === "taxi"
      );
      const driverRides = driverPosts.filter(
        (item) => item?._rideType === "driver"
      );

      ridesToShow = [...taxiRides, ...driverRides];
    }

    // Sort by pickupDate + pickupTime
    return ridesToShow.sort((a, b) => {
      const dateTimeA = new Date(
        `${a.pickupDate?.split("T")[0]}T${a.pickupTime}`
      );
      const dateTimeB = new Date(
        `${b.pickupDate?.split("T")[0]}T${b.pickupTime}`
      );

      return dateTimeA - dateTimeB; // ascending (earliest first)
    });
  }, [selectedFilter, taxiSafarTrips, driverPosts]);

  /**
   * Check if Load More button should be shown
   */
  const shouldShowLoadMore = useMemo(() => {
    if (selectedFilter === "All Rides") {
      return hasMoreTaxi || hasMoreDriver;
    } else if (selectedFilter === "Driver Post Rides") {
      return hasMoreDriver;
    } else if (selectedFilter === "Taxi Safar Rides") {
      return hasMoreTaxi;
    }
    return false;
  }, [selectedFilter, hasMoreTaxi, hasMoreDriver]);

  // Loading state with skeleton
  if (loading && taxiSafarTrips.length === 0 && driverPosts.length === 0) {
    return (
      <Layout
        scrollable={true}
        refreshing={false}
        onRefresh={null}
      >
        <DriverMap isRefresh={false} />
        <Categories isRefresh={false} />
        <View style={styles.contentArea}>
          <View style={styles.filterContainer}>
            <RideFilterDropdown
              options={FILTER_OPTIONS}
              selectedOption={selectedFilter}
              onSelect={setSelectedFilter}
            />
          </View>
          <SkeletonList />
        </View>
      </Layout>
    );
  }

  return (
    <Layout
      stopPoolingService={stopPoolingService}
      stopFloatingWidget={stopFloatingWidget}
      startFloatingWidget={startFloatingWidget}
      startPoolingService={startPoolingService}
      scrollable={true}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <DriverMap   refreshing={refreshing} />
      <Categories   refreshing={refreshing} />

      <View style={styles.contentArea}>
        <View style={styles.filterContainer}>
          <RideFilterDropdown
            options={FILTER_OPTIONS}
             refreshing={refreshing}
            selectedOption={selectedFilter}
            onSelect={setSelectedFilter}
          />
        </View>

        <View style={styles.listContent}>
          {filteredRides.length === 0 ? (
            <View style={styles.emptySection}>
              <Text style={styles.emptyText}>
                {selectedFilter === "All Rides"
                  ? "No rides available"
                  : selectedFilter === "Driver Post Rides"
                  ? "No driver posts available"
                  : "No Taxi Safar rides available"}
              </Text>
              <Text style={styles.emptySubtext}>New rides appear in real-time</Text>
            </View>
          ) : (
            <>
              {filteredRides.map((item, index) => {
                if (!item || !item._id) {
                  return null;
                }

                const key = item?._uniqueId || item?._id || `fallback-${index}`;

                if (item._rideType === "taxi") {
                  return <MemoizedTaxiSafarTripCard key={key} trip={item} />;
                } else if (item._rideType === "driver") {
                  return <MemoizedDriverPostCard key={key} trip={item} />;
                } else {
                  return <MemoizedDriverPostCard key={key} trip={item} />;
                }
              })}

              {/* Load More Button */}
              {shouldShowLoadMore && (
                <View style={styles.loadMoreContainer}>
                  <TouchableOpacity
                    style={[
                      styles.loadMoreButton,
                      loadingMore && styles.loadMoreButtonDisabled
                    ]}
                    onPress={handleLoadMore}
                    disabled={loadingMore}
                  >
                    {loadingMore ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.loadMoreText}>Load More Rides</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </View>
      </View>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  contentArea: {
    flex: 1,
    backgroundColor: "#eff1f3",
  },
  filterContainer: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#F2F5F6",
  },
  listContent: {
    paddingHorizontal: 8,
    paddingTop: 0,
    paddingBottom: 100,
  },
  emptySection: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 16,
  },
  emptyText: {
    fontSize: 15,
    color: "#374151",
    fontWeight: "600",
  },
  emptySubtext: {
    fontSize: 13,
    color: "#9CA3AF",
    marginTop: 4,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: "center",
  },
  // Load More Button Styles
  loadMoreContainer: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  loadMoreButton: {
    backgroundColor: "#DC2626",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 10,
    minWidth: 200,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loadMoreButtonDisabled: {
    backgroundColor: "#9CA3AF",
    opacity: 0.7,
  },
  loadMoreText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  // Skeleton Styles
  skeletonContainer: {
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  skeletonCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  skeletonHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  skeletonCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#E5E7EB",
  },
  skeletonTextBlock: {
    flex: 1,
    marginLeft: 12,
  },
  skeletonLine: {
    height: 12,
    backgroundColor: "#E5E7EB",
    borderRadius: 6,
  },
  skeletonBody: {
    marginBottom: 16,
  },
  skeletonFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  skeletonButton: {
    height: 40,
    backgroundColor: "#E5E7EB",
    borderRadius: 8,
  },
});