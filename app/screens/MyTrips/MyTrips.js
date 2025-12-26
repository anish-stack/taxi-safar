import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  KeyboardAvoidingView,
  TextInput,
  Modal,
  ScrollView,
  Pressable,
  RefreshControl,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ChevronLeft,
  MessageCircle,
  Filter,
  AlertCircle,
  X,
  Edit2,
  Trash2,
  Calendar,
} from "lucide-react-native";
import axios from "axios";
import loginStore from "../../store/auth.store";
import { API_URL_APP } from "../../constant/api";
import DriverPost from "../Reserve/DriverPost";
import RideCard from "../Reserve/RideCard";
import useDriverStore from "../../store/driver.store";
import { calculateDistance, formatTimeWithLeadingZero } from "../../utils/utils";
import DateTimePicker from "@react-native-community/datetimepicker";

const MAX_PRICE = 100000;
const SLIDER_WIDTH = 300;

const MainTabs = [
  {
    id: "reserved_tab",
    label: "Reserved Rides",
  },
  {
    id: "post_rides_tab",
    label: "Post Rides",
  },
];

// Tabs for Reserved Rides
const reservedTabs = [
  { id: "pending", label: "Pending" },
  { id: "started", label: "Active" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
];

// Tabs for Post Rides
const postRidesTabs = [
  { id: "pending", label: "Pending" },
  { id: "active", label: "Active" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
];

export default function MyTrips({ navigation }) {
  const { token } = loginStore();
  const { driver, fetchDriverDetails } = useDriverStore();
  const [activeMainTab, setActiveMainTab] = useState("reserved_tab");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Reserved Rides Data
  const [reservedRidesData, setReservedRidesData] = useState(null);
  const [reservedPagination, setReservedPagination] = useState({
    page: 1,
    limit: 20,
    totalPages: 1,
  });

  // My Post Rides Data
  const [myPostRides, setMyPostRides] = useState([]);
  const [myPostsPagination, setMyPostsPagination] = useState({
    page: 1,
    limit: 10,
    totalPages: 1,
    totalRides: 0,
  });
  const [loadingMore, setLoadingMore] = useState(false);

  // UI States
  const [activeReservedTab, setActiveReservedTab] = useState("pending");
  const [activePostRideTab, setActivePostRideTab] = useState("pending");
  const [location, setLocation] = useState("");

  const [filterVisible, setFilterVisible] = useState(false);

  // Add these state variables in the component
  const [issueModalVisible, setIssueModalVisible] = useState(false);
  const [selectedRideForIssue, setSelectedRideForIssue] = useState(null);
  const [issueText, setIssueText] = useState("");
  const [issueLoading, setIssueLoading] = useState(false);
  const [locationInput, setLocationInput] = useState("");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  // Filter States

  // State variables (add these to your component)
  const [filters, setFilters] = useState({
    tripType: "all",
    sortBy: "newest",
    location: "",
    startDate: null,
    endDate: null,
  });
  const [tempFilters, setTempFilters] = useState(filters);

  // Fetch Reserved Rides (taxi_safari + assigned rides_post)
  const fetchReservedRides = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    fetchDriverDetails();
    try {
      const res = await axios.get(
        `${API_URL_APP}/api/v1/get-my-assigned-rides-two/${driver?._id}?type=reserved&page=${reservedPagination.page}&limit=${reservedPagination.limit}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.data?.success) {
        setReservedRidesData(res.data.data || []);

        setReservedPagination({
          page: res.data.data?.reserved_rides.pagination?.page || 1,
          limit: res.data.data?.reserved_rides.pagination?.limit || 20,
          totalPages:
            res.data.data?.reserved_rides.pagination?.total_pages || 1,
        });
      }
    } catch (error) {
      console.log("❌ Fetch Reserved Rides Error:", error.response?.data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch My Posted Rides
  const fetchMyPostRides = async (page = 1, showLoader = true) => {
    if (showLoader && page === 1) setLoading(true);
    if (page > 1) setLoadingMore(true);

    try {
      const res = await axios.get(
        `${API_URL_APP}/api/v1/get-my-assigned-rides-two/${driver?._id}?type=my_posts&page=${page}&limit=${myPostsPagination.limit}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.data?.success) {
        const newRides = res.data.data?.my_posts?.rides || [];

        if (page === 1) {
          setMyPostRides(newRides);
        } else {
          setMyPostRides((prev) => [...prev, ...newRides]);
        }

        setMyPostsPagination({
          page: res.data.data?.my_posts?.pagination?.current_page || 1,
          limit: res.data.data?.my_posts?.pagination?.rides_per_page || 10,
          totalPages: res.data.data?.my_posts?.pagination?.total_pages || 1,
          totalRides: res.data.data?.my_posts?.pagination?.total_rides || 0,
        });
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
    fetchReservedRides();
    fetchMyPostRides();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    if (activeMainTab === "post_rides_tab") {
      fetchMyPostRides(1, false);
    } else {
      fetchReservedRides(false);
    }
  };

  const loadMoreMyPosts = () => {
    if (!loadingMore && myPostsPagination.page < myPostsPagination.totalPages) {
      fetchMyPostRides(myPostsPagination.page + 1, false);
    }
  };

  const handleReportIssue = async () => {
    if (!issueText.trim()) {
      Alert.alert("Error", "Please describe the issue");
      return;
    }

    setIssueLoading(true);
    try {
      const res = await axios.post(
        `${API_URL_APP}/api/v1/report-ride-issue/${selectedRideForIssue._id}`,
        {
          issue: issueText.trim(),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.data?.success) {
        Alert.alert("Success", "Issue reported successfully");
        setIssueModalVisible(false);
        setIssueText("");
        setSelectedRideForIssue(null);
        if (activeMainTab === "post_rides_tab") {
          fetchMyPostRides(1, false);
        } else {
          fetchReservedRides(false);
        }
      }
    } catch (error) {
      console.log("❌ Report Issue Error:", error);
      Alert.alert("Error", "Failed to report issue");
    } finally {
      setIssueLoading(false);
    }
  };

  const openIssueModal = (ride) => {
    setSelectedRideForIssue(ride);
    setIssueText("");
    setIssueModalVisible(true);
  };

  const formatDate = (date) => {
    if (!date) return "Select date";
    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Handle Start Date
  const handleStartDateChange = (event, selectedDate) => {
    setShowStartDatePicker(false);
    if (selectedDate) {
      setTempFilters({ ...tempFilters, startDate: selectedDate });
    }
  };

  // Handle End Date
  const handleEndDateChange = (event, selectedDate) => {
    setShowEndDatePicker(false);
    if (selectedDate) {
      setTempFilters({ ...tempFilters, endDate: selectedDate });
    }
  };

  // Filter rides by status
  const filterRidesByStatus = (rides, status) => {
    if (!rides) return [];
    // Map UI status to actual rideStatus values
    const statusMapping = {
      pending: ["driver-assigned", "pending"],
      active: ["started", "driver-assigned"],
      "driver-assigned": ["driver-assigned"],
      "driver-accepted": ["driver-accepted"],
      "driver-rejected": ["driver-rejected"],
      completed: ["completed"],
      cancelled: [
        "cancelled-by-customer",
        "cancelled-by-driver",
        "cancelled-by-admin",
      ],
      "no-show": ["no-show"],
      failed: ["failed"],
    };

    // Get the actual statuses to match
    const validStatuses = statusMapping[status.toLowerCase()] || [
      status.toLowerCase(),
    ];

    return rides.filter((ride) => {
      const rideStatus =
        ride.type === "taxi_safari" ? ride.trip_status : ride.rideStatus;
      console.log("Filtering rides by status:", status, rideStatus);

      return validStatuses.includes(rideStatus?.toLowerCase());
    });
  };

  const applyFilters = (rides) => {
    if (!rides) return [];
    let filtered = [...rides];

    // Location filter
    if (filters.location.trim()) {
      filtered = filtered.filter((ride) => {
        const fromMatch =
          ride.type === "taxi_safari"
            ? ride.pickup_address
              ?.toLowerCase()
              .includes(filters.location.toLowerCase())
            : ride.pickupAddress
              ?.toLowerCase()
              .includes(filters.location.toLowerCase());

        const toMatch =
          ride.type === "taxi_safari"
            ? ride.destination_address
              ?.toLowerCase()
              .includes(filters.location.toLowerCase())
            : ride.dropAddress
              ?.toLowerCase()
              .includes(filters.location.toLowerCase());

        return fromMatch || toMatch;
      });
    }

    // Date range filter
    if (filters.startDate || filters.endDate) {
      filtered = filtered.filter((ride) => {
        const rideDate = new Date(
          ride.type === "taxi_safari" ? ride.scheduled_time : ride.pickupDate
        );

        if (filters.startDate) {
          const startDate = new Date(filters.startDate);
          startDate.setHours(0, 0, 0, 0);
          if (rideDate < startDate) return false;
        }

        if (filters.endDate) {
          const endDate = new Date(filters.endDate);
          endDate.setHours(23, 59, 59, 999);
          if (rideDate > endDate) return false;
        }

        return true;
      });
    }

    // Trip type filter
    if (filters.tripType !== "all") {
      filtered = filtered.filter((ride) => {
        if (ride.type === "taxi_safari") {
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

    // Sort
    if (filters.sortBy === "newest") {
      filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (filters.sortBy === "priceLow") {
      filtered.sort((a, b) => {
        const priceA =
          a.type === "taxi_safari"
            ? parseFloat(a.original_amount)
            : parseFloat(a.totalAmount);
        const priceB =
          b.type === "taxi_safari"
            ? parseFloat(b.original_amount)
            : parseFloat(b.totalAmount);
        return priceA - priceB;
      });
    } else if (filters.sortBy === "priceHigh") {
      filtered.sort((a, b) => {
        const priceA =
          a.type === "taxi_safari"
            ? parseFloat(a.original_amount)
            : parseFloat(a.totalAmount);
        const priceB =
          b.type === "taxi_safari"
            ? parseFloat(b.original_amount)
            : parseFloat(b.totalAmount);
        return priceB - priceA;
      });
    }

    return filtered;
  };

  // Get filtered reserved rides
  const getReservedRides = () => {
    const rides = reservedRidesData?.reserved_rides?.rides || [];
    const allRides = rides.map((r) => ({
      ...r,
      type: r.type || "rides_post",
    }));

    const filtered = filterRidesByStatus(allRides, activeReservedTab);

    const finalRides = applyFilters(filtered);

    return finalRides;
  };

  // Get filtered my post rides
  const getMyPostRides = () => {
    const filtered = filterRidesByStatus(myPostRides, activePostRideTab);
    return applyFilters(filtered);
  };

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
      tripType={`${item.tripType === "one-way" ? "One Way Trip" : "Round Trip"
        } - ${item.distance || "60"}Km`}
      status={item?.trip_status}
      pickup={item.pickup_address}
      drop={item.destination_address}
      item={item}
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

  const renderRidesPostAssignedRide = ({ item }) => {
    return (
      <View>
        <DriverPost
          _id={item._id}
          vehicleName={item.vehicleType || "Vehicle"}
          assignedStatus={item.rideStatus}
          vehicleType={item.vehicleType}
          status={item?.rideStatus}
          totalAmount={`₹${item.totalAmount}`}
          locationPickup={item?.pickupLocation}
          locationDrop={item?.dropLocation}
          commission={`₹${item.commissionAmount}`}
          driverEarning={`₹${item.driverEarning}`}
          pickup={item.pickupAddress}
          drop={item.dropAddress}
          tripType={`${item.tripType === "one-way" ? "One Way Trip" : "Round Trip"
            } - ${item?.distanceKm || "60"} Km`}
          date={new Date(item.pickupDate).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
          time={new Date(item.pickupDate).toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
          })}
          onPress={() =>
            navigation.navigate("ReserveRideDetailsAssigned", {
              rideId: item._id,
              type: "assigned",
            })
          }
        />
        {item.rideStatus === "completed" && (
          <View style={styles.issueButtonContainer}>
            {item.issue ? (
              <View style={styles.issueStatusBadge}>
                <AlertCircle size={14} color="#FF6B6B" />
                {item.issue && (
                  <Text style={styles.issueStatusText}>{item.issue}</Text>
                )}

                <Text style={styles.issueStatusText}>
                  {item.issueSolved ? "Issue Resolved" : "Issue Reported"}
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.issueButton}
                onPress={() => openIssueModal(item)}
                activeOpacity={0.7}
              >
                <AlertCircle size={14} color="#FFF" />
                <Text style={styles.issueButtonText}>Report Issue</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderMyPostedRide = ({ item }) => {
    const findDistance = (ride) => {
      const [pickupLng, pickupLat] = ride.pickupLocation?.coordinates || [0, 0];
      const [dropLng, dropLat] = ride.dropLocation?.coordinates || [0, 0];
      return calculateDistance(pickupLat, pickupLng, dropLat, dropLng);
    };


    const d = findDistance(item);

    return (
      <View style={styles.myPostCard}>
        <View style={styles.postedByMeBadge}>
          <Text style={styles.postedByMeText}>Posted By Self</Text>
        </View>
        <DriverPost
          _id={item._id}
          vehicleName={item.vehicleType || "Vehicle"}
          assignedStatus={item.rideStatus}
          vehicleType={item.vehicleType}
          status={item?.rideStatus}
          totalAmount={`₹${item.totalAmount}`}
          locationPickup={item?.pickupLocation}
          locationDrop={item?.dropLocation}
          commission={`₹${item.commissionAmount}`}
          driverEarning={`₹${item.driverEarning}`}
          pickup={item.pickupAddress}
          drop={item.dropAddress}
          tripType={`${item.tripType === "one-way"
              ? `One Way Trip - ${item?.distanceKm} Km`
              : `Round Trip - ${item?.distanceKm} Km`
            }`}
          date={new Date(item.pickupDate).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
          time={formatTimeWithLeadingZero(item?.pickupTime)}
          onPress={() =>
            navigation.navigate("ReserveRideDetailsAssigned", {
              rideId: item._id,
              type: "my_post",
            })
          }
        />
        {activePostRideTab === "pending" && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => navigation.navigate("Add", { rideId: item._id })}
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
        )}
        {item.issue && <Text style={styles.issueStatusText}>{item.issue}</Text>}
        {item.issue && (
          <Text style={styles.issueStatusText}>
            {item.issueSolved ? "Issue Resolved" : "Issue Reported"}
          </Text>
        )}
      </View>
    );
  };

  const renderRide = ({ item }) => {
    if (activeMainTab === "post_rides_tab") {
      return renderMyPostedRide({ item });
    } else {
      // Reserved rides
      if (item.type === "taxi_safari") {
        return renderTaxiSafariRide({ item });
      } else {
        return renderRidesPostAssignedRide({ item });
      }
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

  const getTotalPendingRides = () => {
    const reservedRides = reservedRidesData?.reserved_rides?.rides || [];
    const pendingRides = reservedRides.filter((ride) => {
      const rideStatus =
        ride.type === "taxi_safari" ? ride.trip_status : ride.rideStatus;
      return (
        rideStatus?.toLowerCase() === "driver-assigned" ||
        rideStatus?.toLowerCase() === "pending"
      );
    });
    return pendingRides.length;
  };

  const getTotalCompletedRides = () => {
    const reservedRides = reservedRidesData?.reserved_rides?.rides || [];
    const completedRides = reservedRides.filter((ride) => {
      const rideStatus =
        ride.type === "taxi_safari" ? ride.trip_status : ride.rideStatus;
      return rideStatus?.toLowerCase() === "completed";
    });
    return completedRides.length;
  };

  const getTotalMyPosts = () => {
    return myPostRides.length;
  };
  const displayRides =
    activeMainTab === "post_rides_tab" ? getMyPostRides() : getReservedRides();

  const summary = reservedRidesData?.summary || {};
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
          onPress={() => {
            setTempFilters(filters);
            setFilterVisible(true);
          }}
        >
          <Filter size={18} color="#000" />
        </TouchableOpacity>
      </View>
      {/* Stats Summary */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{getTotalPendingRides()}</Text>
          <Text style={styles.statLabel}>Total Reserved</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{getTotalCompletedRides()}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{getTotalMyPosts()}</Text>
          <Text style={styles.statLabel}>My Posts</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>0</Text>
          <Text style={styles.statLabel}>B2C Bookings</Text>
        </View>
      </View>
      {/* MAIN TABS */}
      <View style={styles.mainTabContainer}>
        {MainTabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            onPress={() => {
              setActiveMainTab(tab.id);
              if (tab.id === "reserved_tab") {
                setActiveReservedTab("pending");
              } else {
                setActivePostRideTab("pending");
              }
            }}
            style={[
              styles.mainTab,
              activeMainTab === tab.id && styles.mainTabActive,
            ]}
          >
            <Text
              style={[
                styles.mainTabText,
                activeMainTab === tab.id && styles.mainTabTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {/* STATUS TABS */}
      <View style={styles.statusTabContainer}>
        {(activeMainTab === "reserved_tab" ? reservedTabs : postRidesTabs).map(
          (tab) => (
            <TouchableOpacity
              key={tab.id}
              onPress={() => {
                if (activeMainTab === "reserved_tab") {
                  console.log("Setting activeReservedTab to", tab.id);

                  setActiveReservedTab(tab.id);
                } else {
                  console.log("Setting activePostRideTab to", tab.id);
                  setActivePostRideTab(tab.id);
                }
              }}
              style={[
                styles.statusTab,
                (activeMainTab === "reserved_tab"
                  ? activeReservedTab
                  : activePostRideTab) === tab.id && styles.statusTabActive,
              ]}
            >
              <Text
                style={[
                  styles.statusTabText,
                  (activeMainTab === "reserved_tab"
                    ? activeReservedTab
                    : activePostRideTab) === tab.id &&
                  styles.statusTabTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          )
        )}
      </View>
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
        onEndReached={
          activeMainTab === "post_rides_tab" ? loadMoreMyPosts : null
        }
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          activeMainTab === "post_rides_tab" ? renderFooter : null
        }
        ListEmptyComponent={
          <View style={styles.emptyList}>
            <Text style={styles.emptyListIcon}>📭</Text>
            <Text style={styles.emptyListText}>No trips found</Text>
            <Text style={styles.emptyListSubtext}>
              {activeMainTab === "post_rides_tab"
                ? "You haven't posted any rides yet"
                : "No reserved rides available"}
            </Text>
          </View>
        }
      />
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
              {/* Location Input */}
              <Text style={styles.filterLabel}>Location</Text>
              <View style={styles.locationInputWrapper}>
                <TextInput
                  style={styles.locationInput}
                  placeholder="Search location..."
                  placeholderTextColor="#999"
                  value={tempFilters.location}
                  onChangeText={(text) =>
                    setTempFilters({ ...tempFilters, location: text })
                  }
                />
              </View>
              <View style={styles.dateRow}>
                {/* Start Date */}
                <View style={styles.dateColumn}>
                  <Text style={styles.filterLabel}>Start Date</Text>
                  <TouchableOpacity
                    style={styles.datePickerButton}
                    onPress={() => setShowStartDatePicker(true)}
                  >
                    <Calendar size={18} color="#666" />
                    <Text style={styles.datePickerText}>
                      {formatDate(tempFilters.startDate)}
                    </Text>
                  </TouchableOpacity>

                  {showStartDatePicker && (
                    <DateTimePicker
                      value={tempFilters.startDate || new Date()}
                      mode="date"
                      display="spinner"
                      onChange={handleStartDateChange}
                    />
                  )}
                </View>

                {/* End Date */}
                <View style={styles.dateColumn}>
                  <Text style={styles.filterLabel}>End Date</Text>
                  <TouchableOpacity
                    style={styles.datePickerButton}
                    onPress={() => setShowEndDatePicker(true)}
                  >
                    <Calendar size={18} color="#666" />
                    <Text style={styles.datePickerText}>
                      {formatDate(tempFilters.endDate)}
                    </Text>
                  </TouchableOpacity>

                  {showEndDatePicker && (
                    <DateTimePicker
                      value={tempFilters.endDate || new Date()}
                      mode="date"
                      display="spinner"
                      onChange={handleEndDateChange}
                    />
                  )}
                </View>
              </View>

              {/* Trip Type Filter */}
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

              {/* Sort By Filter */}
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
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.resetBtn}
                onPress={() => {
                  setTempFilters({
                    tripType: "all",
                    sortBy: "newest",
                    location: "",
                    startDate: null,
                    endDate: null,
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
      ;
      <Modal visible={issueModalVisible} transparent animationType="fade">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardAvoidingContainer}
        >
          <View style={styles.issueModalOverlay}>
            <View style={styles.issueModalContent}>
              <View style={styles.issueModalHeader}>
                <Text style={styles.issueModalTitle}>Report Issue</Text>
                <TouchableOpacity onPress={() => setIssueModalVisible(false)}>
                  <X size={22} color="#000" />
                </TouchableOpacity>
              </View>

              <View style={styles.issueModalBody}>
                <AlertCircle size={40} color="#FF6B6B" strokeWidth={1.5} />
                <Text style={styles.issueModalSubtitle}>
                  Sorry for the inconvenience
                </Text>

                <Text style={styles.issueInputLabel}>Describe the issue</Text>
                <TextInput
                  style={styles.issueInput}
                  placeholder="Enter issue details..."
                  placeholderTextColor="#999"
                  value={issueText}
                  onChangeText={setIssueText}
                  multiline
                  maxLength={500}
                  editable={!issueLoading}
                />
                <Text style={styles.issueCharCount}>
                  {issueText.length}/500
                </Text>
              </View>

              <View style={styles.issueModalActions}>
                <TouchableOpacity
                  style={styles.issueCancelBtn}
                  onPress={() => setIssueModalVisible(false)}
                  disabled={issueLoading}
                >
                  <Text style={styles.issueCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.issueSubmitBtn,
                    issueLoading && styles.issueSubmitBtnDisabled,
                  ]}
                  onPress={handleReportIssue}
                  disabled={issueLoading}
                >
                  {issueLoading ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.issueSubmitText}>Submit</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
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
    gap: 4,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFF",
    padding: 8,
    borderRadius: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  statValue: {
    fontSize: 14,
    fontFamily: "SFProDisplay-Bold",
    color: "#000",
    marginBottom: 2,
  },
  statLabel: {
    textAlign: "center",
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
    alignItems: "flex-end",
  },
  searchInputWrapper: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  searchLabel: {
    fontSize: 11,
    fontFamily: "SFProDisplay-Semibold",
    color: "#666",
    marginBottom: 4,
  },
  searchInput: {
    fontSize: 13,
    color: "#1A1A1A",
    fontFamily: "SFProDisplay-Regular",
    padding: 0,
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
  postedByMeBadge: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  postedByMeText: {
    fontSize: 11,
    fontFamily: "SFProDisplay-Semibold",
    color: "#2E7D32",
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
    paddingBottom: 70,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
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

  /* MAIN TABS */
  mainTabContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
  },
  mainTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  mainTabActive: {
    borderBottomWidth: 2,
    borderColor: "#000",
  },
  mainTabText: {
    color: "#9CA3AF",
    fontWeight: "500",
  },
  mainTabTextActive: {
    color: "#000",
    fontWeight: "700",
  },

  /* STATUS TABS */
  statusTabContainer: {
    flexDirection: "row",
    marginVertical: 12,
    paddingHorizontal: 16,
  },
  statusTab: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "#E5E7EB",
    marginRight: 8,
  },
  statusTabActive: {
    backgroundColor: "#000",
  },
  statusTabText: {
    color: "#374151",
    fontSize: 13,
  },
  statusTabTextActive: {
    color: "#FFF",
  },
  issueButtonContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  issueButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF6B6B",
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  issueButtonText: {
    color: "#FFF",
    fontSize: 13,
    fontFamily: "SFProDisplay-Semibold",
  },
  issueStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFE5E5",
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: "#FF6B6B",
  },
  issueStatusText: {
    color: "#FF6B6B",
    fontSize: 13,
    fontFamily: "SFProDisplay-Semibold",
  },
  keyboardAvoidingContainer: {
    flex: 1,
  },
  issueModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  issueModalContent: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 18,
    paddingHorizontal: 18,
    paddingBottom: 70,
  },
  issueModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  issueModalTitle: {
    fontSize: 18,
    fontFamily: "SFProDisplay-Bold",
    color: "#1A1A1A",
  },
  issueModalBody: {
    alignItems: "center",
    marginBottom: 20,
  },
  issueModalSubtitle: {
    fontSize: 16,
    fontFamily: "SFProDisplay-Semibold",
    color: "#1A1A1A",
    marginTop: 10,
    marginBottom: 20,
  },
  issueInputLabel: {
    alignSelf: "flex-start",
    fontSize: 13,
    fontFamily: "SFProDisplay-Semibold",
    color: "#1A1A1A",
    marginBottom: 8,
  },
  issueInput: {
    width: "100%",
    backgroundColor: "#F5F7FA",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: "SFProDisplay-Regular",
    color: "#1A1A1A",
    minHeight: 100,
    textAlignVertical: "top",
  },
  issueCharCount: {
    alignSelf: "flex-end",
    fontSize: 11,
    color: "#999",
    marginTop: 6,
    fontFamily: "SFProDisplay-Regular",
  },
  issueModalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },
  issueCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#F5F7FA",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  issueCancelText: {
    fontSize: 14,
    fontFamily: "SFProDisplay-Semibold",
    color: "#666",
  },
  issueSubmitBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#FF6B6B",
    alignItems: "center",
    justifyContent: "center",
  },
  issueSubmitBtnDisabled: {
    opacity: 0.6,
  },
  issueSubmitText: {
    fontSize: 14,
    fontFamily: "SFProDisplay-Semibold",
    color: "#FFF",
  },
  locationInputWrapper: {
    paddingHorizontal: 18,
    marginBottom: 4,
  },
  locationInput: {
    backgroundColor: "#F5F7FA",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: "SFProDisplay-Regular",
    color: "#1A1A1A",
  },
  dateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 18,
  },
  dateColumn: {
    flex: 1,
  },

  datePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    gap: 8,
    backgroundColor: "#fff",
  },
  datePickerText: {
    fontSize: 14,
    fontFamily: "SFProDisplay-Regular",
    color: "#1A1A1A",
    flex: 1,
  },
});
