import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  Modal,
  ScrollView,
  Alert,
  Pressable,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { scale, verticalScale, moderateScale } from "react-native-size-matters";

import {
  ChevronLeft,
  Search,
  Filter,
  X,
  MapPin,
} from "lucide-react-native";

import DriverPostCard from "./DriverPostCard";
import TaxiSafarTripCard from "./TaxiSafarTripCard";
import TabSelector from "./TabSelector";
import { API_URL_APP } from "../../constant/api";
import loginStore from "../../store/auth.store";
import { fetchWithRetry } from "../../utils/fetchWithRetry";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const MAX_PRICE = 100000;
const MIN_PRICE = 0;

const POPULAR_CITIES = [
  "Delhi",
  "Bangalore",
  "Mumbai",
  "Pune",
  "Hyderabad",
  "Chennai",
  "Kolkata",
  "Jaipur",
  "Ahmedabad",
  "Lucknow",
  "Gurgaon",
  "Noida",
  "Chandigarh",
  "Indore",
];

const isFutureRideIST = (pickupDate, pickupTime) => {
  if (!pickupDate || !pickupTime) return false;
  const dateObj = new Date(pickupDate);
  const [hours, minutes] = pickupTime.split(":").map(Number);
  dateObj.setHours(hours, minutes, 0, 0);
  const now = new Date();
  return dateObj.getTime() > now.getTime();
};

export default function ReserveScreen({ route }) {
  const { filter } = route.params || {};
  const [activeTab, setActiveTab] = useState("All Trip");
  const [taxiSafarTrips, setTaxiSafarTrips] = useState([]);
  const [driverPosts, setDriverPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [filterVisible, setFilterVisible] = useState(filter ? true : false);
  const [page, setPage] = useState(1);
  const [hasMoreData, setHasMoreData] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const { token } = loginStore();
  const navigation = useNavigation();

  // Location States
  const [showFromDropdown, setShowFromDropdown] = useState(false);
  const [showToDropdown, setShowToDropdown] = useState(false);

  const [filters, setFilters] = useState({
    tripType: "all",
    fromCity: "",
    toCity: "",
    sortBy: "newest",
  });

  const [tempFilters, setTempFilters] = useState(filters);

  const tabs = ["All Trip", "B2B Bookings", "B2C Bookings"];
  const LIMIT_PER_PAGE = 10;

  // === API & Data Loading ===
  const fetchTaxiSafarTrips = async (pageNum = 1) => {
    return await fetchWithRetry(async () => {
      const response = await fetch(
        `${API_URL_APP}/api/v1/Fetch-Near-By-Taxi-Safar-Rides?page=${pageNum}&limit=${LIMIT_PER_PAGE}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await response.json();
      return data.success ? data.data || [] : [];
    });
  };

  const fetchDriverPosts = async (pageNum = 1) => {
    return await fetchWithRetry(async () => {
      const response = await fetch(
        `${API_URL_APP}/api/v1/fetch-nearby-rides?page=${pageNum}&limit=${LIMIT_PER_PAGE}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await response.json();

      if (!data.success || !Array.isArray(data.data)) {
        return [];
      }

      const futureRides = data.data.filter((item) =>
        isFutureRideIST(item.pickupDate, item.pickupTime)
      );

      return futureRides;
    });
  };

  const loadData = async (pageNum = 1, append = false) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      let posts = [],
        trips = [];

      if (activeTab === "B2B Bookings" || activeTab === "All Trip") {
        posts = await fetchDriverPosts(pageNum);
      }
      if (activeTab === "B2C Bookings" || activeTab === "All Trip") {
        trips = await fetchTaxiSafarTrips(pageNum);
      }

      if (append) {
        setDriverPosts((prev) => [...prev, ...posts]);
        setTaxiSafarTrips((prev) => [...prev, ...trips]);
      } else {
        setDriverPosts(posts);
        setTaxiSafarTrips(trips);
      }

      setHasMoreData(posts.length === LIMIT_PER_PAGE || trips.length === LIMIT_PER_PAGE);
    } catch (error) {
      Alert.alert("Error", "Failed to load data");
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setPage(1);
    setHasMoreData(true);
    loadData(1, false);
  }, [activeTab]);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMoreData && !loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadData(nextPage, true);
    }
  }, [loadingMore, hasMoreData, loading, page, activeTab]);

  const onTabChange = (tab) => {
    setActiveTab(tab);
    setPage(1);
    setHasMoreData(true);
    loadData(1, false);
  };

  useFocusEffect(
    useCallback(() => {
      setPage(1);
      setHasMoreData(true);
      loadData(1, false);
    }, [activeTab])
  );

  // === Filtering & Sorting ===
  const getFilteredAndSortedData = () => {
    let data = [];

    if (activeTab === "B2B Bookings") {
      data = driverPosts.map((d) => ({ ...d, sourceType: "driver" }));
    } else if (activeTab === "B2C Bookings") {
      data = taxiSafarTrips.map((t) => ({ ...t, sourceType: "taxisafar" }));
    } else {
      data = [
        ...driverPosts.map((d) => ({ ...d, sourceType: "driver" })),
        ...taxiSafarTrips.map((t) => ({ ...t, sourceType: "taxisafar" })),
      ];
    }

    // Search
    if (searchText.trim()) {
      const query = searchText.toLowerCase();
      data = data.filter((item) =>
        [
          item.pickup_address,
          item.pickupAddress,
          item.destination_address,
          item.dropAddress,
          item.name,
        ].some((field) => field?.toLowerCase().includes(query))
      );
    }

    // Trip Type Filter
    if (filters.tripType !== "all") {
      const isRound = filters.tripType === "roundTrip";
      data = data.filter((item) => {
        const type = item.trip_type || item.tripType || "";
        return isRound
          ? type.includes("round") || type.includes("Round")
          : !type.includes("round");
      });
    }

    // From City Filter
    if (filters.fromCity.trim()) {
      const query = filters.fromCity.toLowerCase();
      data = data.filter((item) => {
        const from = (
          item.pickup_address ||
          item.pickupAddress ||
          ""
        ).toLowerCase();
        return from.includes(query);
      });
    }

    // To City Filter
    if (filters.toCity.trim()) {
      const query = filters.toCity.toLowerCase();
      data = data.filter((item) => {
        const to = (
          item.destination_address ||
          item.dropAddress ||
          ""
        ).toLowerCase();
        return to.includes(query);
      });
    }

    // Sorting
    data.sort((a, b) => {
      if (filters.sortBy === "newest") {
        return (
          new Date(b.scheduled_time || b.pickupDate || 0) -
          new Date(a.scheduled_time || a.pickupDate || 0)
        );
      }
      if (filters.sortBy === "priceLow") {
        return (
          (a.original_amount || a.totalAmount || 0) -
          (b.original_amount || b.totalAmount || 0)
        );
      }
      if (filters.sortBy === "priceHigh") {
        return (
          (b.original_amount || b.totalAmount || 0) -
          (a.original_amount || a.totalAmount || 0)
        );
      }
      return 0;
    });

    return data;
  };

  const filteredData = getFilteredAndSortedData();

  const renderTripCard = ({ item }) => {
    const isDriver =
      item.sourceType === "driver" || item.driverEarning !== undefined;
    return isDriver ? (
      <DriverPostCard trip={item} />
    ) : (
      <TaxiSafarTripCard trip={item} />
    );
  };

  const renderFooter = () => {
    if (loadingMore) {
      return (
        <View style={styles.loadingMore}>
          <ActivityIndicator size="small" color="#DC2626" />
          <Text style={styles.loadingMoreText}>Loading more...</Text>
        </View>
      );
    }
    if (hasMoreData && filteredData.length > 0) {
      return (
        <TouchableOpacity
          style={styles.loadMoreButton}
          onPress={loadMore}
          activeOpacity={0.7}
        >
          <Text style={styles.loadMoreText}>Load More Trips</Text>
        </TouchableOpacity>
      );
    }
    return null;
  };

  if (loading && filteredData.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#DC2626" />
          <Text style={styles.loadingText}>Loading trips...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => navigation.goBack()}
        >
          <ChevronLeft size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reserved Trip</Text>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => {
            setTempFilters(filters);
            setFilterVisible(true);
          }}
        >
          <Filter size={20} color="#000" />
        </TouchableOpacity>
      </View>


      {/* Active Filters Display */}
      {(filters.fromCity || filters.toCity) && (
        <View style={styles.activeFiltersContainer}>
          {filters.fromCity && (
            <View style={styles.filterTag}>
              <MapPin size={14} color="#FFF" />
              <Text style={styles.filterTagText}>From: {filters.fromCity}</Text>
            </View>
          )}
          {filters.toCity && (
            <View style={styles.filterTag}>
              <MapPin size={14} color="#FFF" />
              <Text style={styles.filterTagText}>To: {filters.toCity}</Text>
            </View>
          )}
        </View>
      )}

      <TabSelector
        activeTab={activeTab}
        tabs={tabs}
        onTabChange={onTabChange}
      />

      <FlatList
        data={filteredData}
        renderItem={renderTripCard}
        keyExtractor={(item, i) => item._id || `item-${i}`}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#DC2626"]}
          />
        }
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No trips found</Text>
            <Text style={styles.emptySubtext}>
              Try adjusting your search or filters
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />

      {/* Filter Modal */}
      <Modal visible={filterVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardAvoidingContainer}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.filterModal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Filters</Text>
                <TouchableOpacity onPress={() => setFilterVisible(false)}>
                  <X size={24} color="#000" />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                style={styles.scrollContent}
              >
                {/* Location Section */}
                <View style={styles.locationSection}>
                  <Text style={styles.sectionTitle}>📍 Travel Route</Text>

                  {/* From City */}
                  <View style={styles.locationInputContainer}>
                    <Text style={styles.locationLabel}>From City</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Enter departure city"
                      placeholderTextColor="#999"
                      value={tempFilters.fromCity}
                      onChangeText={(text) =>
                        setTempFilters({ ...tempFilters, fromCity: text })
                      }
                    />
                  </View>

                  {/* To City */}
                  <View style={styles.locationInputContainer}>
                    <Text style={styles.locationLabel}>To City</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Enter destination city"
                      placeholderTextColor="#999"
                      value={tempFilters.toCity}
                      onChangeText={(text) =>
                        setTempFilters({ ...tempFilters, toCity: text })
                      }
                    />
                  </View>
                </View>

                {/* Trip Type */}
                <View style={styles.filterSection}>
                  <Text style={styles.sectionTitle}>🛣️ Trip Type</Text>
                  <View style={styles.chipContainer}>
                    {["all", "oneWay", "roundTrip"].map((type) => (
                      <Pressable
                        key={type}
                        style={[
                          styles.chip,
                          tempFilters.tripType === type && styles.chipActive,
                        ]}
                        onPress={() =>
                          setTempFilters({
                            ...tempFilters,
                            tripType: type,
                          })
                        }
                      >
                        <Text
                          style={[
                            styles.chipText,
                            tempFilters.tripType === type &&
                              styles.chipTextActive,
                          ]}
                        >
                          {type === "all"
                            ? "All"
                            : type === "oneWay"
                            ? "One Way"
                            : "Round Trip"}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* Sort By */}
                <View style={styles.filterSection}>
                  <Text style={styles.sectionTitle}>⬇️ Sort By</Text>
                  <View style={styles.chipContainer}>
                    {["newest", "priceLow", "priceHigh"].map((sort) => (
                      <Pressable
                        key={sort}
                        style={[
                          styles.chip,
                          tempFilters.sortBy === sort && styles.chipActive,
                        ]}
                        onPress={() =>
                          setTempFilters({
                            ...tempFilters,
                            sortBy: sort,
                          })
                        }
                      >
                        <Text
                          style={[
                            styles.chipText,
                            tempFilters.sortBy === sort &&
                              styles.chipTextActive,
                          ]}
                        >
                          {sort === "newest"
                            ? "Newest First"
                            : sort === "priceLow"
                            ? "Price: Low → High"
                            : "Price: High → Low"}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </ScrollView>

              {/* Action Buttons */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.resetBtn}
                  onPress={() => {
                    setTempFilters({
                      tripType: "all",
                      fromCity: "",
                      toCity: "",
                      sortBy: "newest",
                    });
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.resetText}>Reset</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.applyBtn}
                  onPress={() => {
                    setFilters(tempFilters);
                    setFilterVisible(false);
                    setPage(1);
                    loadData(1, false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.applyText}>Apply Filters</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// === Styles ===
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#000" },

  searchContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFF",
    gap: 10,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 25,
    paddingHorizontal: 16,
    height: 48,
  },
  searchInput: { flex: 1, fontSize: 16, color: "#000" },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
  },

  activeFiltersContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  filterTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DC2626",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  filterTagText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "600",
  },

  listContent: { paddingHorizontal: 8, paddingBottom: 20 },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
    marginBottom: 8,
  },
  emptySubtext: { fontSize: 14, color: "#666" },

  loadingMore: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
    gap: 8,
  },
  loadingMoreText: { fontSize: 14, color: "#666" },
  loadMoreButton: {
    marginHorizontal: 16,
    marginVertical: 20,
    paddingVertical: 14,
    backgroundColor: "#DC2626",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  loadMoreText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFF",
  },

  centerContent: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 16, fontSize: 16, color: "#666" },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  filterModal: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
    paddingBottom: verticalScale(40),
  },
  keyboardAvoidingContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  modalTitle: { fontSize: 20, fontWeight: "700", color: "#000" },
  scrollContent: {
    paddingBottom: 20,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
    marginBottom: 12,
  },

  locationSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  locationInputContainer: {
    marginBottom: 14,
  },
  locationLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  dropdownWrapper: {
    position: "relative",
    zIndex: 10,
  },
  textInput: {
    backgroundColor: "#F5F5F5",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    color: "#000",
  },

  filterSection: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#F1F1F1",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  chipActive: {
    backgroundColor: "#000",
    borderColor: "#000",
  },
  chipText: { color: "#666", fontSize: 13, fontWeight: "500" },
  chipTextActive: { color: "#FFF", fontWeight: "600" },

  modalActions: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 12,
  },
  resetBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },
  resetText: { fontSize: 14, color: "#666", fontWeight: "600" },
  applyBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#DC2626",
    alignItems: "center",
  },
  applyText: { fontSize: 14, color: "#FFF", fontWeight: "700" },
});