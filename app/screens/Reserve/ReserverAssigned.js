import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Modal,
  TextInput,
  Dimensions,
  RefreshControl,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import {
  ArrowLeft,
  MapPin,
  Clock,
  Car,
  MessageCircle,
  MoveVertical as MoreVertical,
  Navigation,
  Star,
  Phone,
  CircleCheck as CheckCircle,
  CircleAlert as AlertCircle,
  Shield,
  Headphones,
  X,
  RefreshCw,
  DollarSign,
} from "lucide-react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import axios from "axios";
import { API_URL_APP, API_URL_APP_CHAT } from "../../constant/api";
import {
  formatDate,
  formatTime,
  calculateDistance,
  decodePolyline,
} from "../../utils/utils";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { LinearGradient } from "expo-linear-gradient";
import useDriverStore from "../../store/driver.store";
import * as Location from "expo-location";

const { width } = Dimensions.get("window");
const GOOGLE_API_KEY = "AIzaSyCuSV_62nxNHBjLQ_Fp-rSTgRUw9m2vzhM";

const ReserveRideDetailsAssigned = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { rideId } = route.params;
  const { driver, fetchDriverDetails } = useDriverStore();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useContext(BottomTabBarHeightContext) || 0;
  // State Management
  const [routeCoords, setRouteCoords] = useState([]);
  const [rideData, setRideData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [distance, setDistance] = useState(0);
  const [duration, setDuration] = useState(0);
  const [mapRegion, setMapRegion] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);

  // Modal States
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Form States
  const [otp, setOtp] = useState("");
  const [collectedAmount, setCollectedAmount] = useState("");
  const [otpType, setOtpType] = useState(""); // 'pickup' or 'drop'

  // Check if this is my ride
  const isMyRide = rideData?.assignedDriverId?._id === driver?._id;

  const estimateDuration = (distanceKm) =>
    parseFloat((distanceKm / 50).toFixed(2));

  // Get current location
  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission denied", "Location permission is required");
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setCurrentLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch (error) {
      console.error("Error getting location:", error);
    }
  };

  // Check if driver is near location
  const isNearLocation = (targetLocation, threshold = 0.5) => {
    if (!currentLocation || !targetLocation?.coordinates) return false;

    const [lng, lat] = targetLocation.coordinates;
    const distance = calculateDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      lat,
      lng
    );

    return distance <= threshold; // Within 500 meters
  };

  const calculateMapRegionAndRoute = async (data) => {
    const pickupLat = data.pickupLocation.coordinates[1];
    const pickupLng = data.pickupLocation.coordinates[0];
    const dropLat = data.dropLocation.coordinates[1];
    const dropLng = data.dropLocation.coordinates[0];

    const centerLat = (pickupLat + dropLat) / 2;
    const centerLng = (pickupLng + dropLng) / 2;
    const latDelta = Math.abs(pickupLat - dropLat) * 3 || 0.05;
    const lngDelta = Math.abs(pickupLng - dropLng) * 3 || 0.05;

    setMapRegion({
      latitude: centerLat,
      longitude: centerLng,
      latitudeDelta: Math.max(latDelta, 0.05),
      longitudeDelta: Math.max(lngDelta, 0.05),
    });

    await fetchGoogleRoute(pickupLat, pickupLng, dropLat, dropLng);
  };

  const fetchRideDetails = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      setRefreshing(!showLoader);

      await fetchDriverDetails();
      const { data } = await axios.get(
        `${API_URL_APP}/api/v1/post-rides/${rideId}`
      );

      if (data.success) {
        const ride = data.data;
        console.log("contactType", ride?.contactType);

        setRideData(ride);

        const [pickupLng, pickupLat] = ride.pickupLocation.coordinates;
        const [dropLng, dropLat] = ride.dropLocation.coordinates;

        const dist = calculateDistance(pickupLat, pickupLng, dropLat, dropLng);
        setDistance(dist);
        setDuration(estimateDuration(dist));

        calculateMapRegionAndRoute(ride);
      }
    } catch (error) {
      console.error("Error fetching ride:", error);
      Alert.alert("Error", "Failed to load ride details");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRideDetails();
    getCurrentLocation();
  }, [rideId]);

  const fetchGoogleRoute = async (origLat, origLng, destLat, destLng) => {
    try {
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origLat},${origLng}&destination=${destLat},${destLng}&key=${GOOGLE_API_KEY}&mode=driving`;
      const res = await fetch(url);
      const json = await res.json();

      if (json.routes?.[0]?.overview_polyline?.points) {
        setRouteCoords(decodePolyline(json.routes[0].overview_polyline.points));
      }
    } catch (err) {
      console.log("Directions API failed, using straight line");
      if (rideData) {
        setRouteCoords([
          {
            latitude: rideData.pickupLocation.coordinates[1],
            longitude: rideData.pickupLocation.coordinates[0],
          },
          {
            latitude: rideData.dropLocation.coordinates[1],
            longitude: rideData.dropLocation.coordinates[0],
          },
        ]);
      }
    }
  };

  // Driver Actions
  const handleReachedPickup = () => {
    if (isNearLocation(rideData.pickupLocation)) {
      updateRideStatus("reached-pickup");
    } else {
      setOtpType("pickup");
      setShowOtpModal(true);
    }
  };

  const handleReachedDrop = () => {
    if (isNearLocation(rideData.dropLocation)) {
      setShowCollectionModal(true);
    } else {
      setOtpType("drop");
      setShowOtpModal(true);
    }
  };

  const updateRideStatus = async (status) => {
    try {
      const { data } = await axios.patch(
        `${API_URL_APP}/api/v1/rides/${rideId}/status`,
        { status }
      );

      if (data.success) {
        setRideData((prev) => ({ ...prev, rideStatus: status }));
        if (status === "completed") {
          setShowSuccessModal(true);
        }
      }
    } catch (error) {
      Alert.alert("Error", "Failed to update ride status");
    }
  };

  const verifyOtp = async () => {
    if (otp.length !== 4) {
      Alert.alert("Error", "Please enter a valid 4-digit OTP");
      return;
    }

    try {
      const { data } = await axios.post(
        `${API_URL_APP}/api/v1/rides/${rideId}/verify-otp`,
        { otp, type: otpType }
      );

      if (data.success) {
        setShowOtpModal(false);
        setOtp("");

        if (otpType === "pickup") {
          updateRideStatus("reached-pickup");
        } else {
          setShowCollectionModal(true);
        }
      } else {
        Alert.alert("Error", "Invalid OTP");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to verify OTP");
    }
  };

  const completeRide = async () => {
    if (!collectedAmount || parseFloat(collectedAmount) <= 0) {
      Alert.alert("Error", "Please enter a valid collection amount");
      return;
    }

    try {
      const { data } = await axios.patch(
        `${API_URL_APP}/api/v1/rides/${rideId}/complete`,
        { collectedAmount: parseFloat(collectedAmount) }
      );

      if (data.success) {
        setShowCollectionModal(false);
        updateRideStatus("completed");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to complete ride");
    }
  };

  const initChat = async () => {
    try {
      const response = await axios.post(`${API_URL_APP_CHAT}/api/chat/init`, {
        init_driver_id: driver?._id,
        ride_post_id: rideId,
        other_driver_id: rideData?.driverPostId?._id,
      });

      if (response.data?.success) {
        navigation.navigate("chat");
      }
    } catch (error) {
      console.log("Chat Init Error:", error);
    }
  };

  const handleMoreOptions = (option) => {
    setShowMoreOptions(false);

    switch (option) {
      case "police":
        Linking.openURL("tel:100");
        break;
      case "support":
        Linking.openURL("tel:+911234567890"); // Replace with actual support number
        break;
      case "cancel":
        Alert.alert(
          "Cancel Ride",
          "Are you sure you want to cancel this ride?",
          [
            { text: "No", style: "cancel" },
            { text: "Yes", onPress: () => updateRideStatus("cancelled") },
          ]
        );
        break;
      case "refresh":
        fetchRideDetails(false);
        break;
    }
  };

  const getExtraRequirements = (req) => {
    const items = [];
    if (req?.onlyDiesel) items.push("Only Diesel");
    if (req?.carrier) items.push("With Carrier");
    if (req?.allInclusive) items.push("All Inclusive");
    if (req?.musicSystem) items.push("Music System");
    if (req?.ac) items.push("AC");
    if (req?.foodAllowed) items.push("Food Allowed");
    return items.length ? items.join(", ") : "None";
  };

  const getStatusColor = (status) => {
    const colors = {
      "driver-assigned": "#DC2626",
      "reached-pickup": "#D97706",
      "in-progress": "#059669",
      completed: "#10B981",
      cancelled: "#6B7280",
    };
    return colors[status] || "#6B7280";
  };

  const getStatusText = (status) => {
    const texts = {
      "driver-assigned": "Driver Assigned",
      "reached-pickup": "Reached Pickup",
      "in-progress": "In Progress",
      completed: "Completed",
      cancelled: "Cancelled",
    };
    return texts[status] || status;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#DC2626" />
          <Text style={styles.loadingText}>Loading ride details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!rideData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.errorText}>Failed to load ride details</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { paddingBottom: insets.bottom }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={24} color="#1F2937" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Trip Details</Text>
          <Text style={styles.headerSubtitle}>
            {formatDate(rideData.pickupDate)} •{" "}
            {formatTime(rideData.pickupTime)}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.moreButton}
          onPress={() => setShowMoreOptions(true)}
        >
          <MoreVertical size={24} color="#1F2937" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ paddingBottom: insets.bottom +20 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchRideDetails(false)}
            colors={["#DC2626"]}
            tintColor="#DC2626"
          />
        }
      >
        {/* Status Card */}
        <View style={styles.statusCard}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(rideData.rideStatus) },
            ]}
          >
            <Text style={styles.statusText}>
              {getStatusText(rideData.rideStatus)}
            </Text>
          </View>
          {rideData.paymentStatus === "completed" && (
            <View style={styles.paidBadge}>
              <CheckCircle size={16} color="#10B981" />
              <Text style={styles.paidText}>Payment Completed</Text>
            </View>
          )}
        </View>

        {/* Map */}
        <View style={styles.mapContainer}>
          {mapRegion ? (
            <MapView
              provider={PROVIDER_GOOGLE}
              style={styles.map}
              region={mapRegion}
            >
              <Marker
                coordinate={{
                  latitude: rideData.pickupLocation.coordinates[1],
                  longitude: rideData.pickupLocation.coordinates[0],
                }}
              >
                <View style={styles.pickupMarker}>
                  <Navigation size={18} color="#fff" />
                </View>
              </Marker>
              <Marker
                coordinate={{
                  latitude: rideData.dropLocation.coordinates[1],
                  longitude: rideData.dropLocation.coordinates[0],
                }}
              >
                <View style={styles.dropMarker}>
                  <MapPin size={18} color="#DC2626" fill="#DC2626" />
                </View>
              </Marker>
              {routeCoords.length > 0 && (
                <Polyline
                  coordinates={routeCoords}
                  strokeColor="#DC2626"
                  strokeWidth={5}
                  lineCap="round"
                />
              )}
            </MapView>
          ) : (
            <View style={styles.mapPlaceholder}>
              <ActivityIndicator size="large" color="#DC2626" />
              <Text style={styles.mapText}>Loading Map...</Text>
            </View>
          )}
        </View>

        {/* Driver Info Card */}
        <View style={styles.card}>
          <View style={styles.driverHeader}>
            <View style={styles.driverInfo}>
              <View style={styles.avatarContainer}>
                {rideData?.assignedDriverId?.profile_image ? (
                  <Image
                    source={{ uri: rideData.assignedDriverId.profile_image }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <LinearGradient
                    colors={["#DC2626", "#B91C1C"]}
                    style={styles.avatar}
                  >
                    <Text style={styles.avatarText}>
                      {(rideData?.assignedDriverId?.driver_name || "D").charAt(
                        0
                      )}
                    </Text>
                  </LinearGradient>
                )}
              </View>
              <View style={styles.driverDetails}>
                <Text style={styles.driverName}>
                  {rideData?.assignedDriverId?.driver_name || "Driver"}
                </Text>
                <Text style={styles.driverPhone}>
                  {rideData?.assignedDriverId?.driver_contact_number}
                </Text>
                {rideData?.assignedDriverId?.average_rating > 0 && (
                  <View style={styles.ratingContainer}>
                    <Star size={14} color="#DC2626" fill="#DC2626" />
                    <Text style={styles.ratingText}>
                      {rideData.assignedDriverId.average_rating}
                    </Text>
                  </View>
                )}
              </View>
            </View>
            <View style={styles.contactButtons}>
              <TouchableOpacity
                style={styles.phoneButton}
                onPress={() => {
                  const phone =
                    rideData?.assignedDriverId?.driver_contact_number;
                  if (phone) Linking.openURL(`tel:${phone}`);
                }}
              >
                <Phone size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Earnings Card - Only show if has commission */}
        {rideData.commissionAmount > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Earnings Breakdown</Text>
            <View style={styles.earningsSection}>
              <View style={styles.earningItem}>
                <Text style={styles.earningAmount}>
                  ₹{Number(rideData.totalAmount || 0).toLocaleString()}
                </Text>
                <Text style={styles.earningLabel}>Total Amount</Text>
              </View>
              <View style={styles.earningDivider} />
              <View style={styles.earningItem}>
                <Text style={styles.earningAmount}>
                  ₹{Number(rideData.commissionAmount || 0).toLocaleString()}
                </Text>
                <Text style={styles.earningLabel}>Commission</Text>
              </View>
              <View style={styles.earningDivider} />
              <View style={styles.earningItem}>
                <Text style={styles.earningAmountGreen}>
                  ₹{Number(rideData.driverEarning || 0).toLocaleString()}
                </Text>
                <Text style={styles.earningLabel}>Your Earning</Text>
              </View>
            </View>
          </View>
        )}

        {/* Trip Info Card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Trip Information</Text>
          <View style={styles.tripInfoGrid}>
            <View style={styles.tripInfoItem}>
              <Car size={20} color="#6B7280" />
              <Text style={styles.tripInfoLabel}>Vehicle</Text>
              <Text style={styles.tripInfoValue}>
                {rideData.vehicleType?.charAt(0).toUpperCase() +
                  rideData.vehicleType?.slice(1)}
              </Text>
            </View>
            <View style={styles.tripInfoItem}>
              <Clock size={20} color="#6B7280" />
              <Text style={styles.tripInfoLabel}>Duration</Text>
              <Text style={styles.tripInfoValue}>{duration}h</Text>
            </View>
            <View style={styles.tripInfoItem}>
              <Navigation size={20} color="#6B7280" />
              <Text style={styles.tripInfoLabel}>Distance</Text>
              <Text style={styles.tripInfoValue}>{distance} km</Text>
            </View>
            <View style={styles.tripInfoItem}>
              <DollarSign size={20} color="#6B7280" />
              <Text style={styles.tripInfoLabel}>Amount</Text>
              <Text style={styles.tripInfoValue}>₹{rideData.totalAmount}</Text>
            </View>
          </View>
        </View>

        {/* Locations Card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Route Details</Text>
          <View style={styles.locationItem}>
            <View style={styles.locationDotGreen} />
            <View style={styles.locationTextContainer}>
              <Text style={styles.locationLabel}>Pickup Location</Text>
              <Text style={styles.locationText}>{rideData.pickupAddress}</Text>
            </View>
          </View>
          <View style={styles.locationDivider} />
          <View style={styles.locationItem}>
            <MapPin size={16} color="#DC2626" />
            <View style={styles.locationTextContainer}>
              <Text style={styles.locationLabel}>Drop Location</Text>
              <Text style={styles.locationText}>{rideData.dropAddress}</Text>
            </View>
          </View>
        </View>

        {/* Extra Requirements */}
        {rideData.extraRequirements && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Extra Requirements</Text>
            <Text style={styles.requirementsText}>
              {getExtraRequirements(rideData.extraRequirements)}
            </Text>
          </View>
        )}

        {/* Notes */}
        {rideData.notes && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.notesText}>{rideData.notes}</Text>
          </View>
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Action Buttons - Only show for my rides */}
      {isMyRide && (
        <View style={styles.actionContainer}>
          {rideData.rideStatus === "driver-assigned" && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleReachedPickup}
            >
              <Text style={styles.actionButtonText}>I Reached at Pickup</Text>
            </TouchableOpacity>
          )}

          {rideData.rideStatus === "reached-pickup" && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleReachedDrop}
            >
              <Text style={styles.actionButtonText}>I Reached at Drop</Text>
            </TouchableOpacity>
          )}

          {!isMyRide && (
            <TouchableOpacity style={styles.chatButton} onPress={initChat}>
              <MessageCircle size={20} color="#fff" />
              <Text style={styles.chatButtonText}>Chat with Driver</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* More Options Modal */}
      <Modal
        visible={showMoreOptions}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMoreOptions(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={() => setShowMoreOptions(false)}
        >
          <View style={styles.moreOptionsModal}>
            <TouchableOpacity
              style={styles.moreOption}
              onPress={() => handleMoreOptions("refresh")}
            >
              <RefreshCw size={20} color="#6B7280" />
              <Text style={styles.moreOptionText}>Refresh Ride</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.moreOption}
              onPress={() => handleMoreOptions("police")}
            >
              <Shield size={20} color="#DC2626" />
              <Text style={styles.moreOptionText}>Call Police</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.moreOption}
              onPress={() => handleMoreOptions("support")}
            >
              <Headphones size={20} color="#059669" />
              <Text style={styles.moreOptionText}>TaxiSafar Support</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.moreOption, styles.cancelOption]}
              onPress={() => handleMoreOptions("cancel")}
            >
              <X size={20} color="#DC2626" />
              <Text style={[styles.moreOptionText, styles.cancelText]}>
                Cancel Ride
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* OTP Modal */}
      <Modal
        visible={showOtpModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowOtpModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.otpModal}>
            <Text style={styles.otpTitle}>Enter OTP</Text>
            <Text style={styles.otpSubtitle}>
              Please enter the OTP provided by the customer
            </Text>

            <TextInput
              style={styles.otpInput}
              value={otp}
              onChangeText={setOtp}
              placeholder="Enter 4-digit OTP"
              keyboardType="numeric"
              maxLength={4}
            />

            <View style={styles.otpButtons}>
              <TouchableOpacity
                style={styles.otpCancelButton}
                onPress={() => setShowOtpModal(false)}
              >
                <Text style={styles.otpCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.otpVerifyButton}
                onPress={verifyOtp}
              >
                <Text style={styles.otpVerifyText}>Verify</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Collection Modal */}
      <Modal
        visible={showCollectionModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCollectionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.collectionModal}>
            <Text style={styles.collectionTitle}>Collect Payment</Text>
            <Text style={styles.collectionSubtitle}>
              Enter the amount collected from customer
            </Text>

            <TextInput
              style={styles.collectionInput}
              value={collectedAmount}
              onChangeText={setCollectedAmount}
              placeholder={`₹${rideData.totalAmount}`}
              keyboardType="numeric"
            />

            <View style={styles.collectionButtons}>
              <TouchableOpacity
                style={styles.collectionCancelButton}
                onPress={() => setShowCollectionModal(false)}
              >
                <Text style={styles.collectionCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.collectionConfirmButton}
                onPress={completeRide}
              >
                <Text style={styles.collectionConfirmText}>Complete Ride</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successModal}>
            <CheckCircle size={60} color="#10B981" />
            <Text style={styles.successTitle}>Ride Completed!</Text>
            <Text style={styles.successSubtitle}>
              You have successfully completed this ride
            </Text>

            <TouchableOpacity
              style={styles.successButton}
              onPress={() => {
                setShowSuccessModal(false);
                navigation.goBack();
              }}
            >
              <Text style={styles.successButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "500",
  },
  errorText: {
    fontSize: 16,
    color: "#DC2626",
    fontWeight: "500",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
    fontWeight: "500",
  },
  moreButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
  },

  // Status Card
  statusCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  paidBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  paidText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#059669",
  },

  // Map
  mapContainer: {
    margin: 20,
    height: 200,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  mapText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
  },

  pickupMarker: {
    backgroundColor: "#10B981",
    padding: 8,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: "#FFFFFF",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  dropMarker: {
    backgroundColor: "#FFFFFF",
    padding: 8,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: "#DC2626",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },

  // Cards
  card: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },

  // Driver Info
  driverHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  driverInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 16,
    resizeMode: "cover",
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 4,
  },
  driverPhone: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "600",
  },

  contactButtons: {
    flexDirection: "row",
    gap: 8,
  },
  phoneButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#DC2626",
    justifyContent: "center",
    alignItems: "center",
  },

  // Earnings
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 16,
  },
  earningsSection: {
    flexDirection: "row",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
  },
  earningItem: {
    flex: 1,
    alignItems: "center",
  },
  earningAmount: {
    fontSize: 18,
    fontWeight: "800",
    color: "#DC2626",
    marginBottom: 4,
  },
  earningAmountGreen: {
    fontSize: 18,
    fontWeight: "800",
    color: "#059669",
    marginBottom: 4,
  },
  earningLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
    textAlign: "center",
  },
  earningDivider: {
    width: 1,
    height: 40,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 16,
  },

  // Trip Info Grid
  tripInfoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  tripInfoItem: {
    flex: 1,
    minWidth: "45%",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  tripInfoLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tripInfoValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },

  // Locations
  locationItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginVertical: 8,
  },
  locationDotGreen: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#10B981",
    marginTop: 4,
    marginRight: 12,
  },
  locationTextContainer: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  locationText: {
    fontSize: 14,
    color: "#1F2937",
    lineHeight: 20,
    fontWeight: "500",
  },
  locationDivider: {
    height: 20,
    width: 2,
    backgroundColor: "#E5E7EB",
    marginLeft: 6,
    marginVertical: 8,
  },

  requirementsText: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
    fontWeight: "500",
  },
  notesText: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
    fontStyle: "italic",
  },

  // Action Container
  actionContainer: {
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  actionButton: {
    backgroundColor: "#DC2626",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  chatButton: {
    backgroundColor: "#1F2937",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  chatButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },

  // More Options Modal
  moreOptionsModal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 8,
    minWidth: 200,
    marginHorizontal: 20,
  },
  moreOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  moreOptionText: {
    fontSize: 16,
    color: "#1F2937",
    fontWeight: "500",
  },
  cancelOption: {
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  cancelText: {
    color: "#DC2626",
  },

  // OTP Modal
  otpModal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 20,
    minWidth: width * 0.8,
  },
  otpTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    textAlign: "center",
    marginBottom: 8,
  },
  otpSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  otpInput: {
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 18,
    textAlign: "center",
    marginBottom: 24,
    fontWeight: "600",
  },
  otpButtons: {
    flexDirection: "row",
    gap: 12,
  },
  otpCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  otpCancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
  },
  otpVerifyButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#DC2626",
    alignItems: "center",
  },
  otpVerifyText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // Collection Modal
  collectionModal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 20,
    minWidth: width * 0.8,
  },
  collectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    textAlign: "center",
    marginBottom: 8,
  },
  collectionSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  collectionInput: {
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 18,
    textAlign: "center",
    marginBottom: 24,
    fontWeight: "600",
  },
  collectionButtons: {
    flexDirection: "row",
    gap: 12,
  },
  collectionCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  collectionCancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
  },
  collectionConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#059669",
    alignItems: "center",
  },
  collectionConfirmText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // Success Modal
  successModal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 32,
    marginHorizontal: 20,
    alignItems: "center",
    minWidth: width * 0.8,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1F2937",
    textAlign: "center",
    marginTop: 16,
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 24,
  },
  successButton: {
    backgroundColor: "#059669",
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 120,
  },
  successButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
  },

  bottomSpacing: {
    height: 20,
  },
});

export default ReserveRideDetailsAssigned;
