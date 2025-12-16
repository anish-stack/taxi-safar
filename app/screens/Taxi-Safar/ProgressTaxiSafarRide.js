import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
  Modal,
  Linking,
  TextInput,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MapView, { Marker, Polyline } from "react-native-maps";
import {
  ArrowLeft,
  MoreVertical,
  Phone,
  AlertCircle,
  X,
  MapPin,
  Navigation,
} from "lucide-react-native";
import { CommonActions, useNavigation, useRoute } from "@react-navigation/native";
import axios from "axios";
import { API_URL_APP } from "../../constant/api";
import loginStore from "../../store/auth.store";
import Layout from "../common/layout";
import { fetchWithRetry } from "../../utils/fetchWithRetry";
import { UniversalAlert } from "../common/UniversalAlert";

import mini from "../../assets/mini.png";
import sedan from "../../assets/sedan.png";
import suv from "../../assets/suv.png";
import useDriverStore from "../../store/driver.store";
import { decodePolyline } from "../../utils/utils";

const { width } = Dimensions.get("window");

// Constants
const LOCATION_UPDATE_INTERVAL = 10000; // 10 seconds
const TAXI_SAFAR_SUPPORT = "+911234567890"; // Update with actual number
const POLICE_NUMBER = "100";

const CANCEL_REASONS = [
  "Customer not available",
  "Wrong pickup location",
  "Customer requested cancellation",
  "Vehicle breakdown",
  "Traffic/Road issues",
  "Emergency situation",
  "Other",
];

export default function ProgressTaxiSafarRide() {
  const route = useRoute();
  const navigation = useNavigation();
  const { rideId } = route.params || {};
  const { token } = loginStore();
  const { driver, fetchDriverDetails, location, refreshLocation } =
    useDriverStore();

  const mapRef = useRef(null);
  const locationIntervalRef = useRef(null);

  // State
  const [ride, setRide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [completeOtpModalVisible, setCompleteOtpModalVisible] = useState(false);

  // Form States
  const [selectedCancelReason, setSelectedCancelReason] = useState("");
  const [otherReason, setOtherReason] = useState("");
  const [otp, setOtp] = useState("");
  const [completeOtp, setCompleteOtp] = useState("");

  // Alert States
  const [alert, setAlert] = useState({
    visible: false,
    type: "error",
    title: "",
    message: "",
  });

  const goToHome = () => {
  navigation.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [{ name: 'Home' }],
    })
  );
};

  useEffect(() => {
    fetchRide();
    fetchDriverDetails();
    startLocationTracking();

    return () => {
      stopLocationTracking();
    };
  }, [rideId]);

  // Start real-time location tracking
  const startLocationTracking = () => {
    console.log("📍 Starting real-time location tracking");

    // Update immediately
    refreshLocation();

    // Set up interval
    locationIntervalRef.current = setInterval(() => {
      refreshLocation();
    }, LOCATION_UPDATE_INTERVAL);
  };

  const findStatus = async () => {
    try {
      const response = await axios.post(
        `${API_URL_APP}/api/v1/ride-status/${rideId}`
      );

      const status = response.data?.status;
      console.log("📌 Ride Status Response:", status);

      if (status === "trip_completed") {
        showAlert({
          type: "success",
          title: "Ride Completed",
          message: "Your ride has been successfully completed!",
          
        });
          // Navigate to Home
  setTimeout(() => {
    goToHome();
  }, 3000);
      } else if (
        status === "cancelled_by_driver" ||
        status === "cancelled_by_system"
      ) {
        showAlert({
          type: "error",
          title: "Ride Cancelled",
          message: "Your ride has been cancelled.",
        });
          setTimeout(() => {
    goToHome();
  }, 3000);
      } else {
        // Do nothing for other statuses
        console.log("Ride in progress, status:", status);
      }

      return response.data;
    } catch (error) {
      console.log(
        "❌ Ride Status Error:",
        error.response?.data || error.message
      );
    }
  };

  // Stop location tracking
  const stopLocationTracking = () => {
    if (locationIntervalRef.current) {
      clearInterval(locationIntervalRef.current);
      locationIntervalRef.current = null;
      console.log("📍 Stopped location tracking");
    }
  };

  useEffect(() => {
    // first call immediately
    findStatus();

    const interval = setInterval(() => {
      findStatus();
    }, 4000); // 4 seconds

    return () => clearInterval(interval); // cleanup on unmount
  }, []);

  // Fetch ride details
  const fetchRide = async () => {
    if (!rideId) {
      showAlert({
        type: "error",
        title: "Error",
        message: "No trip ID found",
      });
      setTimeout(() => navigation.goBack(), 2000);
      return;
    }

    try {
      setLoading(true);
      const response = await fetchWithRetry(async () => {
        const res = await axios.get(
          `${API_URL_APP}/api/v1/taxi-safar-ride/${rideId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        return res.data;
      });

      if (response.success && response.data) {
        setRide(response.data);
      } else {
        showAlert({
          type: "error",
          title: "Failed to Load",
          message: response.message || "Could not load trip details",
        });
      }
    } catch (err) {
      showAlert({
        type: "error",
        title: "Connection Error",
        message:
          "Unable to fetch trip details. Please check your internet connection.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Mark reached at pickup location
  const markReachedAtPickup = async () => {
    try {
      setProcessing(true);
      const res = await axios.post(
        `${API_URL_APP}/api/v1/mark-reached/${rideId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        showAlert({
          type: "success",
          title: "Success",
          message: "Marked as reached at pickup location",
        });
        setOtpModalVisible(true);
        fetchRide();
      }
    } catch (err) {
      console.log(err.response.data);
      showAlert({
        type: "error",
        title: "Error",
        message: err.response?.data?.message || "Failed to mark as reached",
      });
    } finally {
      setProcessing(false);
    }
  };

  // Verify OTP to start ride
  const verifyOtp = async () => {
    if (!otp || otp.length !== 4) {
      showAlert({
        type: "error",
        title: "Invalid OTP",
        message: "Please enter a 4-digit OTP",
      });
      return;
    }

    try {
      setProcessing(true);
      const res = await axios.post(
        `${API_URL_APP}/api/v1/verify-otp/${rideId}`,
        { otp },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        showAlert({
          type: "success",
          title: "Ride Started",
          message: "OTP verified successfully. Ride has started!",
        });
        setOtpModalVisible(false);
        setOtp("");
        fetchRide();
      }
    } catch (err) {
      showAlert({
        type: "error",
        title: "Verification Failed",
        message:
          err.response?.data?.message || "Invalid OTP. Please try again.",
      });
    } finally {
      setProcessing(false);
    }
  };

  // Complete ride with OTP
  const completeRide = async () => {
    if (!completeOtp || completeOtp.length !== 4) {
      showAlert({
        type: "error",
        title: "Invalid OTP",
        message: "Please enter a 4-digit OTP",
      });
      return;
    }

    try {
      setProcessing(true);
      const res = await axios.post(
        `${API_URL_APP}/api/v1/complete-otp`,
        { otp: completeOtp, rideId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        showAlert({
          type: "success",
          title: "Ride Completed",
          message: "Trip completed successfully!",
        });
        setCompleteOtpModalVisible(false);
        setCompleteOtp("");
        setTimeout(() => {
          navigation.navigate("Home");
        }, 2000);
      }
    } catch (err) {
      showAlert({
        type: "error",
        title: "Completion Failed",
        message:
          err.response?.data?.message ||
          "Failed to complete ride. Please try again.",
      });
    } finally {
      setProcessing(false);
    }
  };

  // Cancel ride
  const cancelRide = async () => {
    const reason =
      selectedCancelReason === "Other" ? otherReason : selectedCancelReason;

    if (!reason.trim()) {
      showAlert({
        type: "error",
        title: "Reason Required",
        message: "Please select or enter a cancellation reason",
      });
      return;
    }

    try {
      setProcessing(true);
      const res = await axios.post(
        `${API_URL_APP}/api/v1/cancel-ride/${rideId}`,
        { reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        showAlert({
          type: "success",
          title: "Ride Cancelled",
          message: "Trip has been cancelled successfully",
        });
        setCancelModalVisible(false);
        setTimeout(() => {
          navigation.navigate("Home");
        }, 2000);
      }
    } catch (err) {
      showAlert({
        type: "error",
        title: "Cancellation Failed",
        message: err.response?.data?.message || "Failed to cancel ride",
      });
    } finally {
      setProcessing(false);
    }
  };

  // Make phone call
  const makePhoneCall = (number) => {
    Linking.openURL(`tel:${number}`);
  };

  // Show alert
  const showAlert = (alertConfig) => {
    setAlert({
      visible: true,
      ...alertConfig,
    });
  };

  const closeAlert = () => {
    setAlert({ ...alert, visible: false });
  };

  // Get vehicle image
  const vehicleImage =
    ride?.vehicle_type === "mini"
      ? mini
      : ride?.vehicle_type === "sedan"
      ? sedan
      : ride?.vehicle_type === "suv"
      ? suv
      : mini;

  // Center map on driver location
  const centerMapOnDriver = () => {
    if (location && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: location.lat,
        longitude: location.lng,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
    }
  };

  if (loading) {
    return (
      <Layout showHeader={false}>
        <SafeAreaView style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#DC2626" />
          <Text style={styles.loadingText}>Loading trip details...</Text>
        </SafeAreaView>
      </Layout>
    );
  }

  if (!ride) {
    return (
      <Layout showHeader={false}>
        <View style={styles.centerContainer}>
          <Text>Trip not found</Text>
        </View>
      </Layout>
    );
  }

  const polyline = ride.routePolyline ? decodePolyline(ride.routePolyline) : [];

  return (
    <Layout showHeader={false}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <ArrowLeft size={28} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Trip in Progress</Text>
          <TouchableOpacity onPress={() => setMenuVisible(true)}>
            <MoreVertical size={28} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Map with Real-time Location */}
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={{
              latitude: ride.pickup_location.coordinates[1],
              longitude: ride.pickup_location.coordinates[0],
              latitudeDelta: 2.5,
              longitudeDelta: 2.5,
            }}
          >
            {/* Route Polyline */}
            {polyline.length > 0 && (
              <Polyline
                coordinates={polyline}
                strokeWidth={4}
                strokeColor="#DC2626"
              />
            )}

            {/* Pickup Marker */}
            <Marker
              coordinate={{
                latitude: ride.pickup_location.coordinates[1],
                longitude: ride.pickup_location.coordinates[0],
              }}
              title="Pickup Location"
              pinColor="#10B981"
            />

            {/* Drop Marker */}
            <Marker
              coordinate={{
                latitude: ride.destination_location.coordinates[1],
                longitude: ride.destination_location.coordinates[0],
              }}
              title="Drop Location"
              pinColor="#EF4444"
            />

            {/* Driver's Real-time Location */}
          </MapView>

          {/* Map Overlay */}
          <View style={styles.mapOverlay}>
            <Text style={styles.mapTime}>
              {ride.durationText || "Calculating..."}
            </Text>
            <Text style={styles.mapDistance}>
              {parseFloat(ride.distance).toFixed(0)} km
            </Text>
          </View>

          {/* Center on Driver Button */}
          {location && (
            <TouchableOpacity
              style={styles.centerButton}
              onPress={centerMapOnDriver}
            >
              <MapPin size={20} color="#FFF" />
            </TouchableOpacity>
          )}

          {/* Location Update Indicator */}
          {location && (
            <View style={styles.locationIndicator}>
              <View style={styles.pulsingDot} />
              <Text style={styles.locationTime}>
                Updated:{" "}
                {new Date(location.updatedAt_utc).toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>
          )}
        </View>

        {/* Customer Card */}
        <View style={styles.card}>
          <View style={styles.customerHeader}>
            <View style={styles.avatar} />
            <View style={{ flex: 1 }}>
              <Text style={styles.customerName}>{ride.name}</Text>
              <View style={styles.ratingRow}>
                <Text style={styles.rating}>⭐ 4.8 (127)</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.callButton}
              onPress={() => makePhoneCall(ride.customer_phone)}
            >
              <Phone size={20} color="#FFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.priceRow}>
            <Text style={styles.price}>
              ₹{ride.original_amount.toLocaleString()}
            </Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{ride.trip_status}</Text>
            </View>
          </View>

          <View style={styles.dateRow}>
            <Text style={styles.dateText}>
              {new Date(ride.scheduled_time).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </Text>
            <Text style={styles.timeText}>
              {new Date(ride.scheduled_time).toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </View>
        </View>

        {/* Locations */}
        <View style={styles.card}>
          <View style={styles.locationRow}>
            <View style={styles.pickupIcon} />
            <Text style={styles.locationText}>{ride.pickup_address}</Text>
          </View>
          <View style={styles.locationRow}>
            <View style={styles.dropIcon} />
            <Text style={styles.locationText}>{ride.destination_address}</Text>
          </View>
        </View>

        {/* Charges */}
        <View style={styles.card}>
          <View style={styles.chargeRow}>
            <Text style={styles.chargeLabel}>Trip Distance</Text>
            <Text style={styles.chargeValue}>
              {Math.round(parseFloat(ride.distance))} kms
            </Text>
          </View>
          <View style={styles.chargeRow}>
            <Text style={styles.chargeLabel}>Trip Duration</Text>
            <Text style={styles.chargeValue}>{ride.durationText}</Text>
          </View>
          <View style={styles.chargeRow}>
            <Text style={styles.chargeLabel}>Extra km Charges</Text>
            <Text style={styles.chargeValue}>₹12 / km</Text>
          </View>
          <View style={styles.chargeRow}>
            <Text style={styles.chargeLabel}>Extra Time Charges</Text>
            <Text style={styles.chargeValue}>₹2 / minutes</Text>
          </View>
          <View style={styles.chargeRow}>
            <Text style={styles.chargeLabel}>Tolls & Inter State Charges</Text>
            <Text style={styles.chargeValue}>Included</Text>
          </View>
          <View style={styles.chargeRow}>
            <Text style={styles.chargeLabel}>Parking Charges</Text>
            <Text style={styles.chargeValue}>Included</Text>
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.bottomButtons}>
        {ride.trip_status === "driver_assigned" && (
          <TouchableOpacity
            style={[styles.actionBtn, processing && styles.actionBtnDisabled]}
            onPress={markReachedAtPickup}
            disabled={processing}
          >
            <Text style={styles.actionBtnText}>
              {processing ? "Processing..." : "Mark as Reached"}
            </Text>
          </TouchableOpacity>
        )}

        {ride.trip_status === "trip_started" && (
          <TouchableOpacity
            style={[styles.actionBtn, processing && styles.actionBtnDisabled]}
            onPress={() => setCompleteOtpModalVisible(true)}
            disabled={processing}
          >
            <Text style={styles.actionBtnText}>Complete Ride</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Three Dot Menu Modal */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.menuModal}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                setCancelModalVisible(true);
              }}
            >
              <X size={20} color="#EF4444" />
              <Text style={[styles.menuText, { color: "#EF4444" }]}>
                Cancel Ride
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                makePhoneCall(POLICE_NUMBER);
              }}
            >
              <AlertCircle size={20} color="#DC2626" />
              <Text style={styles.menuText}>Call Police (100)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                makePhoneCall(TAXI_SAFAR_SUPPORT);
              }}
            >
              <Phone size={20} color="#059669" />
              <Text style={styles.menuText}>Call Taxi Safar Support</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, styles.menuItemLast]}
              onPress={() => setMenuVisible(false)}
            >
              <Text style={styles.menuCancelText}>Close</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Cancel Modal */}
      <Modal
        visible={cancelModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCancelModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.cancelModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cancel Ride</Text>
              <TouchableOpacity onPress={() => setCancelModalVisible(false)}>
                <X size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Please select a reason for cancellation
            </Text>

            <ScrollView style={styles.reasonsList}>
              {CANCEL_REASONS.map((reason, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.reasonItem,
                    selectedCancelReason === reason &&
                      styles.reasonItemSelected,
                  ]}
                  onPress={() => setSelectedCancelReason(reason)}
                >
                  <View style={styles.radioButton}>
                    {selectedCancelReason === reason && (
                      <View style={styles.radioButtonSelected} />
                    )}
                  </View>
                  <Text style={styles.reasonText}>{reason}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {selectedCancelReason === "Other" && (
              <TextInput
                style={styles.otherReasonInput}
                placeholder="Please specify reason..."
                placeholderTextColor="#999"
                value={otherReason}
                onChangeText={setOtherReason}
                multiline
              />
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalBtnSecondary}
                onPress={() => {
                  setCancelModalVisible(false);
                  setSelectedCancelReason("");
                  setOtherReason("");
                }}
              >
                <Text style={styles.modalBtnSecondaryText}>Back</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalBtnPrimary,
                  processing && styles.modalBtnDisabled,
                ]}
                onPress={cancelRide}
                disabled={processing}
              >
                <Text style={styles.modalBtnPrimaryText}>
                  {processing ? "Cancelling..." : "Confirm Cancel"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* OTP Verification Modal (Start Ride) */}
      <Modal
        visible={otpModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setOtpModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.otpModal}>
            <Text style={styles.otpTitle}>Enter OTP to Start Ride</Text>
            <Text style={styles.otpSubtitle}>
              Ask customer for the 4-digit OTP
            </Text>

            <TextInput
              style={styles.otpInput}
              placeholder="Enter 4-digit OTP"
              placeholderTextColor="#999"
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              maxLength={4}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalBtnSecondary}
                onPress={() => {
                  setOtpModalVisible(false);
                  setOtp("");
                }}
              >
                <Text style={styles.modalBtnSecondaryText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalBtnPrimary,
                  processing && styles.modalBtnDisabled,
                ]}
                onPress={verifyOtp}
                disabled={processing}
              >
                <Text style={styles.modalBtnPrimaryText}>
                  {processing ? "Verifying..." : "Verify & Start"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Complete Ride OTP Modal */}
      <Modal
        visible={completeOtpModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCompleteOtpModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.otpModal}>
            <Text style={styles.otpTitle}>Enter OTP to Complete Ride</Text>
            <Text style={styles.otpSubtitle}>
              Ask customer for the completion OTP
            </Text>

            <TextInput
              style={styles.otpInput}
              placeholder="Enter 4-digit OTP"
              placeholderTextColor="#999"
              value={completeOtp}
              onChangeText={setCompleteOtp}
              keyboardType="number-pad"
              maxLength={4}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalBtnSecondary}
                onPress={() => {
                  setCompleteOtpModalVisible(false);
                  setCompleteOtp("");
                }}
              >
                <Text style={styles.modalBtnSecondaryText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalBtnPrimary,
                  processing && styles.modalBtnDisabled,
                ]}
                onPress={completeRide}
                disabled={processing}
              >
                <Text style={styles.modalBtnPrimaryText}>
                  {processing ? "Completing..." : "Complete Ride"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Universal Alert */}
      <UniversalAlert
        visible={alert.visible}
        onClose={closeAlert}
        type={alert.type}
        title={alert.title}
        message={alert.message}
      />
    </Layout>
  );
}

const styles = StyleSheet.create({
  // Loading & Empty States
  loadingContainer: {
    flex: 1,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f1f1",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },

  // Map
  mapContainer: {
    position: "relative",
    height: 340,
    overflow: "hidden",
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },

  // Map Overlays
  mapOverlay: {
    position: "absolute",
    top: 16,
    right: 16,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    alignItems: "center",
  },
  mapTime: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  mapDistance: {
    color: "#E0E0E0",
    fontSize: 12.5,
    marginTop: 2,
  },

  centerButton: {
    position: "absolute",
    bottom: 20,
    right: 16,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#DC2626",
    justifyContent: "center",
    alignItems: "center",
    elevation: 10,
    shadowColor: "#DC2626",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },

  locationIndicator: {
    position: "absolute",
    bottom: 20,
    left: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.78)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 30,
    gap: 8,
  },
  pulsingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#10B981",
  },
  locationTime: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },

  driverMarker: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#DC2626",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "#fff",
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.3,
  },

  // Cards
  card: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    padding: 18,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },

  customerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#E5E7EB",
    borderWidth: 2,
    borderColor: "#D1D5DB",
  },
  customerName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  rating: {
    fontSize: 14,
    color: "#6B7280",
  },
  callButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#10B981",
    justifyContent: "center",
    alignItems: "center",
  },

  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
  },
  price: {
    fontSize: 26,
    fontWeight: "900",
    color: "#DC2626",
  },
  statusBadge: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
    textTransform: "uppercase",
  },

  dateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  dateText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "600",
  },
  timeText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "700",
  },

  // Vehicle Card
  carCard: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  heading: {
    fontSize: 16,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 6,
  },
  vehicleName: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 12,
  },
  carImage: {
    width: width * 0.7,
    height: 120,
    resizeMode: "contain",
    marginVertical: 12,
  },
  tripTypeWrapper: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 8,
  },
  tripTypeText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#92400E",
  },

  // Locations
  locationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    marginBottom: 12,
  },
  pickupIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#10B981",
  },
  dropIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#EF4444",
  },
  locationText: {
    flex: 1,
    fontSize: 15,
    color: "#374151",
    lineHeight: 22,
  },

  // Charges
  chargeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  chargeLabel: {
    fontSize: 15,
    color: "#6B7280",
  },
  chargeValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },

  // Fixed Bottom Action Button (High Z-Index)
  bottomButtons: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 30,
    paddingTop: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    zIndex: 9999,
  },
  actionBtn: {
    backgroundColor: "#DC2626",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowColor: "#DC2626",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  actionBtnDisabled: {
    backgroundColor: "#9CA3AF",
    shadowOpacity: 0,
  },
  actionBtnText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },

  menuModal: {
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingVertical: 12,
    width: "75%",
    elevation: 20,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 20,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 14,
  },
  menuItemLast: {
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    marginTop: 8,
  },
  menuText: {
    fontSize: 16,
    fontWeight: "600",
  },
  menuCancelText: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    fontWeight: "600",
  },

  cancelModal: {
    backgroundColor: "#fff",
    width: "90%",
    borderRadius: 24,
    padding: 24,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
  },
  modalSubtitle: {
    fontSize: 15,
    color: "#6B7280",
    marginBottom: 20,
    lineHeight: 22,
  },

  reasonsList: {
    maxHeight: 300,
  },
  reasonItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 12,
  },
  reasonItemSelected: {
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  radioButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    justifyContent: "center",
    alignItems: "center",
  },
  radioButtonSelected: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#DC2626",
  },
  reasonText: {
    fontSize: 15.5,
    color: "#374151",
    flex: 1,
  },

  otherReasonInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    fontSize: 15,
    backgroundColor: "#F9FAFB",
    textAlignVertical: "top",
    height: 90,
  },

  otpModal: {
    backgroundColor: "#fff",
    width: "88%",
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
  },
  otpTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8,
  },
  otpSubtitle: {
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 28,
  },
  otpInput: {
    width: "100%",
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    padding: 18,
    fontSize: 20,
    textAlign: "center",
    letterSpacing: 8,
    fontWeight: "700",
    backgroundColor: "#F9FAFB",
    marginBottom: 28,
  },

  modalActions: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  modalBtnSecondary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },
  modalBtnSecondaryText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#6B7280",
  },
  modalBtnPrimary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: "#DC2626",
    alignItems: "center",
  },
  modalBtnDisabled: {
    backgroundColor: "#9CA3AF",
  },
  modalBtnPrimaryText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#fff",
  },
});
