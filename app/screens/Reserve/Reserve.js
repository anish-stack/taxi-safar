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
  Animated,
  Alert,
  Pressable,
  PanResponder,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import {
  ChevronLeft,
  Search,
  Filter,
  Plus,
  MessageCircle,
  X,
} from "lucide-react-native";

import DriverPostCard from "./DriverPostCard";
import TaxiSafarTripCard from "./TaxiSafarTripCard";
import TabSelector from "./TabSelector";
import { API_URL_APP } from "../../constant/api";
import loginStore from "../../store/auth.store";
import { fetchWithRetry } from "../../utils/fetchWithRetry";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SLIDER_WIDTH = SCREEN_WIDTH - 80; // padding 40 each side
const MAX_PRICE = 100000;
const MIN_PRICE = 0;

export default function ReserveScreen() {
  const [activeTab, setActiveTab] = useState("All Trip");
  const [taxiSafarTrips, setTaxiSafarTrips] = useState([]);
  const [driverPosts, setDriverPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [filterVisible, setFilterVisible] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMoreData, setHasMoreData] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const { token } = loginStore();
  const navigation = useNavigation()

  const [filters, setFilters] = useState({
    tripType: "all",
    priceRange: [100, 100000],
    sortBy: "",
  });

  const [tempFilters, setTempFilters] = useState(filters);

  const tabs = ["All Trip", "TaxiSafar Trip", "Driver Post"];

  // === Custom Range Slider Logic ===
  const minThumbRef = useRef(new Animated.Value(0)).current;
  const maxThumbRef = useRef(new Animated.Value(SLIDER_WIDTH)).current;

  const updateSliderPositions = () => {
    const [min, max] = tempFilters.priceRange;
    const minX = (min / MAX_PRICE) * SLIDER_WIDTH;
    const maxX = (max / MAX_PRICE) * SLIDER_WIDTH;
    minThumbRef.setValue(minX);
    maxThumbRef.setValue(maxX);
  };

  useEffect(() => {
    if (filterVisible) updateSliderPositions();
  }, [tempFilters.priceRange, filterVisible]);

  const minPanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_, gesture) => {
      let newX = gesture.moveX - 40;
      newX = Math.max(
        0,
        Math.min(
          newX,
          SLIDER_WIDTH * (tempFilters.priceRange[1] / MAX_PRICE) - 20
        )
      );
      const newMin =
        Math.round(((newX / SLIDER_WIDTH) * MAX_PRICE) / 1000) * 1000;
      if (newMin <= tempFilters.priceRange[1]) {
        setTempFilters((prev) => ({
          ...prev,
          priceRange: [newMin, prev.priceRange[1]],
        }));
      }
    },
  });

  const maxPanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_, gesture) => {
      let newX = gesture.moveX - 40;
      newX = Math.min(
        SLIDER_WIDTH,
        Math.max(
          newX,
          SLIDER_WIDTH * (tempFilters.priceRange[0] / MAX_PRICE) + 20
        )
      );
      const newMax =
        Math.round(((newX / SLIDER_WIDTH) * MAX_PRICE) / 1000) * 1000;
      if (newMax >= tempFilters.priceRange[0]) {
        setTempFilters((prev) => ({
          ...prev,
          priceRange: [prev.priceRange[0], newMax],
        }));
      }
    },
  });

  // === API & Data Loading (unchanged) ===
  const fetchTaxiSafarTrips = async (pageNum = 1) => {
    return await fetchWithRetry(async () => {
      const response = await fetch(
        `${API_URL_APP}/api/v1/Fetch-Near-By-Taxi-Safar-Rides?page=${pageNum}&limit=10`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await response.json();
      return data.success ? data.data || [] : [];
    });
  };

  const fetchDriverPosts = async (pageNum = 1) => {
    return await fetchWithRetry(async () => {
      const response = await fetch(
        `${API_URL_APP}/api/v1/fetch-nearby-rides?page=${pageNum}&limit=10`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await response.json();
      return data.success ? data.data || [] : [];
    });
  };

  const loadData = async (pageNum = 1, append = false) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      let posts = [],
        trips = [];

      if (activeTab === "Driver Post" || activeTab === "All Trip") {
        posts = await fetchDriverPosts(pageNum);
      }
      if (activeTab === "TaxiSafar Trip" || activeTab === "All Trip") {
        trips = await fetchTaxiSafarTrips(pageNum);
      }

      if (append) {
        setDriverPosts((prev) => [...prev, ...posts]);
        setTaxiSafarTrips((prev) => [...prev, ...trips]);
      } else {
        setDriverPosts(posts);
        setTaxiSafarTrips(trips);
      }

      setHasMoreData(posts.length === 10 || trips.length === 10);
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
      setPage((prev) => prev + 1);
      loadData(page + 1, true);
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

    if (activeTab === "Driver Post") {
      data = driverPosts.map((d) => ({ ...d, sourceType: "driver" }));
    } else if (activeTab === "TaxiSafar Trip") {
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

    // Price Filter
    const [minP, maxP] = filters.priceRange;
    data = data.filter((item) => {
      const price = parseFloat(
        item.original_amount || item.totalAmount || item.driverEarning || 0
      );
      return price >= minP && price <= maxP;
    });

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

  const renderFooter = () =>
    loadingMore ? (
      <View style={styles.loadingMore}>
        <ActivityIndicator size="small" color="#DC2626" />
        <Text style={styles.loadingMoreText}>Loading more...</Text>
      </View>
    ) : null;

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
        <TouchableOpacity activeOpacity={0.9}  onPress={()=>navigation.goBack()}>
          <ChevronLeft size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reserved Trip</Text>
        <TouchableOpacity activeOpacity={0.9} onPress={()=>navigation.navigate("chat")}>
          <MessageCircle size={24} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Search & Filter */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Search size={20} color="#999" style={{ marginRight: 12 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by area"
            placeholderTextColor="#999"
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>
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
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
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

      <TouchableOpacity style={styles.addButton}>
        <Plus size={28} color="#FFF" />
      </TouchableOpacity>

      {/* Filter Modal */}
      <Modal visible={filterVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.filterModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filters</Text>
              <TouchableOpacity onPress={() => setFilterVisible(false)}>
                <X size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Trip Type */}
              <Text style={styles.filterLabel}>Trip Type</Text>
              <View style={styles.chipContainer}>
                {["all", "oneWay", "roundTrip"].map((type) => (
                  <Pressable
                    key={type}
                    style={[
                      styles.chip,
                      tempFilters.tripType === type && styles.chipActive,
                    ]}
                    onPress={() =>
                      setTempFilters({ ...tempFilters, tripType: type })
                    }
                  >
                    <Text
                      style={[
                        styles.chipText,
                        tempFilters.tripType === type && styles.chipTextActive,
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

              {/* Sort By */}
              <Text style={styles.filterLabel}>Sort By</Text>
              <View style={styles.chipContainer}>
                {["newest", "priceLow", "priceHigh"].map((sort) => (
                  <Pressable
                    key={sort}
                    style={[
                      styles.chip,
                      tempFilters.sortBy === sort && styles.chipActive,
                    ]}
                    onPress={() =>
                      setTempFilters({ ...tempFilters, sortBy: sort })
                    }
                  >
                    <Text
                      style={[
                        styles.chipText,
                        tempFilters.sortBy === sort && styles.chipTextActive,
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

              {/* Price Range */}
              <Text style={styles.filterLabel}>Price Range</Text>
              <View style={styles.priceDisplay}>
                <Text style={styles.priceText}>
                  ₹{tempFilters.priceRange[0].toLocaleString()}
                </Text>
                <Text style={styles.priceText}>
                  ₹{tempFilters.priceRange[1].toLocaleString()}
                </Text>
              </View>

              <View style={styles.sliderContainer}>
                <View style={styles.track} />
                <View
                  style={[
                    styles.activeTrack,
                    {
                      left:
                        (tempFilters.priceRange[0] / MAX_PRICE) * SLIDER_WIDTH,
                      width:
                        ((tempFilters.priceRange[1] -
                          tempFilters.priceRange[0]) /
                          MAX_PRICE) *
                        SLIDER_WIDTH,
                    },
                  ]}
                />

                {/* Min Thumb */}
                <View
                  {...minPanResponder.panHandlers}
                  style={[
                    styles.thumb,
                    {
                      left:
                        (tempFilters.priceRange[0] / MAX_PRICE) * SLIDER_WIDTH -
                        12,
                    },
                  ]}
                />

                {/* Max Thumb */}
                <View
                  {...maxPanResponder.panHandlers}
                  style={[
                    styles.thumb,
                    {
                      left:
                        (tempFilters.priceRange[1] / MAX_PRICE) * SLIDER_WIDTH -
                        12,
                    },
                  ]}
                />
              </View>
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.resetBtn}
                onPress={() => {
                  setTempFilters({
                    tripType: "all",
                    priceRange: [0, 100000],
                    sortBy: "newest",
                  });
                }}
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
              >
                <Text style={styles.applyText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
    backgroundColor: "#F5F5F5",
  },
  headerTitle: { fontSize: 18, fontWeight: "600", color: "#000" },
  searchContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#F5F5F5",
    gap: 12,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 25,
    paddingHorizontal: 16,
    height: 50,
  },
  searchInput: { flex: 1, fontSize: 16, color: "#000" },
  filterButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: { paddingHorizontal: 4, paddingBottom: 100 },
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
  centerContent: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 16, fontSize: 16, color: "#666" },
  addButton: {
    position: "absolute",
    bottom: 30,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  filterModal: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "90%",
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderColor: "#EEE",
  },
  modalTitle: { fontSize: 18, fontWeight: "600" },
  filterLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 20,
    marginTop: 20,
    marginBottom: 10,
  },
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 20,
    gap: 10,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#F1F1F1",
  },
  chipActive: { backgroundColor: "#DC2626" },
  chipText: { color: "#666", fontSize: 14 },
  chipTextActive: { color: "#FFF", fontWeight: "600" },

  priceDisplay: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 40,
    marginBottom: 10,
  },
  priceText: { fontSize: 16, fontWeight: "600", color: "#DC2626" },

  sliderContainer: {
    height: 50,
    justifyContent: "center",
    paddingHorizontal: 40,
    position: "relative",
  },
  track: {
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    width: "100%",
  },
  activeTrack: {
    height: 6,
    backgroundColor: "#DC2626",
    borderRadius: 3,
    position: "absolute",
  },
  thumb: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FFF",
    borderWidth: 3,
    borderColor: "#DC2626",
    position: "absolute",
    top: 11,
  },

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
  resetText: { fontSize: 16, color: "#666", fontWeight: "600" },
  applyBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#DC2626",
    alignItems: "center",
  },
  applyText: { fontSize: 16, color: "#FFF", fontWeight: "600" },
});
