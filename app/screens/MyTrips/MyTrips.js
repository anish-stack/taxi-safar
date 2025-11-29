import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  Pressable,
  PanResponder,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, MessageCircle, Search, Filter, X } from "lucide-react-native";
import axios from "axios";
import loginStore from "../../store/auth.store";
import useDriverStore from "../../store/driver.store";
import { API_URL_APP } from "../../constant/api";
import DriverPost from "../Reserve/DriverPost";
import RideCard from "../Reserve/RideCard";

const MAX_PRICE = 100000;
const SLIDER_WIDTH = 300;

const tabs = [
  { id: "all", label: "All Trips" },
  { id: "taxi_safari", label: "Taxi Safari" },
  { id: "rides_post", label: "Driver Posts" },
];

const TabSelector = ({ activeTab, tabs, onTabChange }) => {
  return (
    <View style={styles.tabContainer}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.id}
          style={[styles.tab, activeTab === tab.id && styles.tabActive]}
          onPress={() => onTabChange(tab.id)}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === tab.id && styles.tabTextActive,
            ]}
          >
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

export default function MyTrips({ navigation }) {
  const { token } = loginStore();
  const { driver } = useDriverStore();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ridesData, setRidesData] = useState(null);
  
  // UI States
  const [activeTab, setActiveTab] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [filterVisible, setFilterVisible] = useState(false);
  
  // Filter States
  const [filters, setFilters] = useState({
    tripType: "all",
    priceRange: [0, 100000],
    sortBy: "newest",
    status: "all",
  });
  const [tempFilters, setTempFilters] = useState(filters);

  // Fetch trips data
  const fetchMyTrips = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    
    try {
      const res = await axios.get(
        `${API_URL_APP}/api/v1/get-my-assigend-rides`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.data?.success) {
        setRidesData(res.data.data);
      } else {
        console.warn("No rides found");
      }
    } catch (error) {
      console.log("❌ Fetch MyTrips Error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMyTrips();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMyTrips(false);
  };

  // Filter and search logic
  const filterRides = (rides, type) => {
    if (!rides) return [];

    let filtered = [...rides];

    // Search filter
    if (searchText.trim()) {
      filtered = filtered.filter((ride) => {
        const searchLower = searchText.toLowerCase();
        if (type === "taxi_safari") {
          return (
            ride.pickup_address?.toLowerCase().includes(searchLower) ||
            ride.destination_address?.toLowerCase().includes(searchLower)
          );
        } else {
          return (
            ride.pickupAddress?.toLowerCase().includes(searchLower) ||
            ride.dropAddress?.toLowerCase().includes(searchLower) ||
            ride.driverPostId?.driver_name?.toLowerCase().includes(searchLower)
          );
        }
      });
    }

    // Trip type filter
    if (filters.tripType !== "all") {
      filtered = filtered.filter((ride) => {
        if (type === "taxi_safari") {
          return ride.original_tryipType?.toLowerCase().includes(filters.tripType);
        } else {
          return ride.tripType?.toLowerCase().includes(filters.tripType === "oneWay" ? "one way" : "round");
        }
      });
    }

    // Status filter
    if (filters.status !== "all") {
      filtered = filtered.filter((ride) => {
        const status = type === "taxi_safari" ? ride.trip_status : ride.rideStatus;
        return status?.toLowerCase() === filters.status.toLowerCase();
      });
    }

    // Price range filter
    filtered = filtered.filter((ride) => {
      const amount = type === "taxi_safari" 
        ? parseFloat(ride.original_amount) 
        : parseFloat(ride.totalAmount);
      return amount >= filters.priceRange[0] && amount <= filters.priceRange[1];
    });

    // Sort
    if (filters.sortBy === "newest") {
      filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (filters.sortBy === "priceLow") {
      filtered.sort((a, b) => {
        const priceA = type === "taxi_safari" ? parseFloat(a.original_amount) : parseFloat(a.totalAmount);
        const priceB = type === "taxi_safari" ? parseFloat(b.original_amount) : parseFloat(b.totalAmount);
        return priceA - priceB;
      });
    } else if (filters.sortBy === "priceHigh") {
      filtered.sort((a, b) => {
        const priceA = type === "taxi_safari" ? parseFloat(a.original_amount) : parseFloat(a.totalAmount);
        const priceB = type === "taxi_safari" ? parseFloat(b.original_amount) : parseFloat(b.totalAmount);
        return priceB - priceA;
      });
    }

    return filtered;
  };

  // Get filtered rides based on active tab
  const getDisplayRides = () => {
    if (!ridesData) return [];

    const taxiSafariFiltered = filterRides(
      ridesData.taxi_safari_rides?.rides || [],
      "taxi_safari"
    );
    const ridesPostFiltered = filterRides(
      ridesData.rides_post_rides?.rides || [],
      "rides_post"
    );

    if (activeTab === "taxi_safari") return taxiSafariFiltered;
    if (activeTab === "rides_post") return ridesPostFiltered;
    
    // Combine both for "all" tab
    return [...taxiSafariFiltered, ...ridesPostFiltered].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
  };

  // Price Range Slider
  const createPanResponder = (isMin) => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        const newValue = Math.max(
          0,
          Math.min(
            MAX_PRICE,
            (gestureState.moveX / SLIDER_WIDTH) * MAX_PRICE
          )
        );

        if (isMin) {
          setTempFilters((prev) => ({
            ...prev,
            priceRange: [
              Math.min(newValue, prev.priceRange[1] - 1000),
              prev.priceRange[1],
            ],
          }));
        } else {
          setTempFilters((prev) => ({
            ...prev,
            priceRange: [
              prev.priceRange[0],
              Math.max(newValue, prev.priceRange[0] + 1000),
            ],
          }));
        }
      },
    });
  };

  const minPanResponder = createPanResponder(true);
  const maxPanResponder = createPanResponder(false);

  // Render functions
  const renderTaxiSafariRide = ({ item }) => (
    <RideCard
      name={item.name || "Customer"}
      vehicleType={item?.vehicle_type}
      price={item.original_amount}
      original_tryipType={item.original_tryipType}
      startDate={new Date(item.scheduled_time).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })}
      startTime={new Date(item.scheduled_time).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      })}
      tripType={item.trip_type}
      status={item?.trip_status}
      pickup={item.pickup_address}
      drop={item.destination_address}
      distance={item.distance || "N/A"}
      onPress={() => navigation.navigate("ProgressTaxiSafarRide", { rideId: item?._id, type: "taxi_safari",accpetd:true })}
    />
  );

  const renderRidesPostRide = ({ item }) => (
    <DriverPost
      _id={item._id}
      vehicleName={item.vehicle_name || "Vehicle"}
      assignedStatus={item.rideStatus}
      vehicleType="mini"
            status={item?.
rideStatus}

      totalAmount={`₹${item.totalAmount}`}
      commission={`₹${item.commissionAmount}`}
      driverEarning={`₹${item.driverEarning}`}
      pickup={item.pickupAddress}
      drop={item.dropAddress}
      tripType={item.tripType}
      date={new Date(item.createdAt).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })}
      time={new Date(item.createdAt).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      })}
      onPress={() => navigation.navigate("ReserveRideDetailsAssigned", { rideId: item._id, type: "rides_post" })}
    />
  );

  const renderRide = ({ item }) => {
    // Determine ride type
    if (item.trip_status !== undefined) {
      return renderTaxiSafariRide({ item });
    } else {
      return renderRidesPostRide({ item });
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.loadingText}>Loading your trips...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!ridesData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🚗</Text>
          <Text style={styles.emptyTitle}>No Trips Found</Text>
          <Text style={styles.emptySubtitle}>
            Your assigned trips will appear here
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const displayRides = getDisplayRides();
  const { summary } = ridesData;

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
        <Text style={styles.headerTitle}>My Trips</Text>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => navigation.navigate("chat")}
        >
          <MessageCircle size={24} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Stats Summary */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{summary?.total_rides || 0}</Text>
          <Text style={styles.statLabel}>Total Trips</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{summary?.taxi_safari_count || 0}</Text>
          <Text style={styles.statLabel}>Taxi Safari</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{summary?.rides_post_count || 0}</Text>
          <Text style={styles.statLabel}>Driver Posts</Text>
        </View>
      </View>

      {/* Search & Filter */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Search size={20} color="#999" style={{ marginRight: 12 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by location or name"
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
          <Filter size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Tab Selector */}
      <TabSelector
        activeTab={activeTab}
        tabs={tabs}
        onTabChange={setActiveTab}
      />

      {/* Rides List */}
      <FlatList
        data={displayRides}
        keyExtractor={(item, index) => item._id || index.toString()}
        renderItem={renderRide}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyList}>
            <Text style={styles.emptyListIcon}>📭</Text>
            <Text style={styles.emptyListText}>No trips found</Text>
            <Text style={styles.emptyListSubtext}>
              Try adjusting your filters or search
            </Text>
          </View>
        }
      />

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

              {/* Status Filter */}
              <Text style={styles.filterLabel}>Status</Text>
              <View style={styles.chipContainer}>
                {["all", "pending", "ongoing", "completed", "cancelled"].map((status) => (
                  <Pressable
                    key={status}
                    style={[
                      styles.chip,
                      tempFilters.status === status && styles.chipActive,
                    ]}
                    onPress={() =>
                      setTempFilters({ ...tempFilters, status })
                    }
                  >
                    <Text
                      style={[
                        styles.chipText,
                        tempFilters.status === status && styles.chipTextActive,
                      ]}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
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
                    status: "all",
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A1A1A",
  },

  // Stats
  statsContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "800",
    color: "#000",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    fontWeight: "600",
  },

  // Search & Filter
  searchContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#1A1A1A",
  },
  filterButton: {
    width: 48,
    height: 48,
    backgroundColor: "#000",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  // Tabs
  tabContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 10,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  tabActive: {
    backgroundColor: "#000",
    borderColor: "#000",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  tabTextActive: {
    color: "#FFF",
  },

  // List
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  emptyList: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyListIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyListText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 6,
  },
  emptyListSubtext: {
    fontSize: 14,
    color: "#666",
  },

  // Filter Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  filterModal: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 30,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
    marginTop: 20,
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 20,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#F5F7FA",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  chipActive: {
    backgroundColor: "#000",
    borderColor: "#000",
  },
  chipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  chipTextActive: {
    color: "#FFF",
  },
  priceDisplay: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  priceText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
  },
  sliderContainer: {
    height: 40,
    paddingHorizontal: 20,
    justifyContent: "center",
  },
  track: {
    height: 4,
    backgroundColor: "#E0E0E0",
    borderRadius: 2,
    width: SLIDER_WIDTH,
  },
  activeTrack: {
    position: "absolute",
    height: 4,
    backgroundColor: "#000",
    borderRadius: 2,
  },
  thumb: {
    position: "absolute",
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#000",
    borderWidth: 3,
    borderColor: "#FFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    marginTop: 24,
  },
  resetBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#F5F7FA",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  resetText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#666",
  },
  applyBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#000",
    alignItems: "center",
  },
  applyText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFF",
  },
});