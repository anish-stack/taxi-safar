import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { ArrowLeft, Star, Navigation, MapPin } from "lucide-react-native";
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
import useDriverStore from "../../store/driver.store";

export default function TaxiSafarTripDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { rideId, accpetd } = route.params || {};
  const { token } = loginStore();
  const { driver, fetchDriverDetails } = useDriverStore();
  
  const [ride, setRide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [alert, setAlert] = useState({
    visible: false,
    type: "error",
    title: "",
    message: "",
    details: null,
    onPrimaryPress: null,
  });

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
        message: "Unable to fetch trip details. Please check your internet connection and try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (alertConfig) => {
    setAlert({ visible: true, ...alertConfig });
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
          navigation.navigate("recharge", { amount: lockAmount - walletBalance });
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
            "New Balance": `₹${res.data.data?.newBalance || walletBalance - lockAmount}`,
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
          message: "You need to add money to your wallet before accepting this ride.",
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
          message: errorData?.message || "This ride has already been accepted by another driver. Please check for other available rides.",
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
          message: errorData?.message || "Something went wrong while accepting the ride. Please try again.",
        });
      }
    }
  };

  const decodePolyline = (encoded) => {
    let points = [];
    let index = 0, len = encoded.length;
    let lat = 0, lng = 0;

    while (index < len) {
      let b, shift = 0, result = 0;
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

  if (loading) {
    return (
      <Layout showHeader={false}>
        <SafeAreaView style={styles.container}>
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#FF3B30" />
          </View>
        </SafeAreaView>
      </Layout>
    );
  }

  if (!ride) {
    return (
      <Layout showHeader={false}>
        <SafeAreaView style={styles.container}>
          <View style={styles.center}>
            <Text style={styles.errorText}>Trip not found</Text>
          </View>
        </SafeAreaView>
      </Layout>
    );
  }

  const polyline = ride.routePolyline ? decodePolyline(ride.routePolyline) : [];
  const lockAmount = Math.round((ride.original_amount || 0) * 0.2);

  return (
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <ArrowLeft size={24} color="#000" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Trip Details</Text>
            <Text style={styles.headerSubtitle}>
              {new Date(ride.scheduled_time).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "2-digit",
              })} • {new Date(ride.scheduled_time).toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </View>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Map */}
          <View style={styles.mapContainer}>
            <MapView
              provider={PROVIDER_GOOGLE}
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
                  strokeColor="#4A90E2"
                  lineCap="round"
                />
              )}
              <Marker
                coordinate={{
                  latitude: ride.pickup_location.coordinates[1],
                  longitude: ride.pickup_location.coordinates[0],
                }}
              >
                <View style={styles.pickupMarker}>
                  <Navigation size={16} color="#fff" />
                </View>
              </Marker>
              <Marker
                coordinate={{
                  latitude: ride.destination_location.coordinates[1],
                  longitude: ride.destination_location.coordinates[0],
                }}
              >
                <View style={styles.dropMarker}>
                  <MapPin size={16} color="#FF3B30" fill="#FF3B30" />
                </View>
              </Marker>
            </MapView>
          </View>

          {/* Customer Card */}
          <View style={styles.card}>
            <View style={styles.customerRow}>
              <View style={styles.customerInfo}>
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>
                    {(ride.name || "C").charAt(0).toUpperCase()}
                  </Text>
                </View>
                
                <View style={styles.customerDetails}>
                  <Text style={styles.customerName}>{ride.name}</Text>
                  <View style={styles.ratingRow}>
                    <Star size={14} color="#FFA500" fill="#FFA500" />
                    <Text style={styles.ratingText}>4.8 (127)</Text>
                  </View>
                </View>
              </View>

              <Text style={styles.priceAmount}>
                ₹{ride.original_amount.toLocaleString()}
              </Text>
            </View>

            {/* Dates */}
            <View style={styles.dateRow}>
              <View style={styles.dateItem}>
                <Text style={styles.dateValue}>
                  {new Date(ride.scheduled_time).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </Text>
                <Text style={styles.timeValue}>
                  {new Date(ride.scheduled_time).toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>

              <View style={styles.dateDivider}>
                <View style={styles.dividerDot} />
                <View style={styles.dividerLine} />
                <View style={styles.dividerDot} />
              </View>

              <View style={styles.dateItem}>
                <Text style={styles.dateValue}>
                  {new Date(ride.scheduled_time).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </Text>
                <Text style={styles.timeValue}>
                  {new Date(ride.scheduled_time).toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
            </View>
          </View>

          {/* Vehicle Card */}
          <View style={styles.vehicleCard}>
            <View style={styles.vehicleInfo}>
              <View>
                <Text style={styles.vehicleType}>
                  {ride.vehicle_type || "Maruti WagonR"}
                </Text>
                <Text style={styles.vehicleNumber}>DL 1A B2345</Text>
              </View>
              <Image
                source={require("./car.webp")}
                style={styles.carImage}
                resizeMode="contain"
              />
            </View>
            
            <View style={styles.tripTypeBadge}>
              <Text style={styles.tripTypeText}>
                {ride?.trip_type === "oneWay" ? "One way Trip" : "Round Trip"} - {Math.round(parseFloat(ride?.distance || 0))} km
              </Text>
            </View>
          </View>

          {/* Locations */}
          <View style={styles.card}>
            <View style={styles.locationItem}>
              <Navigation size={16} color="#4A90E2" />
              <Text style={styles.locationText}>{ride.pickup_address}</Text>
            </View>
            
            <View style={styles.locationDivider} />
            
            <View style={styles.locationItem}>
              <View style={styles.viaDot} />
              <Text style={styles.locationText}>
                9th Level 'B'-Wing, Delhi Secretariat, New Delhi-110002
              </Text>
            </View>
            
            <View style={styles.locationDivider} />
            
            <View style={styles.locationItem}>
              <MapPin size={16} color="#FF3B30" />
              <Text style={styles.locationText}>{ride.destination_address}</Text>
            </View>
          </View>

          {/* Trip Info */}
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Trip Distance</Text>
              <Text style={styles.infoValue}>
                {Math.round(parseFloat(ride.distance))} kms
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Trip Duration</Text>
              <Text style={styles.infoValue}>{ride.durationText || "1.25 hours"}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Extra km Charges</Text>
              <Text style={styles.infoValue}>₹12 / km</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Extra Time Charges</Text>
              <Text style={styles.infoValue}>₹2 / minutes</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tolls & Inter State Charges</Text>
              <Text style={styles.infoValue}>Included</Text>
            </View>
            <View style={[styles.infoRow, styles.lastRow]}>
              <Text style={styles.infoLabel}>Parking Charges</Text>
              <Text style={styles.infoValue}>Included</Text>
            </View>
          </View>

          <View style={styles.bottomSpacing} />
        </ScrollView>

        {/* Bottom Button */}
        <View style={styles.bottomButton}>
          <TouchableOpacity
            style={[styles.acceptButton, accepting && styles.acceptButtonDisabled]}
            onPress={handleAcceptPress}
            disabled={accepting}
          >
            <Text style={styles.acceptButtonText}>
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
      </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 16,
    color: "#FF3B30",
    fontFamily: "SFProDisplay-Medium",
  },
  
  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "SFProDisplay-Bold",
    color: "#000",
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: "SFProDisplay-Regular",
    color: "#8E8E93",
    marginTop: 2,
  },

  // Map
  mapContainer: {
    height: 200,
    backgroundColor: "#E5E5EA",
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  pickupMarker: {
    backgroundColor: "#4A90E2",
    padding: 6,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: "#fff",
  },
  dropMarker: {
    backgroundColor: "#FFE5E5",
    padding: 6,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: "#fff",
  },

  // Cards
  card: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 16,
  },

  // Customer Info
  customerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  customerInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#E5E5EA",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 20,
    fontFamily: "SFProDisplay-Bold",
    color: "#8E8E93",
  },
  customerDetails: {
    marginLeft: 12,
  },
  customerName: {
    fontSize: 16,
    fontFamily: "SFProDisplay-Bold",
    color: "#000",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  ratingText: {
    fontSize: 14,
    fontFamily: "SFProDisplay-Regular",
    color: "#000",
    marginLeft: 4,
  },
  priceAmount: {
    fontSize: 20,
    fontFamily: "SFProDisplay-Bold",
    color: "#FF3B30",
  },

  // Dates
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E5EA",
  },
  dateItem: {
    flex: 1,
    alignItems: "center",
  },
  dateValue: {
    fontSize: 13,
    fontFamily: "SFProDisplay-Semibold",
    color: "#000",
  },
  timeValue: {
    fontSize: 13,
    fontFamily: "SFProDisplay-Semibold",
    color: "#000",
    marginTop: 2,
  },
  dateDivider: {
    alignItems: "center",
    marginHorizontal: 16,
  },
  dividerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#C7C7CC",
  },
  dividerLine: {
    width: 1,
    height: 24,
    backgroundColor: "#C7C7CC",
  },

  // Vehicle Card
  vehicleCard: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 16,
  },
  vehicleInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  vehicleType: {
    textTransform:"capitalize",
    fontSize: 15,
    fontFamily: "SFProDisplay-Regular",
    color: "#8E8E93",
  },
  vehicleNumber: {
    fontSize: 18,
    fontFamily: "SFProDisplay-Bold",
    color: "#000",
    marginTop: 2,
  },
  carImage: {
    width: 100,
    height: 50,
  },
  tripTypeBadge: {
    backgroundColor: "#000",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: "center",
  },
  tripTypeText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "SFProDisplay-Semibold",
  },

  // Locations
  locationItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 8,
  },
  locationText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "SFProDisplay-Regular",
    color: "#000",
    marginLeft: 12,
    lineHeight: 18,
  },
  locationDivider: {
    height: 24,
    width: 1,
    backgroundColor: "#E5E5EA",
    marginLeft: 8,
  },
  viaDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#8E8E93",
    marginTop: 5,
  },

  // Info Card
  infoCard: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 16,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F2F2F7",
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  infoLabel: {
    fontSize: 13,
    fontFamily: "SFProDisplay-Regular",
    color: "#8E8E93",
  },
  infoValue: {
    fontSize: 13,
    fontFamily: "SFProDisplay-Semibold",
    color: "#000",
  },

  // Bottom
  bottomSpacing: {
    height: 100,
  },
  bottomButton: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E5EA",
  },
  acceptButton: {
    backgroundColor: "#FF3B30",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  acceptButtonDisabled: {
    opacity: 0.7,
  },
  acceptButtonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "SFProDisplay-Semibold",
  },
});