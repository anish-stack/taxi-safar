"use client";

import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  KeyboardAvoidingView,
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  TextInput,
  RefreshControl,
  Platform,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import {
  ArrowLeft,
  MapPin,
  MoreVertical,
  Navigation,
  Star,
  Phone,
  MessageCircle,
  Shield,
  Headphones,
  X,
  Loader,
} from "lucide-react-native";
import Icon from "react-native-vector-icons/Ionicons";

import mini from "../../assets/mini.png";
import sedan from "../../assets/sedan.png";
import suv from "../../assets/suv.png";
import inova from "../../assets/inova.png";
import { useRoute, useNavigation } from "@react-navigation/native";
import axios from "axios";
import { API_URL_APP, API_URL_APP_CHAT } from "../../constant/api";
import {
  formatDate,
  calculateDistance,
  decodePolyline,
  formatTime12Hour,
} from "../../utils/utils";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import useDriverStore from "../../store/driver.store";
import * as Location from "expo-location";
import { scale, verticalScale, moderateScale } from "react-native-size-matters";
import loginStore from "../../store/auth.store";
import { Colors } from "../../constant/ui";

const GOOGLE_API_KEY = "AIzaSyCuSV_62nxNHBjLQ_Fp-rSTgRUw9m2vzhM";

const estimateDurationMinutes = (distanceKm) => {
  const hours = distanceKm / 50;
  return Math.round(hours * 60);
};

const getArrivalDateTime = (pickupDate, pickupTime, distanceKm) => {
  if (!pickupDate || !pickupTime || !distanceKm) return null;

  const date =
    pickupDate instanceof Date ? new Date(pickupDate) : new Date(pickupDate);
  const [hours, minutes] = pickupTime.split(":").map(Number);
  date.setHours(hours, minutes, 0, 0);

  const durationMinutes = estimateDurationMinutes(distanceKm);
  date.setMinutes(date.getMinutes() + durationMinutes);

  return date;
};

const formatTime12HourFromDate = (date) => {
  if (!date) return "TBD";
  return date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

const formatDateFromDate = (date) => {
  if (!date) return "TBD";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const ReserveRideDetailsAssigned = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { rideId } = route.params;
  const { driver, fetchDriverDetails } = useDriverStore();
  const { token } = loginStore();
  const insets = useSafeAreaInsets();

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
  const [showPaymentConfirm, setShowPaymentConfirm] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Form States
  const [customerRating, setCustomerRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);

  const estimateDuration = (distanceKm) =>
    Number.parseFloat((distanceKm / 50).toFixed(2));

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

  const vehicleImage =
    driver?.current_vehicle_id?.vehicle_type === "mini"
      ? mini
      : driver?.current_vehicle_id?.vehicle_type === "sedan"
        ? sedan
        : driver?.current_vehicle_id?.vehicle_type === "suv"
          ? suv
          : inova;



  const role = rideData?.assignedDriverId?._id === driver?._id ? "driver" : "owner"

  const vehicleSource =
    role === "driver"
      ? driver?.current_vehicle_id
      : rideData?.assignedDriverId?.current_vehicle_id;

  const VehcileNumber = vehicleSource?.vehicle_number || "";
  const VehicleName =
    vehicleSource?.vehicle_type === "mini"
      ? "Maruti WagonR"
      : vehicleSource?.vehicle_type === "sedan"
        ? "Maruti Swift Dzire"
        : vehicleSource?.vehicle_type === "suv"
          ? "Maruti Ertiga SUV"
          : vehicleSource?.vehicle_type === "muv"
            ? "Innova Crysta"
            : vehicleSource?.vehicle_name || "";

  const driverNameForOwner =
    role === "owner"
      ? rideData?.assignedDriverId?.driver_name || ""
      : "";

  const driverContactForOwner =
    role === "owner"
      ? rideData?.assignedDriverId?.driver_contact_number || ""
      : "";



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

  // ============ START RIDE ENDPOINT ============
  const handleStartRide = async () => {
    try {
      if (!rideId) {
        Alert.alert("Error", "Ride ID missing");
        return;
      }

      const response = await axios.post(
        `${API_URL_APP}/api/v1/start-trip-post/${rideId}`,
        {
          init_driver_id: driver?._id,
          ride_post_id: rideId,
          other_driver_id: rideData?.driverPostId?._id,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log("🚀 Start ride response:", response.data);

      if (response.data?.success) {
        Alert.alert("Success", "Ride started successfully");
        fetchRideDetails(false);
      }
    } catch (error) {
      console.log("❌ Start ride error:", error?.response?.data || error);

      const errorMsg = error?.response?.data?.message;

      if (errorMsg?.includes("too far")) {
        Alert.alert(
          "Reach Pickup Location",
          "You are currently far from the pickup point. Please reach within 500 meters of the pickup location to start the ride."
        );
      } else {
        Alert.alert(
          "Unable to Start Ride",
          errorMsg || "Something went wrong. Please try again."
        );
      }
    }
  };



  const successfulRides = rideData?.companyId?.successfulRides || 0;
  const cancelledRides = rideData?.companyId?.CancelRides || 0;

  const totalRides = successfulRides + cancelledRides;
  const cancelPercentage =
    totalRides > 0 ? ((cancelledRides / totalRides) * 100).toFixed(1) : 0;

  const succesPercentage =
    totalRides > 0 ? ((successfulRides / totalRides) * 100).toFixed(0) : 0;

  // ============ PAYMENT CONFIRMATION MODAL ============
  const handleCompleteRideConfirm = () => {
    setShowPaymentConfirm(true);
  };

  // ============ COMPLETE RIDE ENDPOINT ============
  const handleCompleteRide = async () => {
    try {
      setShowPaymentConfirm(false);

      const response = await axios.post(
        `${API_URL_APP}/api/v1/complete-ride-post/${rideId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log("✅ Complete ride response:", response.data);

      if (response.data?.success) {
        Alert.alert("Success", "Ride completed successfully");
        // Open Rating Modal after successful completion
        setShowRatingModal(true);
        fetchRideDetails(false);
      }
    } catch (error) {
      console.log("❌ Complete ride error:", error?.response?.data || error);
      Alert.alert(
        "Error",
        error?.response?.data?.message || "Failed to complete ride"
      );
    }
  };

  // ============ SUBMIT RATING ENDPOINT ============
  const handleSubmitRating = async () => {
    if (customerRating === 0) {
      Alert.alert(
        "Rating Required",
        "Please provide a rating before submitting"
      );
      return;
    }

    try {
      setSubmittingRating(true);

      const response = await axios.post(
        `${API_URL_APP}/api/v1/add-rating-for-company/${rideId}`,
        {
          customerRating,
          feedback,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log("⭐ Rating response:", response.data);

      if (response.data?.success) {
        setShowRatingModal(false);
        setCustomerRating(0);
        setFeedback("");

        Alert.alert(
          "Thank You!",
          "Your rating has been submitted successfully",
          [
            {
              text: "OK",
              onPress: () => navigation.goBack(),
            },
          ]
        );
      }
    } catch (error) {
      console.log("❌ Rating error:", error?.response?.data || error);
      Alert.alert(
        "Error",
        error?.response?.data?.message || "Failed to submit rating"
      );
    } finally {
      setSubmittingRating(false);
    }
  };

  // ============ CANCEL RIDE ENDPOINT ============
  const handleCancelRide = async () => {
    try {
      setShowCancelConfirm(false);

      const response = await axios.post(
        `${API_URL_APP}/api/v1/cancel-ride-post/${rideId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log("❌ Cancel ride response:", response.data);

      if (response.data?.success) {
        Alert.alert(
          "Ride Cancelled",
          "The ride has been cancelled successfully",
          [
            {
              text: "OK",
              onPress: () => navigation.goBack(),
            },
          ]
        );
      }
    } catch (error) {
      console.log("❌ Cancel ride error:", error?.response?.data || error);
      Alert.alert(
        "Error",
        error?.response?.data?.message || "Failed to cancel ride"
      );
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
        Linking.openURL("tel:+911234567890");
        break;
      case "cancel":
        setShowCancelConfirm(true);
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
  const handleChatPress = () => {
    if (!rideData?._id || !rideData) return;

    if (rideData?.rideStatus === "driver-assigned" || rideData?.rideStatus === "started") {
      navigation.navigate("ChatBox", {
        chat: rideData,
        role: role === "driver" ? "initiator" : "owner",
        rideId: rideData?._id,
      });
    } else {
      initChat(); // fallback (agar assignment nahi hua)
    }
  };


  const isRoundTrip = rideData?.tripType === "round-trip";
  const arrivalDateTime = !isRoundTrip
    ? getArrivalDateTime(rideData?.pickupDate, rideData?.pickupTime, distance)
    : null;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#000" />
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
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={moderateScale(24)} color="#1F2937" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Trip Details</Text>
          <Text style={styles.headerSubtitle}>
            {formatDate(rideData.pickupDate)} •{" "}
            {formatTime12Hour(rideData.pickupTime)}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.moreButton}
          onPress={() => setShowMoreOptions(true)}
        >
          <MoreVertical size={moderateScale(24)} color="#1F2937" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchRideDetails(false)}
            colors={["#000"]}
            tintColor="#000"
          />
        }
      >
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
                  <Navigation size={moderateScale(16)} color="#fff" />
                </View>
              </Marker>
              <Marker
                coordinate={{
                  latitude: rideData.dropLocation.coordinates[1],
                  longitude: rideData.dropLocation.coordinates[0],
                }}
              >
                <View style={styles.dropMarker}>
                  <MapPin size={moderateScale(16)} color="#000" fill="#000" />
                </View>
              </Marker>
              {routeCoords.length > 0 && (
                <Polyline
                  coordinates={routeCoords}
                  strokeColor="#000"
                  strokeWidth={4}
                  lineCap="round"
                />
              )}
            </MapView>
          ) : (
            <View style={styles.mapPlaceholder}>
              <ActivityIndicator size="large" color="#000" />
            </View>
          )}
        </View>

        {/* Trip Posted By */}
        <View style={styles.section}>

          <View style={styles.card}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
              }}
            >
              <Text style={styles.sectionTitle}>Trip Posted By</Text>
              <Text style={styles.sectionTitle}>
                Booking id:- {rideData.RideId}
              </Text>
            </View>
            <View style={styles.userRow}>
              <View style={styles.userInfo}>
                {rideData?.companyId?.logo ? (
                  <Image
                    source={{ uri: rideData?.companyId?.logo?.url }}
                    style={styles.avatar}
                  />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>
                      {(rideData?.companyId?.company_name || "D").charAt(0)}
                    </Text>
                  </View>
                )}

                <View style={styles.userDetails}>
                  <Text style={styles.userName}>
                    {rideData?.companyId?.company_name || "Driver"}
                  </Text>
                  <View style={cardDriverStyles.ratingRow}>
                    <Star size={14} color="#FFA500" fill="#FFA500" />
                    <Text style={cardDriverStyles.ratingText}>
                      {rideData?.companyId?.rating} /
                    </Text>
                    <Text
                      style={[
                        cardDriverStyles.ratingText,
                        { color: Colors.success, marginLeft: 4 },
                      ]}
                    >
                      {succesPercentage}% -
                    </Text>

                    <Text
                      style={[
                        cardDriverStyles.ratingText,
                        { color: Colors.error },
                      ]}
                    >
                      {cancelPercentage}%
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.contactButtons}>
                {rideData?.contactType === "call" ? (
                  <>
                    <TouchableOpacity
                      style={styles.phoneButton}
                      onPress={() => {
                        const phone =
                          rideData?.driverPostId?.driver_contact_number;
                        if (phone) Linking.openURL(`tel:${phone}`);
                      }}
                    >
                      <Phone size={moderateScale(18)} color="#fff" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.chatButton}
                      onPress={handleChatPress}
                    >
                      <MessageCircle size={moderateScale(18)} color="#fff" />
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity
                    style={styles.chatButton}
                    onPress={handleChatPress}
                  >
                    <MessageCircle size={moderateScale(18)} color="#fff" />
                  </TouchableOpacity>
                )}
              </View>

            </View>

            {/* Pricing */}
            <View style={styles.pricingRow}>
              <View style={styles.priceItem}>
                <Text style={styles.priceAmount}>
                  ₹{Number(rideData.totalAmount || 0).toLocaleString()}
                </Text>
                <Text style={styles.priceLabel}>Total Amount</Text>
              </View>
              <View style={styles.priceItem}>
                <Text style={styles.priceAmountRed}>
                  ₹{Number(rideData.commissionAmount || 0).toLocaleString()}
                </Text>
                <Text style={styles.priceLabel}>Commission</Text>
              </View>
              <View style={styles.priceItem}>
                <Text style={styles.priceAmountGreen}>
                  ₹{Number(rideData.driverEarning || 0).toLocaleString()}
                </Text>
                <Text style={styles.priceLabel}>Driver Earning</Text>
              </View>
            </View>

            {/* Dates with Timeline */}
            <View style={styles.dateRow}>
              <View style={styles.dateItem}>
                <Text style={styles.dateLabel}>Pickup</Text>
                <Text style={styles.dateLabel}>
                  {formatDate(rideData.pickupDate)}
                </Text>
                <Text style={styles.timeValue}>
                  {formatTime12Hour(rideData.pickupTime)}
                </Text>
              </View>

              <View style={styles.dateDivider}>
                <View style={styles.dividerDot} />
                <View style={styles.dividerLine} />
                <View style={styles.dividerDot} />
              </View>

              {isRoundTrip ? (
                <View style={styles.dateItem}>
                  <Text style={styles.dateLabel}>Return</Text>
                  {rideData.returnDate && (
                    <Text style={styles.dateLabel}>
                      {formatDate(rideData.returnDate)}
                    </Text>
                  )}


                </View>
              ) : (
                <View style={styles.dateItem}>
                  <Text style={styles.dateLabel}>
                    {arrivalDateTime
                      ? formatDateFromDate(arrivalDateTime)
                      : "Arrival"}
                  </Text>
                  <Text style={styles.timeValue}>
                    {arrivalDateTime
                      ? formatTime12HourFromDate(arrivalDateTime)
                      : "TBD"}
                  </Text>
                </View>
              )}
            </View>

            {/* Vehicle Info */}

            <View style={styles.vehicleSection}>

              <View style={styles.vehicleInfo}>
                <Text style={styles.vehicleName}>{VehicleName}</Text>
                <Text style={styles.vehiclePlate}>
                  {VehcileNumber || "DL 1A B2345"}
                </Text>
              </View>
              <Image
                source={vehicleImage}
                style={styles.vehicleImage}
                resizeMode="contain"
              />
            </View>
            {role === "owner" && (
              <View style={styles.driverCard}>

                <View style={styles.driverRow}>
                  <Text style={styles.label}>Driver Name</Text>
                  <Text style={styles.value}>{driverNameForOwner}</Text>
                </View>

                <View style={styles.driverRow}>
                  <Text style={styles.label}>Contact</Text>
                  <Text style={styles.value}>{driverContactForOwner}</Text>
                </View>
              </View>
            )}


            {/* Trip Type Badge */}
            {/* <View style={styles.tripBadge}>
              <Text style={styles.tripBadgeText}>
                {isRoundTrip ? "Round Trip" : "One way Trip"} -{" "}
                {distance.toFixed(0)} km
              </Text>
            </View> */}

            {/* Locations */}
            <View style={styles.addressBox}>
              <View style={styles.addressRow}>
                <Icon name="navigate-outline" size={15} color="#666" />
                <Text style={styles.address} numberOfLines={1}>
                  {rideData?.
                    pickupAddress
                  }
                </Text>
              </View>

              <View style={styles.tripTagContainer}>
                <Text style={styles.tripTag}>
                  {rideData?.tripType === "one-way" ? "One Way Trip" : "Round Trip"
                  } - {rideData?.
                    distanceKm || "60"}Km
                </Text>
              </View>

              <View style={styles.addressRow}>
                <Icon name="location-outline" size={15} color="#666" />
                <Text style={styles.address} numberOfLines={1}>
                  {rideData?.
                    dropAddress
                  }
                </Text>
              </View>
              {rideData.tripType === "round-trip" && (
                <>
                 <View style={styles.verticalLine} />
                 
                  <View style={styles.addressRow}>
                  <Icon name="navigate-outline" size={15} color="#666" />
                  <Text style={styles.address} numberOfLines={1}>
                    {rideData?.
                      pickupAddress
                    }
                  </Text>
                </View>
                </>
               
              )}
            </View>
          </View>
        </View>

        {/* Extra Requirements */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Extra Requirements</Text>
          <View style={styles.card}>
            <Text style={styles.requirementsText}>
              {getExtraRequirements(rideData.extraRequirements)}
            </Text>
          </View>
        </View>

        {/* Notes */}
        {rideData.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <View style={styles.card}>
              <Text style={styles.notesText}>{rideData.notes}</Text>
            </View>
          </View>
        )}

        <View style={{ height: verticalScale(100) }} />
      </ScrollView>

      {/* Action Buttons Based on Ride Status */}
      {rideData?.assignedDriverId?._id === driver?._id && (
        <View style={[styles.bottomButton, { paddingBottom: insets.bottom }]}>
          {rideData?.rideStatus === "driver-assigned" && (
            <TouchableOpacity
              style={styles.pickupButton}
              onPress={handleStartRide}
            >
              <Text style={styles.pickupButtonText}>Start The Ride</Text>
            </TouchableOpacity>
          )}

          {rideData?.rideStatus === "started" && (
            <TouchableOpacity
              style={styles.pickupButton}
              onPress={handleCompleteRideConfirm}
            >
              <Text style={styles.pickupButtonText}>
                Mark Complete This Ride
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* More Options Modal */}
      <Modal
        visible={showMoreOptions}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMoreOptions(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMoreOptions(false)}
        >
          <View style={styles.moreOptionsMenu}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMoreOptions("refresh")}
            >
              <Loader size={moderateScale(18)} color="#1F2937" />

              <Text style={styles.menuText}>Refresh</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMoreOptions("support")}
            >
              <Headphones size={moderateScale(18)} color="#1F2937" />
              <Text style={styles.menuText}>Contact Support</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMoreOptions("police")}
            >
              <Shield size={moderateScale(18)} color="#000" />
              <Text style={[styles.menuText, { color: "#000" }]}>
                Emergency (100)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMoreOptions("cancel")}
            >
              <X />
              <Text style={[styles.menuText, { color: "#DC2626" }]}>
                Cancel Ride
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ============ PAYMENT CONFIRMATION MODAL ============ */}
      <Modal
        visible={showPaymentConfirm}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPaymentConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Payment Confirmation</Text>
              <TouchableOpacity onPress={() => setShowPaymentConfirm(false)}>
                <X size={moderateScale(24)} color="#1F2937" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              Have you collected the payment from the customer?
            </Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={[styles.confirmButton, styles.noButton]}
                onPress={() => setShowPaymentConfirm(false)}
              >
                <Text style={styles.noButtonText}>No, Not Yet</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, styles.yesButton]}
                onPress={handleCompleteRide}
              >
                <Text style={styles.yesButtonText}>Yes, Collected</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showRatingModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRatingModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowRatingModal(false)}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
              style={styles.ratingModalContainer}
            >
              <View style={styles.ratingModal}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Rating For a Booking Agent</Text>
                  <TouchableOpacity onPress={() => setShowRatingModal(false)}>
                    <X size={moderateScale(24)} color="#1F2937" />
                  </TouchableOpacity>
                </View>

                {/* Star Rating */}
                <View style={styles.starsContainer}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                      key={star}
                      style={styles.starButton}
                      onPress={() => setCustomerRating(star)}
                    >
                      <Star
                        size={moderateScale(32)}
                        color={star <= customerRating ? "#FFA500" : "#D1D5DB"}
                        fill={star <= customerRating ? "#FFA500" : "none"}
                      />
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Feedback Text Input */}
                <TextInput
                  style={styles.feedbackInput}
                  placeholder="Share your feedback (optional)"
                  placeholderTextColor="#9CA3AF"
                  value={feedback}
                  onChangeText={setFeedback}
                  multiline
                  numberOfLines={4}
                />

                {/* Submit Button */}
                <TouchableOpacity
                  style={styles.submitRatingButton}
                  onPress={handleSubmitRating}
                  disabled={submittingRating}
                >
                  {submittingRating ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.submitRatingButtonText}>Submit Rating</Text>
                  )}
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
      {/* ============ CANCEL CONFIRMATION MODAL ============ */}
      <Modal
        visible={showCancelConfirm}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCancelConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cancel Ride</Text>
              <TouchableOpacity onPress={() => setShowCancelConfirm(false)}>
                <X size={moderateScale(24)} color="#1F2937" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              Are you sure you want to cancel this ride? This action cannot be
              undone.
            </Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={[styles.confirmButton, styles.noButton]}
                onPress={() => setShowCancelConfirm(false)}
              >
                <Text style={styles.noButtonText}>Keep The Ride</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, styles.cancelButton]}
                onPress={handleCancelRide}
              >
                <Text style={styles.yesButtonText}>Yes, Cancel Ride</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default ReserveRideDetailsAssigned;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: verticalScale(12),
    fontSize: moderateScale(16),
    color: "#6B7280",
  },
  errorText: {
    fontSize: moderateScale(16),
    color: "#000",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    padding: scale(8),
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: moderateScale(18),
    fontWeight: "700",
    color: "#111827",
  },
  headerSubtitle: {
    fontSize: moderateScale(13),
    color: "#6B7280",
    marginTop: verticalScale(2),
  },
  moreButton: {
    padding: scale(8),
  },
  scrollView: {
    flex: 1,
  },
  mapContainer: {
    height: verticalScale(200),
    backgroundColor: "#E5E7EB",
    marginHorizontal: scale(6),
    borderRadius: moderateScale(2),
    overflow: "hidden",
  },
  map: {
    flex: 1,
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  pickupMarker: {
    width: moderateScale(32),
    height: moderateScale(32),
    borderRadius: moderateScale(16),
    backgroundColor: "#10B981",
    justifyContent: "center",
    alignItems: "center",
  },
  dropMarker: {
    width: moderateScale(32),
    height: moderateScale(32),
    borderRadius: moderateScale(16),
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#000",
  },
  section: {
    // marginTop: verticalScale(20),
    paddingHorizontal: scale(16),
  },
  sectionTitle: {
    fontSize: moderateScale(16),
    fontWeight: "700",
    color: "#111827",
    marginBottom: verticalScale(12),
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: moderateScale(12),
    padding: scale(16),
  },
  userRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  verticalLine: {
  width: 1,
  height: 18,
  backgroundColor: "#ccc",
  marginLeft: 7, // aligns with icon center
  marginVertical: 2,
},


  // Address
  addressBox: {
    backgroundColor: "#F2F5F6",
    padding: 10,
    borderRadius: 12,
  },
  driverCard: {

    marginBottom: 12,
    borderRadius: 12,
    marginTop: 0,

  },

  driverTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111",
    marginBottom: 8,
    fontFamily: "SFProDisplay-Bold",
  },

  driverRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 4,
  },

  label: {
    fontSize: 13,
    color: "#666",
    fontFamily: "SFProDisplay-Bold",
  },

  value: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
    fontFamily: "SFProDisplay-Bold",
  },


  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 3,
  },

  address: {
    flex: 1,
    textAlign: "auto",
    marginLeft: 6,
    fontSize: 13,
    color: "#444",
    lineHeight: 16,
  },

  tripTagContainer: {
    alignItems: "center",
    marginVertical: 6,
  },

  tripTag: {
    backgroundColor: "#000",
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  avatar: {
    width: moderateScale(48),
    height: moderateScale(48),
    borderRadius: moderateScale(24),
  },
  avatarPlaceholder: {
    width: moderateScale(48),
    height: moderateScale(48),
    borderRadius: moderateScale(24),
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: moderateScale(20),
    fontWeight: "600",
    color: "#6B7280",
  },
  userDetails: {
    marginLeft: scale(12),
    flex: 1,
  },
  userName: {
    fontSize: moderateScale(16),
    fontWeight: "600",
    color: "#111827",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: verticalScale(4),
  },
  ratingText: {
    fontSize: moderateScale(14),
    color: "#6B7280",
    marginLeft: scale(4),
  },
  contactButtons: {
    flexDirection: "row",
    gap: scale(8),
  },
  phoneButton: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(20),
    backgroundColor: "#10B981",
    justifyContent: "center",
    alignItems: "center",
  },
  chatButton: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(20),
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  pricingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: verticalScale(20),
    paddingTop: verticalScale(16),
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  priceItem: {
    alignItems: "center",
  },
  priceAmount: {
    fontSize: 16,
    fontFamily: "SFProDisplay-Bold",
    fontWeight: "700",
    color: "#111827",
  },
  priceAmountRed: {
    fontWeight: "700",
    fontSize: 16,
    fontFamily: "SFProDisplay-Bold",
    color: "#DC2626",
  },
  priceAmountGreen: {
    fontSize: 16,
    fontFamily: "SFProDisplay-Bold",
    fontWeight: "700",
    color: "#10B981",
  },
  priceLabel: {
    fontSize: moderateScale(12),
    color: "#000",
    fontWeight: "700",
    fontFamily: "SFProDisplay-Bold",

    marginTop: verticalScale(4),
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: verticalScale(20),
    paddingTop: verticalScale(16),
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  dateItem: {
    flex: 1,
  },
  dateLabel: {
    fontSize: moderateScale(12),
    color: "#000",
    fontWeight: "900",

  },
  dateValue: {
    fontSize: moderateScale(14),
    fontWeight: "600",
    color: "#111827",
  },
  timeValue: {
    fontSize: moderateScale(14),
    fontWeight: "700",
    color: "#111827",
    marginTop: verticalScale(2),
  },
  dateDivider: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scale(16),
  },
  dividerDot: {
    width: moderateScale(8),
    height: moderateScale(8),
    borderRadius: moderateScale(4),
    backgroundColor: "#D1D5DB",
  },
  dividerLine: {
    width: 90,
    height: verticalScale(1),
    backgroundColor: "#D1D5DB",
    marginVertical: verticalScale(4),
  },
  vehicleSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: verticalScale(20),
    paddingTop: verticalScale(16),
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleName: {
    fontSize: moderateScale(16),
    fontWeight: "600",
    color: "#111827",
  },
  vehiclePlate: {
    fontSize: moderateScale(20),
    fontWeight: "700",
    color: "#111827",
    marginTop: verticalScale(4),
  },
  vehicleImage: {
    width: scale(120),
    height: verticalScale(60),
  },
  tripBadge: {
    alignSelf: "center",
    backgroundColor: "#000",
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(5),
    borderRadius: moderateScale(20),
    marginTop: verticalScale(16),
  },
  tripBadgeText: {
    fontSize: moderateScale(10),
    fontWeight: "600",
    color: "#fff",
  },
  locationsList: {
    marginTop: verticalScale(16),
  },
  locationItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: verticalScale(12),
  },
  locationIcon: {
    width: moderateScale(28),
    height: moderateScale(28),
    borderRadius: moderateScale(14),
    backgroundColor: "#10B981",
    justifyContent: "center",
    alignItems: "center",
    marginRight: scale(12),
  },
  locationText: {
    flex: 1,
    fontSize: moderateScale(14),
    color: "#374151",
    lineHeight: moderateScale(20),
  },
  requirementsText: {
    fontSize: moderateScale(14),
    color: "#374151",
  },
  notesText: {
    fontSize: moderateScale(14),
    color: "#6B7280",
    lineHeight: moderateScale(20),
  },
  bottomButton: {
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(12),
    paddingBottom: verticalScale(12),
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  pickupButton: {
    backgroundColor: "#000",
    borderRadius: moderateScale(12),
    paddingVertical: verticalScale(16),
    alignItems: "center",
  },
  pickupButtonText: {
    fontSize: moderateScale(16),
    fontWeight: "700",
    color: "#fff",
  },
  modalOverlay: {
    flex: 1,

    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  moreOptionsMenu: {
    backgroundColor: "#fff",
    paddingBottom: verticalScale(70),
    borderTopLeftRadius: moderateScale(20),
    borderTopRightRadius: moderateScale(20),
    paddingVertical: verticalScale(20),
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(16),
    gap: scale(12),
  },
  menuText: {
    fontSize: moderateScale(16),
    color: "#1F2937",
  },
  confirmModal: {
    paddingBottom: verticalScale(70),

    backgroundColor: "#fff",
    borderTopLeftRadius: moderateScale(20),
    borderTopRightRadius: moderateScale(20),
    padding: scale(24),
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: verticalScale(12),
  },
  modalTitle: {
    fontSize: moderateScale(20),
    fontWeight: "700",
    color: "#111827",
  },
  modalSubtitle: {
    fontSize: moderateScale(14),
    color: "#6B7280",
    marginBottom: verticalScale(24),
    lineHeight: moderateScale(20),
  },
  confirmButtons: {
    flexDirection: "row",
    gap: scale(12),
  },
  confirmButton: {
    flex: 1,
    borderRadius: moderateScale(12),
    paddingVertical: verticalScale(14),
    alignItems: "center",
  },
  noButton: {
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  noButtonText: {
    fontSize: moderateScale(16),
    fontWeight: "600",
    color: "#374151",
  },
  yesButton: {
    backgroundColor: "#000",
  },
  cancelButton: {
    backgroundColor: "#DC2626",
  },
  yesButtonText: {
    fontSize: moderateScale(16),
    fontWeight: "600",
    color: "#fff",
  },
  ratingModal: {
    backgroundColor: "#fff",
    paddingBottom: verticalScale(70),
    borderTopLeftRadius: moderateScale(20),
    borderTopRightRadius: moderateScale(20),
    padding: scale(24),
  },
  starsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: scale(8),
    marginVertical: verticalScale(24),
  },
  starButton: {
    padding: scale(4),
  },
  feedbackInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: moderateScale(12),
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
    fontSize: moderateScale(14),
    marginBottom: verticalScale(20),
    minHeight: verticalScale(100),
    textAlignVertical: "top",
  },
  submitRatingButton: {
    backgroundColor: "#000",
    borderRadius: moderateScale(12),
    paddingVertical: verticalScale(16),
    alignItems: "center",
  },
  submitRatingButtonText: {
    fontSize: moderateScale(16),
    fontWeight: "700",
    color: "#fff",
  },
});



const cardDriverStyles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 8,
    marginVertical: 4,
  },

  // Header Section
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },

  avatarSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  avatar: {
    width: 40,
    height: 40,
    borderRadius: 28,
    backgroundColor: "#f0f0f0",
  },

  avatarPlaceholder: {
    width: 40,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#4A90E2",
    justifyContent: "center",
    alignItems: "center",
  },

  avatarText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
  },

  nameRatingContainer: {
    marginLeft: 12,
    flex: 1,
  },

  companyName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 4,
  },

  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  ratingText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#666",
    // marginLeft: 4,
  },

  // Contact Buttons
  contactButtons: {
    flexDirection: "row",
    gap: 8,
  },

  phoneButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#34C759",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#34C759",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },

  chatButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },

  chatButtonFull: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },

  // Stats Section
  statsContainer: {
    flexDirection: "row",
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },

  statCard: {
    flex: 1,
    alignItems: "center",
  },

  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 4,
  },

  cancelValue: {
    color: "#FF3B30",
  },

  statLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#666",
    textAlign: "center",
  },

  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: "#ddd",
    marginHorizontal: 16,
  },
});
