import React, { useState, useEffect } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  MapPin,
  Clock,
  Car,
  MessageCircle,
  MoreVertical,
  Navigation,
  Star,
  Phone,
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

const GOOGLE_API_KEY = "AIzaSyCuSV_62nxNHBjLQ_Fp-rSTgRUw9m2vzhM";

const ReserveRideDetails = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { rideId } = route.params;
  const { driver, fetchDriverDetails } = useDriverStore()
  const [routeCoords, setRouteCoords] = useState([]);
  const [rideData, setRideData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [distance, setDistance] = useState(0);
  const [duration, setDuration] = useState(0);
  const [mapRegion, setMapRegion] = useState(null);

  // Estimate duration: ~50km/h average speed → 1 hour per ~50km
  const estimateDuration = (distanceKm) =>
    parseFloat((distanceKm / 50).toFixed(2));

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

const initChat = async () => {
  try {
    console.log("🚀 Initializing chat...");
    console.log("📌 Payload:", {
      init_driver_id: driver?._id,
      ride_post_id: rideId,
      other_driver_id: rideData?.driverPostId?._id
    });

    const response = await axios.post(
      `${API_URL_APP_CHAT}/api/chat/init`,
      {
        init_driver_id: driver?._id,
        ride_post_id: rideId,
        other_driver_id: rideData?.driverPostId?._id
      }
    );

    console.log("✅ Chat Init Response:", response.data);
      navigation.navigate('chat')

    if (response.data?.success) {
      navigation.navigate('chat')

      console.log("🎉 Chat created successfully!");
      console.log("🆔 Chat ID:", response.data.chatId);
      console.log("💬 Chat Object:", response.data.chat);
    } else {
      console.log("ℹ️ Chat Exists:", response.data.message);
      console.log("Existing Chat ID:", response.data.chatId);
    }

    return response.data;

  } catch (error) {
    console.log("❌ Chat Init Error:", error?.response?.data || error);
    return null;
  }
};

  const fetchRideDetails = async () => {
    try {
      fetchDriverDetails()
      setLoading(true);
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
    }
  };

  useEffect(() => {
    fetchRideDetails();
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

  const openInMaps = (location) => {
    if (!location?.coordinates) return;
    const [lng, lat] = location.coordinates;
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    Linking.openURL(url).catch(() => { });
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

  const renderDriverPostCard = (trip) => {
    if (!trip) return null;

    const isRoundTrip = trip.tripType === "round-trip";
    const isZeroCommission = Number(trip.commissionAmount) === 0;

    return (
      <View style={styles.tripCard}>
        {/* Badges */}
        <View style={styles.badgeContainer}>
          {isZeroCommission && (
            <LinearGradient
              colors={["#48BB78", "#38A169"]}
              style={styles.zeroCommissionBadge}
            >
              <Text style={styles.badgeText}>0% Commission</Text>
            </LinearGradient>
          )}
        </View>

        {/* Driver Info */}
        <View style={styles.driverHeader}>
          <View style={styles.driverInfo}>
            <View style={styles.avatarContainer}>
              {trip?.driverPostId?.profile_image ? (
                <Image
                  source={{ uri: trip.driverPostId.profile_image }}
                  style={styles.avatarImage}
                />
              ) : (
                <LinearGradient
                  colors={["#FF6B35", "#F7931E"]}
                  style={styles.avatar}
                >
                  <Text style={styles.avatarText}>
                    {(trip?.driverPostId?.driver_name || "D").charAt(0)}
                  </Text>
                </LinearGradient>
              )}
            </View>

            <View style={styles.driverDetails}>
              <Text style={styles.driverName}>
                {trip?.driverPostId?.driver_name || "Driver"}
              </Text>
            </View>
          </View>
          <View style={styles.contactButtons}>
            <TouchableOpacity
              style={styles.phoneButton}
              onPress={() => {
                const phone = trip?.driverPostId?.driver_contact_number;
                if (phone) {
                  Linking.openURL(`tel:${phone}`);
                } else {
                  Toast.show({
                    type: "error",
                    text1: "Phone number not available",
                  });
                }
              }}
            >
              <Phone size={18} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.phoneButton, { backgroundColor: "#3182CE" }]}
            >
              <MessageCircle size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Earnings */}
        <View style={styles.earningsSection}>
          <View style={styles.earningItem}>
            <Text style={styles.earningAmount}>
              ₹{Number(trip.totalAmount || 0).toLocaleString()}
            </Text>
            <Text style={styles.earningLabel}>Total Amount</Text>
          </View>
          <View style={styles.earningDivider} />
          <View style={styles.earningItem}>
            <Text
              style={[
                styles.earningAmount,
                isZeroCommission && styles.zeroCommissionAmount,
              ]}
            >
              ₹{Number(trip.commissionAmount || 0).toLocaleString()}
            </Text>
            <Text style={styles.earningLabel}>Commission</Text>
          </View>
          <View style={styles.earningDivider} />
          <View style={styles.earningItem}>
            <Text style={styles.earningAmountGreen}>
              ₹{Number(trip.driverEarning || 0).toLocaleString()}
            </Text>
            <Text style={styles.earningLabel}>Your Earning</Text>
          </View>
        </View>

        {/* Dates */}
        <View style={styles.dateSection}>
          <View style={styles.dateItem}>
            <Text style={styles.dateLabel}>Pickup Date</Text>
            <Text style={styles.dateValue}>{formatDate(trip.pickupDate)}</Text>
            {isRoundTrip && (
              <Text style={styles.timeValue}>{trip.pickupTime || "N/A"}</Text>
            )}
          </View>

          <View style={styles.dateDivider}>
            <View style={styles.dottedLine} />
            <View style={styles.tripTypeBadge}>
              <Text style={styles.tripTypeText}>
                {isRoundTrip ? "Round Trip" : "One Way Trip"}
              </Text>
            </View>
            {isRoundTrip && <View style={styles.dottedLine} />}
          </View>

          {isRoundTrip ? (
            <View style={styles.dateItem}>
              <Text style={styles.dateLabel}>Return</Text>
              <Text style={styles.dateValue}>
                {trip.returnDate ? formatDate(trip.returnDate) : "TBD"}
              </Text>
              <Text style={styles.timeValue}>{trip.returnTime || "TBD"}</Text>
            </View>
          ) : (
            <View style={styles.dateItem}>
              <Text style={styles.dateLabel}>Pickup Time</Text>
              <Text style={styles.timeValue}>{trip.pickupTime || "N/A"}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#E53E3E" />
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
          <ArrowLeft size={24} color="#1F2937" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Trip Details</Text>
          <Text style={styles.headerSubtitle}>
            {formatDate(rideData.pickupDate)} •{" "}
            {formatTime(rideData.pickupTime)}
          </Text>
        </View>
     
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
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
                  <MapPin size={18} color="#EF4444" fill="#EF4444" />
                </View>
              </Marker>
              {routeCoords.length > 0 && (
                <Polyline
                  coordinates={routeCoords}
                  strokeColor="#E53E3E"
                  strokeWidth={5}
                  lineCap="round"
                />
              )}
            </MapView>
          ) : (
            <View style={styles.mapPlaceholder}>
              <Text style={styles.mapText}>Loading Map...</Text>
            </View>
          )}
        </View>

        {/* Driver Post Card */}
        {renderDriverPostCard(rideData)}

        {/* Locations */}
        <View style={styles.card}>
          <View style={styles.locationItem}>
            <View style={styles.locationDotGreen} />
            <Text style={styles.locationText}>{rideData.pickupAddress}</Text>
          </View>
          <View style={styles.locationDivider} />
          <View style={styles.locationItem}>
            <MapPin size={16} color="#EF4444" />
            <Text style={styles.locationText}>{rideData.dropAddress}</Text>
          </View>
        </View>

        {/* Trip Info */}
        <View style={styles.card}>
          {[
            ["Trip Distance", `${distance} kms`],
            ["Trip Duration", `${duration} hours`],
            ["Extra km Charges", `₹${rideData.extraKmCharge} / km`],
            ["Extra Time Charges", `₹${rideData.extraMinCharge} / min`],
            ["Tolls & Taxes", "Included"],
            ["Parking Charges", "Included"],
          ].map(([label, value]) => (
            <View key={label} style={styles.infoRow}>
              <Text style={styles.infoLabel}>{label}</Text>
              <Text style={styles.infoValue}>{value}</Text>
            </View>
          ))}
        </View>

        {/* Extra Requirements */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Extra Requirements</Text>
          <Text style={styles.requirementsText}>
            {getExtraRequirements(rideData.extraRequirements)}
          </Text>
        </View>

        {/* Notes */}
        {rideData.notes && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.notesText}>{rideData.notes}</Text>
          </View>
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Floating Chat Button */}
      <View style={styles.fabContainer}>
        <TouchableOpacity onPress={()=>initChat()} style={styles.fab}>
          <MessageCircle size={20} color="#fff" />
          <Text style={styles.fabText}>Chat with Drivers</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 16, fontSize: 16, color: "#6B7280" },
  errorText: { fontSize: 16, color: "#EF4444" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: { padding: 8 },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 18, fontWeight: "600", color: "#1F2937" },
  headerSubtitle: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  moreButton: { padding: 8 },

  mapContainer: {
    height: 280,
    overflow: "hidden",
  },
  map: { ...StyleSheet.absoluteFillObject },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },
  mapText: { fontSize: 16, fontWeight: "600", color: "#374151" },

  pickupMarker: {
    backgroundColor: "#10B981",
    padding: 8,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: "#fff",
    elevation: 6,
  },
  dropMarker: {
    backgroundColor: "#FEE2E2",
    padding: 8,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: "#fff",
    elevation: 6,
  },

  card: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
  },
  cardRow: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  row: { flexDirection: "row", alignItems: "center" },
  ml12: { marginLeft: 12 },

  tripCard: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginTop: 16,
    // borderRadius: 20,
    padding: 4,
  },

  badgeContainer: {
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  zeroCommissionBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },

  driverHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  driverInfo: { flexDirection: "row", alignItems: "center", flex: 1 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { fontSize: 20, fontWeight: "800", color: "#fff" },
  driverDetails: { marginLeft: 12, flex: 1 },
  driverName: { fontSize: 18, fontWeight: "700", color: "#1A202C" },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginVertical: 4,
  },
  ratingText: { fontSize: 14, color: "#4A5568" },
  carNameSmall: { fontSize: 14, color: "#4A5568", fontWeight: "500" },

  contactButtons: { flexDirection: "row", gap: 8 },
  phoneButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#48BB78",
    justifyContent: "center",
    alignItems: "center",
  },

  earningsSection: {
    flexDirection: "row",
    backgroundColor: "#F7FAFC",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  earningItem: { flex: 1, alignItems: "center" },
  earningAmount: {
    fontSize: 16,
    fontWeight: "800",
    color: "#E53E3E",
    marginBottom: 4,
  },
  zeroCommissionAmount: { color: "#48BB78" },
  earningAmountGreen: {
    fontSize: 16,
    fontWeight: "800",
    color: "#48BB78",
    marginBottom: 4,
  },
  earningLabel: { fontSize: 12, color: "#4A5568", fontWeight: "600" },
  earningDivider: {
    width: 1,
    height: 32,
    backgroundColor: "#E2E8F0",
    marginHorizontal: 8,
  },

  dateSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dateItem: { flex: 1, alignItems: "center" },
  dateLabel: {
    fontSize: 12,
    color: "#4A5568",
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  dateValue: { fontSize: 14, fontWeight: "600", color: "#1A202C" },
  timeValue: { fontSize: 12, color: "#718096", marginTop: 2 },
  dateDivider: { alignItems: "center" },
  dottedLine: { width: 2, height: 20, backgroundColor: "#E2E8F0" },
  tripTypeBadge: {
    backgroundColor: "#1A202C",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginHorizontal: 8,
  },
  tripTypeText: { color: "#fff", fontSize: 11, fontWeight: "600" },

  vehicleType: { fontSize: 16, fontWeight: "600", color: "#1F2937" },
  vehicleStatus: { fontSize: 12, color: "#F59E0B", marginTop: 4 },

  textCenter: { alignItems: "center" },
  priceAmount: { fontSize: 16, fontWeight: "700", color: "#E53E3E" },
  priceLabel: { fontSize: 11, color: "#6B7280", marginTop: 4 },

  locationItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginVertical: 8,
  },
  locationDotGreen: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#10B981",
    marginTop: 4,
    marginRight: 12,
  },
  locationText: { flex: 1, fontSize: 13, color: "#374151", lineHeight: 20 },
  locationDivider: {
    height: 30,
    width: 2,
    backgroundColor: "#E5E7EB",
    marginLeft: 5,
  },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  infoLabel: { fontSize: 13, color: "#6B7280" },
  infoValue: { fontSize: 13, fontWeight: "600", color: "#1F2937" },

  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  requirementsText: { fontSize: 13, color: "#6B7280", lineHeight: 20 },
  notesText: { fontSize: 13, color: "#6B7280", lineHeight: 20 },

  fabContainer: {
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  fab: {
    backgroundColor: "#E53E3E",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  fabText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    resizeMode: "cover",
  },

  bottomSpacing: { height: 20 },
});

export default ReserveRideDetails;
