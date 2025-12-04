// screens/HomeScreen.js
import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  AppState,
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

const ITEMS_PER_PAGE = 10;
const AUTO_REFRESH_INTERVAL = 60000;
const SCROLL_THRESHOLD = 0.5;

const FILTER_OPTIONS = [
  "All Rides",
  "Driver Post Rides", 
  "Taxi Safar Rides"
];

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
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState("All Rides");

  const intervalRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);

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
            console.log("Service initialization error:", err);
          }
        };
        init();
      }
    }
  }, [driver?.is_online]);

  // Request overlay permission on mount
  useEffect(() => {
    requestOverlayPermission?.();
  }, [requestOverlayPermission]);

  /**
   * Fetch rides from both APIs
   */
  const fetchRides = useCallback(
    async (taxiPageNum = 1, driverPageNum = 1, isRefresh = false) => {
      if (!token) return;

      try {
        if (!isRefresh && !loading) setLoading(true);
        if (isRefresh) setRefreshing(true);

        const [taxiRes, driverRes] = await Promise.all([
          // Taxi Safar API
          fetchWithRetry(() =>
            fetch(
              `${API_URL_APP}/api/v1/Fetch-Near-By-Taxi-Safar-Rides?page=${taxiPageNum}&limit=${ITEMS_PER_PAGE}`,
              { headers: { Authorization: `Bearer ${token}` } }
            ).then((res) => res.json())
          ),
          // Driver Post API
          fetchWithRetry(() =>
            fetch(
              `${API_URL_APP}/api/v1/fetch-nearby-rides?page=${driverPageNum}&limit=${ITEMS_PER_PAGE}`,
              { headers: { Authorization: `Bearer ${token}` } }
            ).then((res) => res.json())
          ),
        ]);

        console.log("📊 Taxi Safar Response:", {
          success: taxiRes?.success,
          count: taxiRes?.data?.length || 0,
          sample: taxiRes?.data?.[0]?._id,
        });

        console.log("📊 Driver Post Response:", {
          success: driverRes?.success,
          count: driverRes?.data?.length || 0,
          sample: driverRes?.data?.[0]?._id,
        });

        // ✅ Process Taxi Safar rides - add UNIQUE identifier
        const newTaxiTrips = (taxiRes?.success && Array.isArray(taxiRes.data) 
          ? taxiRes.data 
          : []
        )
          .filter(item => item && item._id) // Remove invalid items
          .map((item) => ({
            ...item,
            _rideType: "taxi", // ← Taxi Safar identifier
            _uniqueId: `taxi-${item._id}`, // ← Extra unique ID for safety
          }));

        // ✅ Process Driver Post rides - add UNIQUE identifier
        const newDriverPosts = (driverRes?.success && Array.isArray(driverRes.data)
          ? driverRes.data
          : []
        )
          .filter(item => item && item._id) // Remove invalid items
          .map((item) => ({
            ...item,
            _rideType: "driver", // ← Driver Post identifier
            _uniqueId: `driver-${item._id}`, // ← Extra unique ID for safety
          }));

        console.log("✅ Processed Taxi Trips:", newTaxiTrips.length);
        console.log("✅ Processed Driver Posts:", newDriverPosts.length);

        // Deduplicate function
        const deduplicate = (existing, incoming) =>
          incoming.filter(
            (inc) => !existing.some((ex) => ex._uniqueId === inc._uniqueId)
          );

        // Update Taxi Safar state
        if (isRefresh || taxiPageNum === 1) {
          setTaxiSafarTrips(newTaxiTrips);
        } else {
          setTaxiSafarTrips((prev) => [
            ...prev,
            ...deduplicate(prev, newTaxiTrips),
          ]);
        }

        // Update Driver Post state
        if (isRefresh || driverPageNum === 1) {
          setDriverPosts(newDriverPosts);
        } else {
          setDriverPosts((prev) => [
            ...prev,
            ...deduplicate(prev, newDriverPosts),
          ]);
        }

        // Update pagination flags
        setHasMoreTaxi(newTaxiTrips.length === ITEMS_PER_PAGE);
        setHasMoreDriver(newDriverPosts.length === ITEMS_PER_PAGE);

        // Increment pages if not refreshing
        if (!isRefresh) {
          if (newTaxiTrips.length === ITEMS_PER_PAGE) {
            setTaxiPage((p) => p + 1);
          }
          if (newDriverPosts.length === ITEMS_PER_PAGE) {
            setDriverPage((p) => p + 1);
          }
        }
      } catch (error) {
        console.error("❌ Fetch rides error:", error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token, loading]
  );

  /**
   * Pull to refresh handler
   */
  const onRefresh = useCallback(() => {
    console.log("🔄 Refreshing rides...");
    setTaxiPage(1);
    setDriverPage(1);
    setHasMoreTaxi(true);
    setHasMoreDriver(true);
    requestOverlayPermission?.();
    fetchRides(1, 1, true);
  }, [fetchRides, requestOverlayPermission]);

  /**
   * Load more Taxi Safar rides
   */
  const loadMoreTaxi = useCallback(() => {
    if (hasMoreTaxi && !loading && !refreshing && taxiSafarTrips.length > 0) {
      console.log(`📄 Loading more Taxi rides - Page ${taxiPage}`);
      fetchRides(taxiPage, driverPage);
    }
  }, [hasMoreTaxi, loading, refreshing, taxiSafarTrips.length, taxiPage, driverPage]);

  /**
   * Load more Driver Post rides
   */
  const loadMoreDriver = useCallback(() => {
    if (hasMoreDriver && !loading && !refreshing && driverPosts.length > 0) {
      console.log(`📄 Loading more Driver posts - Page ${driverPage}`);
      fetchRides(taxiPage, driverPage);
    }
  }, [hasMoreDriver, loading, refreshing, driverPosts.length, taxiPage, driverPage]);

  /**
   * Initial fetch and app state handling
   */
  useFocusEffect(
    useCallback(() => {
      fetchDriverDetails();
      fetchRides(1, 1, false);

      const subscription = AppState.addEventListener("change", (nextState) => {
        if (
          appStateRef.current.match(/inactive|background/) &&
          nextState === "active"
        ) {
          console.log("📱 App returned to foreground - refreshing rides");
          fetchRides(1, 1, false);
        }
        appStateRef.current = nextState;
      });

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        subscription?.remove();
      };
    }, [token, fetchDriverDetails])
  );

  /**
   * Cleanup interval on unmount
   */
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  /**
   * ✅ FIXED: Get filtered rides based on selected filter
   */
  const getFilteredRides = useCallback(() => {
    console.log(`🔍 Filtering rides - Selected: "${selectedFilter}"`);
    console.log(`📊 Available: ${taxiSafarTrips.length} taxi, ${driverPosts.length} driver`);

    // Filter: Only Driver Post rides
    if (selectedFilter === "Driver Post Rides") {
      const filtered = driverPosts.filter(item => 
        item && item._rideType === "driver"
      );
      console.log(`✅ Driver Post Filter: ${filtered.length} rides`);
      return filtered;
    }

    // Filter: Only Taxi Safar rides
    if (selectedFilter === "Taxi Safar Rides") {
      const filtered = taxiSafarTrips.filter(item => 
        item && item._rideType === "taxi"
      );
      console.log(`✅ Taxi Safar Filter: ${filtered.length} rides`);
      return filtered;
    }

    // Filter: All rides (merged and sorted)
    const allRides = [
      ...taxiSafarTrips.filter(item => item && item._rideType === "taxi"),
      ...driverPosts.filter(item => item && item._rideType === "driver"),
    ];

    // Sort by date (newest first)
    const sorted = allRides.sort((a, b) => {
      const dateA = a.createdAt || a.date || 0;
      const dateB = b.createdAt || b.date || 0;
      return new Date(dateB) - new Date(dateA);
    });

    console.log(`✅ All Rides Filter: ${sorted.length} rides (${taxiSafarTrips.length} taxi + ${driverPosts.length} driver)`);
    return sorted;
  }, [selectedFilter, taxiSafarTrips, driverPosts]);

  /**
   * ✅ FIXED: Render appropriate card based on _rideType
   */
  const renderRideCard = useCallback(({ item, index }) => {
    // Safety check
    if (!item || !item._id) {
      console.warn(`⚠️ Invalid item at index ${index}`);
      return null;
    }

    // Check ride type and render appropriate card
    if (item._rideType === "taxi") {
      return <TaxiSafarTripCard trip={item} />;
    } else if (item._rideType === "driver") {
      return <DriverPostCard trip={item} />;
    } else {
      // Fallback: if _rideType is missing, try to determine from data structure
      console.warn(`⚠️ Missing _rideType for item ${item._id}`);
      // You can add additional checks here based on your data structure
      return <DriverPostCard trip={item} />;
    }
  }, []);

  const filteredRides = getFilteredRides();

  // Loading state
  if (loading && taxiSafarTrips.length === 0 && driverPosts.length === 0) {
    return (
      <Layout>
        <SafeAreaView style={styles.container}>
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#DC2626" />
            <Text style={styles.loadingText}>Finding nearby trips...</Text>
          </View>
        </SafeAreaView>
      </Layout>
    );
  }

  return (
    <Layout
      stopPoolingService={stopPoolingService}
      stopFloatingWidget={stopFloatingWidget}
      startFloatingWidget={startFloatingWidget}
      startPoolingService={startPoolingService}
    >
      <DriverMap />
      <Categories />

      <View style={styles.contentArea}>
        <View style={styles.filterContainer}>
          <RideFilterDropdown
            options={FILTER_OPTIONS}
            selectedOption={selectedFilter}
            onSelect={setSelectedFilter}
          />
        </View>

        <FlatList
          data={filteredRides}
          renderItem={renderRideCard}
          keyExtractor={(item, index) => item?._uniqueId || item?._id || `fallback-${index}`}
          ListEmptyComponent={() => (
            <View style={styles.emptySection}>
              <Text style={styles.emptyText}>
                {selectedFilter === "All Rides" 
                  ? "No rides available"
                  : selectedFilter === "Driver Post Rides"
                  ? "No driver posts available"
                  : "No Taxi Safar rides available"}
              </Text>
              <Text style={styles.emptySubtext}>
                New rides appear in real-time
              </Text>
            </View>
          )}
          onEndReached={() => {
            if (selectedFilter === "All Rides") {
              if (hasMoreTaxi) loadMoreTaxi();
              if (hasMoreDriver) loadMoreDriver();
            } else if (selectedFilter === "Driver Post Rides" && hasMoreDriver) {
              loadMoreDriver();
            } else if (selectedFilter === "Taxi Safar Rides" && hasMoreTaxi) {
              loadMoreTaxi();
            }
          }}
          onEndReachedThreshold={SCROLL_THRESHOLD}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#DC2626"]}
              tintColor="#DC2626"
            />
          }
          ListFooterComponent={
            loading && filteredRides.length > 0 ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color="#DC2626" />
              </View>
            ) : null
          }
        />
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
    backgroundColor: "#fff",
  },
  filterContainer: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  listContent: {
    paddingHorizontal: 8,
    paddingTop: 4,
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
});