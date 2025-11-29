import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MapView, { Marker, Polyline } from "react-native-maps";
import { ArrowLeft } from "lucide-react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import axios from "axios";
import { API_URL_APP } from "../../constant/api";
import loginStore from "../../store/auth.store";
import Layout from "../common/layout";
import { fetchWithRetry } from "../../utils/fetchWithRetry";
import {
  UniversalAlert,
  PaymentConfirmationModal,
} from "../common/UniversalAlert";

import mini from "../../assets/mini.png";
import sedan from "../../assets/sedan.jpeg";
import suv from "../../assets/suv.png";
import useDriverStore from "../../store/driver.store";

const { width } = Dimensions.get("window");

export default function TaxiSafarTripDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { rideId, accpetd } = route.params || {};
  const { token } = loginStore();
  const { driver, fetchDriverDetails } = useDriverStore();
  const [ride, setRide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  // Alert States
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [alert, setAlert] = useState({
    visible: false,
    type: "error",
    title: "",
    message: "",
    details: null,
    onPrimaryPress: null,
  });

  const [walletBalance, setWalletBalance] = useState(0);


  useEffect(() => {
    fetchRide();
    fetchDriverDetails();
    if (driver) {
      setWalletBalance(driver?.wallet?.balance || 0);
    }
  }, [rideId, token]);

  const fetchRide = async () => {
    if (!rideId) {
      showAlert({
        type: "error",
        title: "Error",
        message: "No trip ID found",
        onPrimaryPress: () => navigation.goBack(),
      });
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
          "Unable to fetch trip details. Please check your internet connection and try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (alertConfig) => {
    setAlert({
      visible: true,
      ...alertConfig,
    });
  };

  const closeAlert = () => {
    setAlert({ ...alert, visible: false });
  };

  const handleAcceptPress = () => {
    const lockAmount = Math.round((ride.original_amount || 0) * 0.2);

    if (walletBalance < lockAmount) {
      showAlert({
        type: "warning",
        title: "Insufficient Balance",
        message: `You need ₹${lockAmount} in your wallet to accept this ride, but you only have ₹${walletBalance}.`,
        details: {
          "Required Amount": `₹${lockAmount}`,
          "Your Balance": `₹${walletBalance}`,
          Shortfall: `₹${lockAmount - walletBalance}`,
        },
        primaryButton: "Add Money",
        secondaryButton: "Cancel",
        onPrimaryPress: () => {
          closeAlert();
          navigation.navigate("recharge", {
            amount: lockAmount - walletBalance,
          });
        },
      });
      return;
    }

    setShowPaymentModal(true);
  };

  const handleConfirmAccept = async () => {
    setAccepting(true);
    fetchDriverDetails();
    try {
      const res = await axios.post(
        `${API_URL_APP}/api/v1/accept-ride/${rideId}`,
        { rideId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        setShowPaymentModal(false);
        setAccepting(false);

        const lockAmount =
          res.data.data?.lockedAmount ||
          Math.round((ride.original_amount || 0) * 0.2);

        showAlert({
          type: "success",
          title: "Ride Accepted! 🎉",
          message: `You have successfully accepted this ride. ₹${lockAmount} has been locked from your wallet and will be released after trip completion.`,
          details: {
            "Ride Amount": `₹${ride.original_amount.toLocaleString()}`,
            "Locked Amount": `₹${lockAmount}`,
            "New Balance": `₹${
              res.data.data?.newBalance || walletBalance - lockAmount
            }`,
          },
          primaryButton: "View Trip",
          secondaryButton: "Go Home",
          onPrimaryPress: () => {
            closeAlert();
            navigation.navigate("Reserve");
          },
          onSecondaryPress: () => {
            closeAlert();
            navigation.replace("DriverDashboard");
          },
        });
      } else {
        throw new Error(res.data.message);
      }
    } catch (err) {
      console.log(err.response?.data);
      setAccepting(false);
      setShowPaymentModal(false);

      const errorData = err.response?.data;

      if (errorData?.action === "add_money") {
        showAlert({
          type: "warning",
          title: errorData.message || "Insufficient Balance",
          message:
            "You need to add money to your wallet before accepting this ride.",
          details: errorData.details || null,
          primaryButton: "Add Money",
          secondaryButton: "Cancel",
          onPrimaryPress: () => {
            closeAlert();
            navigation.navigate("Wallet");
          },
        });
      } else if (err.response?.status === 409) {
        showAlert({
          type: "info",
          title: "Ride Already Taken",
          message:
            errorData?.message ||
            "This ride has already been accepted by another driver. Please check for other available rides.",
          primaryButton: "Find Rides",
          onPrimaryPress: () => {
            closeAlert();
            navigation.goBack();
          },
        });
      } else {
        showAlert({
          type: "error",
          title: "Failed to Accept",
          message:
            errorData?.message ||
            "Something went wrong while accepting the ride. Please try again.",
        });
      }
    }
  };

  const decodePolyline = (encoded) => {
    let points = [];
    let index = 0,
      len = encoded.length;
    let lat = 0,
      lng = 0;

    while (index < len) {
      let b,
        shift = 0,
        result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      let dlat = result & 1 ? ~(result >> 1) : result >> 1;
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      let dlng = result & 1 ? ~(result >> 1) : result >> 1;
      lng += dlng;

      points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
    }
    return points;
  };

  const vehicleImage =
    ride?.vehicle_type === "mini"
      ? mini
      : ride?.vehicle_type === "sedan"
      ? sedan
      : ride?.vehicle_type === "suv"
      ? suv
      : mini;

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
  const lockAmount = Math.round((ride.original_amount || 0) * 0.2);

  return (
    <Layout showHeader={false} showBottomTabs={false}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <ArrowLeft size={28} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Trip Details</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Map */}
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: ride.pickup_location.coordinates[1],
              longitude: ride.pickup_location.coordinates[0],
              latitudeDelta: 2.5,
              longitudeDelta: 2.5,
            }}
          >
            {polyline.length > 0 && (
              <Polyline
                coordinates={polyline}
                strokeWidth={4}
                strokeColor="#DC2626"
              />
            )}
            <Marker
              coordinate={{
                latitude: ride.pickup_location.coordinates[1],
                longitude: ride.pickup_location.coordinates[0],
              }}
            />
            <Marker
              coordinate={{
                latitude: ride.destination_location.coordinates[1],
                longitude: ride.destination_location.coordinates[0],
              }}
            />
          </MapView>
          <View style={styles.mapOverlay}>
            <Text style={styles.mapTime}>
              {ride.durationText || "Calculating..."}
            </Text>
            <Text style={styles.mapDistance}>
              {parseFloat(ride.distance).toFixed(0)} km
            </Text>
          </View>
        </View>

        {/* Customer Card */}
        <View style={styles.card}>
          <View style={styles.customerHeader}>
            <View style={styles.avatar} />
            <View style={{ flex: 1 }}>
              <Text style={styles.customerName}>{ride.name}</Text>
              <View style={styles.ratingRow}>
                <Text style={styles.rating}>4.8 (127)</Text>
              </View>
            </View>
            <Text style={styles.price}>
              ₹{ride.original_amount.toLocaleString()}
            </Text>
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

        {/* Vehicle Card */}
        <View style={styles.carCard}>
          <Text style={styles.heading}>Booking for Vehicle</Text>
          <Text style={styles.vehicleName}>
            {ride.vehicle_type || "Maruti Swift Dzire"}
          </Text>
          <Image source={vehicleImage} style={styles.carImage} />
          <View style={styles.tripTypeWrapper}>
            <Text style={styles.tripTypeText}>
              {ride?.trip_type === "oneWay" ? "One Way Trip" : "Round Trip"} •{" "}
              {Math.round(parseFloat(ride?.distance || 0))} km
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

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Accept Button */}
      <View style={styles.bottomButton}>
        <TouchableOpacity
          style={[styles.acceptBtn, accepting && styles.acceptBtnDisabled]}
          onPress={handleAcceptPress}
          disabled={accepting}
        >
          <Text style={styles.acceptText}>
            Accept Fare on ₹{ride.original_amount.toLocaleString()}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Payment Confirmation Modal */}
      <PaymentConfirmationModal
        visible={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onConfirm={handleConfirmAccept}
        rideAmount={ride.original_amount}
        lockAmount={lockAmount}
        availableBalance={walletBalance}
        loading={accepting}
      />

      {/* Universal Alert */}
      <UniversalAlert
        visible={alert.visible}
        onClose={closeAlert}
        type={alert.type}
        title={alert.title}
        message={alert.message}
        details={alert.details}
        primaryButton={alert.primaryButton}
        secondaryButton={alert.secondaryButton}
        onPrimaryPress={alert.onPrimaryPress}
        onSecondaryPress={alert.onSecondaryPress}
      />
    </Layout>
  );
}

const styles = StyleSheet.create({
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
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
  },
  headerTitle: { fontSize: 20, fontWeight: "bold" },
  mapContainer: { position: "relative" },
  map: { height: 250 },
  mapOverlay: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  mapTime: { color: "#fff", fontSize: 13, fontWeight: "600" },
  mapDistance: { color: "#fff", fontSize: 12 },
  card: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#999",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  customerHeader: { flexDirection: "row", alignItems: "center" },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#E5E7EB",
    marginRight: 12,
  },
  customerName: { fontSize: 18, fontWeight: "bold" },
  ratingRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  rating: { fontSize: 14, color: "#666", marginLeft: 4 },
  price: { fontSize: 22, fontWeight: "bold", color: "#DC2626" },
  dateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    alignItems: "center",
  },
  dateText: { fontSize: 16, fontWeight: "600" },
  timeText: { fontSize: 16, color: "#DC2626", fontWeight: "600" },
  carCard: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 20,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  heading: {
    fontSize: 14,
    fontWeight: "600",
    color: "#888",
    marginBottom: 6,
  },
  vehicleName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#222",
    textTransform: "capitalize",
    marginBottom: 12,
  },
  carImage: {
    width: "100%",
    height: 150,
    resizeMode: "contain",
    borderRadius: 16,
    backgroundColor: "#f8f8f8",
    padding: 10,
    marginBottom: 14,
  },
  tripTypeWrapper: {
    backgroundColor: "#000",
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  tripTypeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginVertical: 8,
  },
  pickupIcon: {
    width: 20,
    height: 20,
    backgroundColor: "#10B981",
    borderRadius: 10,
    marginRight: 12,
    marginTop: 4,
  },
  dropIcon: {
    width: 20,
    height: 20,
    backgroundColor: "#EF4444",
    borderRadius: 10,
    marginRight: 12,
    marginTop: 4,
  },
  locationText: { flex: 1, fontSize: 15, color: "#374151", lineHeight: 22 },
  chargeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: "#F3F4F6",
  },
  chargeLabel: { fontSize: 15, color: "#6B7280" },
  chargeValue: { fontSize: 15, fontWeight: "600", color: "#111827" },
  bottomButton: {
    padding: 20,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: "#E5E7EB",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  acceptBtn: {
    backgroundColor: "#DC2626",
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
  },
  acceptBtnDisabled: { opacity: 0.7 },
  acceptText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
});
