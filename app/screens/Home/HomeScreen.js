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
import Heading from "../common/Heading";
import DriverPostCard from "../Reserve/DriverPostCard";
import TaxiSafarTripCard from "../Reserve/TaxiSafarTripCard";

const ITEMS_PER_PAGE = 10;
const AUTO_REFRESH_INTERVAL = 60000; // 10 seconds
const SCROLL_THRESHOLD = 0.5;

export default function HomeScreen({ route }) {
  // Store hooks
  const {

    driver,

    fetchDriverDetails,
  } = useDriverStore();
  const { token } = loginStore();

  // Route params for driver service
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

  // Driver Posts State
  const [driverPosts, setDriverPosts] = useState([]);
  const [driverPage, setDriverPage] = useState(1);
  const [hasMoreDriver, setHasMoreDriver] = useState(true);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Refs
  const intervalRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);

  // Sync driver online status
  useEffect(() => {
    if (driver?.is_online !== undefined) {
      setIsDriverOnline(driver.is_online);

      const init = async () => {
        try {
          await startFloatingWidget();
          await startPoolingService();
        } catch (err) {
          console.log("Floating widget error:", err);
        }
      };

      init();
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
          fetchWithRetry(() =>
            fetch(
              `${API_URL_APP}/api/v1/Fetch-Near-By-Taxi-Safar-Rides?page=${taxiPageNum}&limit=${ITEMS_PER_PAGE}`,
              {
                headers: { Authorization: `Bearer ${token}` },
              }
            ).then((res) => res.json())
          ),
          fetchWithRetry(() =>
            fetch(
              `${API_URL_APP}/api/v1/fetch-nearby-rides?page=${driverPageNum}&limit=${ITEMS_PER_PAGE}`,
              {
                headers: { Authorization: `Bearer ${token}` },
              }
            ).then((res) => res.json())
          ),
        ]);

        const newTaxiTrips = taxiRes?.success ? taxiRes.data || [] : [];
        const newDriverPosts = driverRes?.success ? driverRes.data || [] : [];

        // Deduplicate helper
        const deduplicateItems = (existingItems, newItems) =>
          newItems.filter(
            (item) =>
              !existingItems.some((existing) => existing._id === item._id)
          );

        // Update TaxiSafar trips
        if (isRefresh || taxiPageNum === 1) {
          setTaxiSafarTrips(newTaxiTrips);
        } else {
          setTaxiSafarTrips((prev) => [
            ...prev,
            ...deduplicateItems(prev, newTaxiTrips),
          ]);
        }

        // Update Driver posts
        if (isRefresh || driverPageNum === 1) {
          setDriverPosts(newDriverPosts);
        } else {
          setDriverPosts((prev) => [
            ...prev,
            ...deduplicateItems(prev, newDriverPosts),
          ]);
        }

        // Update pagination state
        setHasMoreTaxi(newTaxiTrips.length === ITEMS_PER_PAGE);
        setHasMoreDriver(newDriverPosts.length === ITEMS_PER_PAGE);

        // Increment page numbers if not refreshing
        if (!isRefresh) {
          if (newTaxiTrips.length === ITEMS_PER_PAGE) {
            setTaxiPage((prev) => prev + 1);
          }
          if (newDriverPosts.length === ITEMS_PER_PAGE) {
            setDriverPage((prev) => prev + 1);
          }
        }
      } catch (error) {
        console.error("Fetch rides error:", error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token, loading]
  );

  /**
   * Manual pull-to-refresh
   */
  const onRefresh = useCallback(() => {
    setTaxiPage(1);
    setDriverPage(1);
    setHasMoreTaxi(true);
    setHasMoreDriver(true);
    requestOverlayPermission?.();
    fetchRides(1, 1, true);
  }, [fetchRides, requestOverlayPermission]);

  /**
   * Load more TaxiSafar rides
   */
  const loadMoreTaxi = useCallback(() => {
    if (hasMoreTaxi && !loading && !refreshing && taxiSafarTrips.length > 0) {
      fetchRides(taxiPage, driverPage);
    }
  }, [
    hasMoreTaxi,
    loading,
    refreshing,
    taxiSafarTrips.length,
    taxiPage,
    driverPage,
  ]);

  /**
   * Load more Driver posts
   */
  const loadMoreDriver = useCallback(() => {
    if (hasMoreDriver && !loading && !refreshing && driverPosts.length > 0) {
      fetchRides(taxiPage, driverPage);
    }
  }, [
    hasMoreDriver,
    loading,
    refreshing,
    driverPosts.length,
    taxiPage,
    driverPage,

  ]);

  /**
   * Auto-refresh and focus effect
   */
  useFocusEffect(
    useCallback(() => {
      // Initial fetch
      fetchDriverDetails();
      fetchRides(1, 1, false);



      // Handle app state changes
      const subscription = AppState.addEventListener("change", (nextState) => {
        if (
          appStateRef.current.match(/inactive|background/) &&
          nextState === "active"
        ) {
          fetchRides(1, 1, false);
        }
        appStateRef.current = nextState;
      });

      // Cleanup on unfocus
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
   * Cleanup on unmount
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
   * Render section header
   */
  const renderSectionHeader = useCallback(
    (title) => (
      <View style={styles.sectionHeader}>
        <Heading title={title} />
      </View>
    ),
    []
  );

  /**
   * Render empty state
   */
  const renderEmpty = useCallback(
    (title) => (
      <View style={styles.emptySection}>
        <Text style={styles.emptyText}>No {title} available right now</Text>
        <Text style={styles.emptySubtext}>New rides appear in real-time</Text>
      </View>
    ),
    []
  );

  // Show loading indicator on initial load
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
        <FlatList
          data={[{ key: "main-content" }]}
          renderItem={() => (
            <View>
              {/* TaxiSafar Rides Section */}
              {taxiSafarTrips.length > 0 &&
                renderSectionHeader("Taxi Safar Reserved Rides")}
              <FlatList
                data={taxiSafarTrips}
                renderItem={({ item }) => <TaxiSafarTripCard trip={item} />}
                keyExtractor={(item) => item._id}
                ListEmptyComponent={() => renderEmpty("TaxiSafar rides")}
                onEndReached={loadMoreTaxi}
                onEndReachedThreshold={SCROLL_THRESHOLD}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
              />

              {/* Driver Posts Section */}
              {driverPosts.length > 0 && renderSectionHeader("Driver Posts")}
              <FlatList
                data={driverPosts}
                renderItem={({ item }) => <DriverPostCard trip={item} />}
                keyExtractor={(item) => item._id}
                ListEmptyComponent={() => renderEmpty("driver posts")}
                onEndReached={loadMoreDriver}
                onEndReachedThreshold={SCROLL_THRESHOLD}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
                style={driverPosts.length > 0 ? styles.driverSection : null}
              />
            </View>
          )}
          keyExtractor={(item) => item.key}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#DC2626"]}
              tintColor="#DC2626"
            />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.mainContentContainer}
        />
      </View>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
  contentArea: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  mainContentContainer: {
    paddingBottom: 120,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },
  driverSection: {
    marginTop: 16,
  },
  emptySection: {
    alignItems: "center",
    paddingVertical: 50,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 17,
    color: "#374151",
    fontWeight: "600",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#9CA3AF",
    marginTop: 8,
  },
});
