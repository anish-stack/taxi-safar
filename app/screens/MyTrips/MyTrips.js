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
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ChevronLeft,
  MessageCircle,
  Search,
  Filter,
  X,
  Edit2,
  Trash2,
} from "lucide-react-native";
import axios from "axios";
import loginStore from "../../store/auth.store";
import { API_URL_APP } from "../../constant/api";
import DriverPost from "../Reserve/DriverPost";
import RideCard from "../Reserve/RideCard";

const MAX_PRICE = 100000;
const SLIDER_WIDTH = 300;

const tabs = [
  { id: "all", label: "All Trips" },
  // { id: "taxi_safari", label: "B2B Bookings" },
  { id: "my_posts", label: "My Post Trip" },
  { id: "driver_posts", label: "My Reserved Trip" },
];

const TabSelector = ({ activeTab, tabs, onTabChange }) => {
  return (
    <View
      showsHorizontalScrollIndicator={false}
      style={styles.tabScrollView}
      contentContainerStyle={styles.tabContainer}
    >
      <ScrollView horizontal>
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
      </ScrollView>
    </View>
  );
};

export default function MyTrips({ navigation }) {
  const { token } = loginStore();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ridesData, setRidesData] = useState(null);
  const [myPostRides, setMyPostRides] = useState([]);
  const [myPostsPagination, setMyPostsPagination] = useState({
    page: 1,
    limit: 10,
    totalPages: 1,
    totalRides: 0,
  });
  const [loadingMore, setLoadingMore] = useState(false);

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

  // Fetch assigned trips data
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

  // Fetch my posted rides with pagination
  const fetchMyPostRides = async (page = 1, showLoader = true) => {
    if (showLoader && page === 1) setLoading(true);
    if (page > 1) setLoadingMore(true);

    try {
      const res = await axios.get(
        `${API_URL_APP}/api/v1/get-my-ride-all?page=${page}&limit=${myPostsPagination.limit}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.data?.success) {
        if (page === 1) {
          setMyPostRides(res.data.data);
        } else {
          setMyPostRides((prev) => [...prev, ...res.data.data]);
        }

        setMyPostsPagination({
          page: res.data.page,
          limit: res.data.limit,
          totalPages: res.data.totalPages,
          totalRides: res.data.totalRides,
        });
      } else {
        console.warn("No rides found");
      }
    } catch (error) {
      console.log("❌ Fetch MyPostRides Error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  // Delete post ride
  const handleDeleteRide = async (rideId) => {
    Alert.alert(
      "Delete Ride",
      "Are you sure you want to delete this ride post?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await axios.delete(
                `${API_URL_APP}/api/v1/delete-post-ride/${rideId}`,
                {
                  headers: { Authorization: `Bearer ${token}` },
                }
              );

              if (res.data?.success) {
                Alert.alert("Success", "Ride deleted successfully");
                fetchMyPostRides(1, false);
              }
            } catch (error) {
              console.log("❌ Delete Error:", error);
              Alert.alert("Error", "Failed to delete ride");
            }
          },
        },
      ]
    );
  };

  useEffect(() => {
    fetchMyPostRides();
    fetchMyTrips();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    if (activeTab === "my_posts") {
      fetchMyPostRides(1, false);
    } else {
      fetchMyTrips(false);
    }
  };

  const loadMoreMyPosts = () => {
    if (!loadingMore && myPostsPagination.page < myPostsPagination.totalPages) {
      fetchMyPostRides(myPostsPagination.page + 1, false);
    }
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
          return ride.original_tryipType
            ?.toLowerCase()
            .includes(filters.tripType);
        } else {
          return ride.tripType
            ?.toLowerCase()
            .includes(filters.tripType === "oneWay" ? "one" : "round");
        }
      });
    }

    // Status filter
    if (filters.status !== "all") {
      filtered = filtered.filter((ride) => {
        const status =
          type === "taxi_safari" ? ride.trip_status : ride.rideStatus;
        return status?.toLowerCase() === filters.status.toLowerCase();
      });
    }

    // Price range filter
    filtered = filtered.filter((ride) => {
      const amount =
        type === "taxi_safari"
          ? parseFloat(ride.original_amount)
          : parseFloat(ride.totalAmount);
      return amount >= filters.priceRange[0] && amount <= filters.priceRange[1];
    });

    // Sort
    if (filters.sortBy === "newest") {
      filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (filters.sortBy === "priceLow") {
      filtered.sort((a, b) => {
        const priceA =
          type === "taxi_safari"
            ? parseFloat(a.original_amount)
            : parseFloat(a.totalAmount);
        const priceB =
          type === "taxi_safari"
            ? parseFloat(b.original_amount)
            : parseFloat(b.totalAmount);
        return priceA - priceB;
      });
    } else if (filters.sortBy === "priceHigh") {
      filtered.sort((a, b) => {
        const priceA =
          type === "taxi_safari"
            ? parseFloat(a.original_amount)
            : parseFloat(a.totalAmount);
        const priceB =
          type === "taxi_safari"
            ? parseFloat(b.original_amount)
            : parseFloat(b.totalAmount);
        return priceB - priceA;
      });
    }

    return filtered;
  };

  // Get filtered rides based on active tab
  const getDisplayRides = () => {
    if (activeTab === "my_posts") {
      return filterRides(myPostRides, "rides_post");
    }

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
    if (activeTab === "driver_posts") return ridesPostFiltered;

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
          Math.min(MAX_PRICE, (gestureState.moveX / SLIDER_WIDTH) * MAX_PRICE)
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
      // tripType={item.trip_type}
            tripType={`${trip.tripType === "one-way" ? "One Way Trip" : "Round Trip"} - ${"60"}Km`}

      status={item?.trip_status}
      pickup={item.pickup_address}
      drop={item.destination_address}
      distance={item.distance || "N/A"}
      onPress={() =>
        navigation.navigate("ProgressTaxiSafarRide", {
          rideId: item?._id,
          type: "taxi_safari",
          accpetd: true,
        })
      }
    />
  );

  const renderMyPostRide = ({ item }) => (
    <View style={styles.myPostCard}>
      <DriverPost
        _id={item._id}
        vehicleName={item.vehicleType || "Vehicle"}
        assignedStatus={item.rideStatus}
        vehicleType="mini"
        status={item?.rideStatus}
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
        onPress={() =>
          navigation.navigate("ReserveRideDetailsAssigned", {
            rideId: item._id,
            type: "my_posts",
          })
        }
      />
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() =>
            navigation.navigate("Add", { rideId: item._id })
          }
          activeOpacity={0.7}
        >
          <Edit2 size={16} color="#FFF" />
          <Text style={styles.actionButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteRide(item._id)}
          activeOpacity={0.7}
        >
          <Trash2 size={16} color="#FFF" />
          <Text style={styles.actionButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderRidesPostRide = ({ item }) => (
    <DriverPost
      _id={item._id}
      vehicleName={item.vehicle_name || "Vehicle"}
      assignedStatus={item.rideStatus}
      vehicleType="mini"
      status={item?.rideStatus}
      totalAmount={`₹${item.totalAmount}`}
      commission={`₹${item.commissionAmount}`}
      driverEarning={`₹${item.driverEarning}`}
      pickup={item.pickupAddress}
      drop={item.dropAddress}
      // tripType={item.tripType}
      tripType={`${trip.tripType === "one-way" ? "One Way Trip" : "Round Trip"} - ${"60"}Km`}
      date={new Date(item.createdAt).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })}
      time={new Date(item.createdAt).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      })}
      onPress={() =>
        navigation.navigate("ReserveRideDetailsAssigned", {
          rideId: item._id,
          type: "rides_post",
        })
      }
    />
  );

  const renderRide = ({ item }) => {
    if (activeTab === "my_posts") {
      return renderMyPostRide({ item });
    }

    if (item.trip_status !== undefined) {
      return renderTaxiSafariRide({ item });
    } else {
      return renderRidesPostRide({ item });
    }
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#000" />
        <Text style={styles.footerLoaderText}>Loading more...</Text>
      </View>
    );
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

  const displayRides = getDisplayRides();
  const summary = ridesData?.summary || {};

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => navigation.goBack()}
        >
          <ChevronLeft size={22} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Trips</Text>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => navigation.navigate("chat")}
        >
          <MessageCircle size={22} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Stats Summary */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{summary?.total_rides || 0}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
         <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {myPostsPagination.totalRides || 0}
          </Text>
          <Text style={styles.statLabel}>My Post Trip</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {summary?.taxi_safari_count || 0}
          </Text>
          <Text style={styles.statLabel}>My Reserved Trip</Text>
        </View>
     
       
      </View>

      {/* Search & Filter */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Search size={18} color="#999" style={{ marginRight: 10 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by location"
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
          <Filter size={18} color="#FFF" />
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
        onEndReached={activeTab === "my_posts" ? loadMoreMyPosts : null}
        onEndReachedThreshold={0.3}
        ListFooterComponent={activeTab === "my_posts" ? renderFooter : null}
        ListEmptyComponent={
          <View style={styles.emptyList}>
            <Text style={styles.emptyListIcon}>📭</Text>
            <Text style={styles.emptyListText}>No trips found</Text>
            <Text style={styles.emptyListSubtext}>
              {activeTab === "my_posts"
                ? "You haven't posted any rides yet"
                : "Try adjusting your filters or search"}
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
                <X size={22} color="#000" />
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
                {["all", "pending", "ongoing", "completed", "cancelled"].map(
                  (status) => (
                    <Pressable
                      key={status}
                      style={[
                        styles.chip,
                        tempFilters.status === status && styles.chipActive,
                      ]}
                      onPress={() => setTempFilters({ ...tempFilters, status })}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          tempFilters.status === status &&
                            styles.chipTextActive,
                        ]}
                      >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </Text>
                    </Pressable>
                  )
                )}
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
                        ? "Newest"
                        : sort === "priceLow"
                        ? "Low → High"
                        : "High → Low"}
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
                <Text style={styles.applyText}>Apply</Text>
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
    marginTop: 10,
    fontSize: 14,
    color: "#666",
    fontFamily: "SFProDisplay-Medium",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "SFProDisplay-Bold",
    color: "#1A1A1A",
  },

  // Stats
  statsContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFF",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  statValue: {
    fontSize: 20,
    fontFamily: "SFProDisplay-Bold",
    color: "#000",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    color: "#666",
    fontFamily: "SFProDisplay-Medium",
  },

  // Search & Filter
  searchContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 44,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#1A1A1A",
    fontFamily: "SFProDisplay-Regular",
  },
  filterButton: {
    width: 44,
    height: 44,
    backgroundColor: "#000",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  // Tabs
  tabScrollView: {
    padding: 12,
    flexDirection: "row",
    gap: 12,
  },
  tabContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: "center",
    borderRadius: 8,
    marginHorizontal: 2,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  tabActive: {
    backgroundColor: "#000",
    borderColor: "#000",
  },
  tabText: {
    fontSize: 13,
    fontFamily: "SFProDisplay-Semibold",
    color: "#666",
  },
  tabTextActive: {
    color: "#FFF",
  },

  // List
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  emptyList: {
    alignItems: "center",
    paddingVertical: 50,
  },
  emptyListIcon: {
    fontSize: 44,
    marginBottom: 10,
  },
  emptyListText: {
    fontSize: 16,
    fontFamily: "SFProDisplay-Semibold",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  emptyListSubtext: {
    fontSize: 13,
    color: "#666",
    fontFamily: "SFProDisplay-Regular",
    textAlign: "center",
    paddingHorizontal: 20,
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  footerLoaderText: {
    fontSize: 13,
    color: "#666",
    fontFamily: "SFProDisplay-Medium",
  },

  // My Post Card Actions
  myPostCard: {
    marginBottom: 12,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
    marginTop: -8,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  editButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4CAF50",
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  deleteButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F44336",
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  actionButtonText: {
    color: "#FFF",
    fontSize: 13,
    fontFamily: "SFProDisplay-Semibold",
  },

  // Filter Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  filterModal: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 18,
    paddingBottom: 26,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    marginBottom: 18,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: "SFProDisplay-Bold",
    color: "#1A1A1A",
  },
  filterLabel: {
    fontSize: 14,
    fontFamily: "SFProDisplay-Semibold",
    color: "#1A1A1A",
    marginTop: 16,
    marginBottom: 10,
    paddingHorizontal: 18,
  },
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 18,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: "#F5F7FA",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  chipActive: {
    backgroundColor: "#000",
    borderColor: "#000",
  },
  chipText: {
    fontSize: 12,
    fontFamily: "SFProDisplay-Semibold",
    color: "#666",
  },
  chipTextActive: {
    color: "#FFF",
  },
  priceDisplay: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    marginBottom: 10,
  },
  priceText: {
    fontSize: 14,
    fontFamily: "SFProDisplay-Bold",
    color: "#000",
  },
  sliderContainer: {
    height: 40,
    paddingHorizontal: 18,
    justifyContent: "center",
  },
  track: {
    height: 3,
    backgroundColor: "#E0E0E0",
    borderRadius: 2,
    width: SLIDER_WIDTH,
  },
  activeTrack: {
    position: "absolute",
    height: 3,
    backgroundColor: "#000",
    borderRadius: 2,
  },
  thumb: {
    position: "absolute",
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#000",
    borderWidth: 2,
    borderColor: "#FFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 18,
    marginTop: 20,
  },
  resetBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#F5F7FA",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  resetText: {
    fontSize: 14,
    fontFamily: "SFProDisplay-Semibold",
    color: "#666",
  },
  applyBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#000",
    alignItems: "center",
  },
  applyText: {
    fontSize: 14,
    fontFamily: "SFProDisplay-Semibold",
    color: "#FFF",
  },
});
