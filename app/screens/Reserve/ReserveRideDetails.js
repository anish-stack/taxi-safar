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
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import {
  ArrowLeft,
  MapPin,
  Phone,
  MessageCircle,
  Star,
  Navigation,
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
import useDriverStore from "../../store/driver.store";

const GOOGLE_API_KEY = "AIzaSyCuSV_62nxNHBjLQ_Fp-rSTgRUw9m2vzhM";

const formatTime12Hour = (time) => {
  if (!time) return "07:00 PM";

  // supports "HH:mm" or "HH:mm:ss"
  const [hour, minute] = time.split(":");
  const h = parseInt(hour, 10);

  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;

  return `${hour12}:${minute} ${period}`;
};

const ReserveRideDetailsRedesigned = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { rideId } = route.params;
  const { driver, fetchDriverDetails } = useDriverStore();
  const insets = useSafeAreaInsets();
  const [routeCoords, setRouteCoords] = useState([]);
  const [rideData, setRideData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [distance, setDistance] = useState(0);
  const [duration, setDuration] = useState(0);
  const [mapRegion, setMapRegion] = useState(null);

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
      return response.data;
    } catch (error) {
      console.log("❌ Chat Init Error:", error?.response?.data || error);
      return null;
    }
  };

  const fetchRideDetails = async () => {
    try {
      fetchDriverDetails();
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

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FF3B30" />
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

  const isRoundTrip = rideData.tripType === "round-trip";

  return (
    <SafeAreaView style={[styles.container, { paddingBottom: insets.bottom }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color="#000" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Trip Details</Text>
          <Text style={styles.headerSubtitle}>
            {formatDate(rideData.pickupDate)} •{" "}
            {formatTime12Hour(rideData.pickupTime)}
          </Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={{ paddingBottom: insets.bottom }}
        showsVerticalScrollIndicator={false}
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
                  <Navigation size={16} color="#fff" />
                </View>
              </Marker>
              <Marker
                coordinate={{
                  latitude: rideData.dropLocation.coordinates[1],
                  longitude: rideData.dropLocation.coordinates[0],
                }}
              >
                <View style={styles.dropMarker}>
                  <MapPin size={16} color="#FF3B30" fill="#FF3B30" />
                </View>
              </Marker>
              {routeCoords.length > 0 && (
                <Polyline
                  coordinates={routeCoords}
                  strokeColor="#4A90E2"
                  strokeWidth={4}
                  lineCap="round"
                />
              )}
            </MapView>
          ) : null}
        </View>

        {/* Trip Posted By Card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Trip Posted By</Text>

          <View style={styles.driverRow}>
            <View style={styles.driverInfo}>
              {rideData?.driverPostId?.profile_image ? (
                <Image
                  source={{ uri: rideData.driverPostId.profile_image }}
                  style={styles.avatar}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>
                    {(rideData?.driverPostId?.driver_name || "D").charAt(0)}
                  </Text>
                </View>
              )}

              <View style={styles.driverDetails}>
                <Text style={styles.driverName}>
                  {rideData?.driverPostId?.driver_name || "Driver"}
                </Text>
                <View style={styles.ratingRow}>
                  <Star size={14} color="#FFA500" fill="#FFA500" />
                  <Text style={styles.ratingText}>
                    {rideData?.driverPostId?.average_rating || "4.8"} (
                    {rideData?.driverPostId?.total_reviews || "127"})
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
                    <Phone size={18} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.chatButton}
                    onPress={initChat}
                  >
                    <MessageCircle size={18} color="#fff" />
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity style={styles.chatButton} onPress={initChat}>
                  <MessageCircle size={18} color="#fff" />
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

          {/* Dates */}
          <View style={styles.dateRow}>
            <View style={styles.dateItem}>
              <Text style={styles.dateValue}>
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
                <Text style={styles.dateValue}>
                  {rideData.returnDate
                    ? formatDate(rideData.returnDate)
                    : "TBD"}
                </Text>
                <Text style={styles.timeValue}>
                  {rideData.returnTime || "TBD"}
                </Text>
              </View>
            ) : (
              <View style={styles.dateItem}>
                <Text style={styles.dateValue}>
                  {formatDate(rideData.pickupDate)}
                </Text>
                <Text style={styles.timeValue}>
                  {formatTime12Hour(rideData.pickupTime)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Vehicle Info */}
        {/* <View style={styles.vehicleCard}>
          <View style={styles.vehicleInfo}>
            <View>
              <Text style={styles.vehicleName}>
                {rideData.vehicleType || "Maruti WagonR"}
              </Text>
              <Text style={styles.vehicleNumber}>
                {rideData.vehicleNumber || "DL 1A B2345"}
              </Text>
            </View>
            <Image
              source={require("./car.webp")}
              style={styles.carImage}
              resizeMode="contain"
            />
          </View>

         
        </View> */}

        {/* Locations */}
        <View style={styles.card}>
          <View style={styles.locationItem}>
            <Navigation size={16} color="#4A90E2" />
            <Text style={styles.locationText}>{rideData.pickupAddress}</Text>
          </View>

          {rideData.viaAddress && (
            <>
              <View style={styles.locationDivider} />
              <View style={styles.locationItem}>
                <View style={styles.viaDot} />
                <Text style={styles.locationText}>{rideData.viaAddress}</Text>
              </View>
            </>
          )}
          <View style={styles.tripTypeBadge}>
            <Text style={styles.tripTypeText}>
              {isRoundTrip ? "Round Trip" : "One way Trip"} - {distance} km
            </Text>
          </View>
          {/* <View style={styles.locationDivider} /> */}
          <View style={styles.locationItem}>
            <MapPin size={16} color="#FF3B30" />
            <Text style={styles.locationText}>{rideData.dropAddress}</Text>
          </View>
        </View>

        {/* Trip Info */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Trip Distance</Text>
            <Text style={styles.infoValue}>{distance} kms</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Trip Duration</Text>
            <Text style={styles.infoValue}>{duration} hours</Text>
          </View>
          {rideData.extraKmCharge === 0 ? null : (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Extra km Charges</Text>
              <Text style={styles.infoValue}>
                ₹{rideData.extraKmCharge} / km
              </Text>
            </View>
          )}

          {rideData.extraMinCharge === 0 ? null : (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Extra Time Charges</Text>
              <Text style={styles.infoValue}>
                ₹{rideData.extraMinCharge} / Hours
              </Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Tolls & Inter State Charges</Text>
            <Text style={styles.infoValue}>Included</Text>
          </View>
          <View style={[styles.infoRow, styles.lastRow]}>
            <Text style={styles.infoLabel}>Parking Charges</Text>
            <Text style={styles.infoValue}>Included</Text>
          </View>
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

      {/* Bottom Button */}
      <View style={styles.bottomButton}>
        <TouchableOpacity
          style={styles.acceptButton}
          activeOpacity={0.8}
          onPress={() => initChat()}
        >
          <Text style={styles.acceptButtonText}>Accept Post Trip</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default ReserveRideDetailsRedesigned;
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
  sectionTitle: {
    fontSize: 16,
    fontFamily: "SFProDisplay-Bold",
    color: "#000",
    marginBottom: 12,
  },

  // Driver Info
  driverRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  driverInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
  driverDetails: {
    marginLeft: 12,
  },
  driverName: {
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
  contactButtons: {
    flexDirection: "row",
    gap: 8,
  },
  phoneButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#34C759",
    justifyContent: "center",
    alignItems: "center",
  },
  chatButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },

  // Pricing
  pricingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#E5E5EA",
  },
  priceItem: {
    alignItems: "center",
  },
  priceAmount: {
    fontSize: 16,
    fontFamily: "SFProDisplay-Bold",
    color: "#000",
  },
  priceAmountRed: {
    fontSize: 16,
    fontFamily: "SFProDisplay-Bold",
    color: "#FF3B30",
  },
  priceAmountGreen: {
    fontSize: 16,
    fontFamily: "SFProDisplay-Bold",
    color: "#388E3C",
  },
  priceLabel: {
    fontSize: 11,
    fontFamily: "SFProDisplay-Regular",
    color: "#000",
    marginTop: 4,
    fontWeight: "900",
  },

  // Dates
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
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
    flexDirection: "row",
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
    width: 74,
    height: 1,
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
  vehicleName: {
    textTransform: "capitalize",

    fontSize: 15,
    fontFamily: "SFProDisplay-Bold",
    color: "#000",
  },
  vehicleNumber: {
    fontSize: 14,
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

  // Requirements & Notes
  requirementsText: {
    fontSize: 13,
    fontFamily: "SFProDisplay-Regular",
    color: "#000",
    lineHeight: 20,
  },
  notesText: {
    fontSize: 13,
    fontFamily: "SFProDisplay-Regular",
    color: "#000",
    lineHeight: 20,
  },

  // Bottom
  bottomSpacing: {
    height: 100,
  },
  bottomButton: {
    position: "absolute",
    bottom: 30,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E5EA",
  },
  acceptButton: {
    backgroundColor: "#000",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  acceptButtonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "SFProDisplay-Bold",
  },
});
