import React, { useState, useEffect, useRef } from "react";
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
  Share,
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
  Edit2,
  Trash2,
  Send,
  DollarSign,
  Share2,
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
import loginStore from "../../store/auth.store";
import { io } from "socket.io-client";
import { Colors } from "../../constant/ui";

const GOOGLE_API_KEY = "AIzaSyCuSV_62nxNHBjLQ_Fp-rSTgRUw9m2vzhM";

const formatTime12Hour = (time) => {
  if (!time) return "07:00 PM";
  const [hour, minute] = time.split(":");
  const h = parseInt(hour, 10);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${minute} ${period}`;
};

const estimateDurationMinutes = (distanceKm) => {
  const hours = distanceKm / 50;
  return Math.round(hours * 60);
};

const getArrivalDateTime = (pickupDate, pickupTime, distanceKm) => {
  if (!pickupDate || !pickupTime || !distanceKm) return null;

  let date;
  if (pickupDate instanceof Date) {
    date = new Date(pickupDate);
  } else {
    date = new Date(pickupDate);
  }

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

const ReserveRideDetailsRedesigned = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { rideId } = route.params;
  const { token } = loginStore();

  const { driver, fetchDriverDetails } = useDriverStore();
  const insets = useSafeAreaInsets();
  const [routeCoords, setRouteCoords] = useState([]);
  const [rideData, setRideData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [owner, setOwner] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [distance, setDistance] = useState(0);
  const [duration, setDuration] = useState(0);
  const [mapRegion, setMapRegion] = useState(null);
  const socketRef = useRef(null);
  const [detailsSent, setDetailsSent] = useState(false);
  const [chat, setChat] = useState(null);

  useEffect(() => {
    fetchDriverDetails();
    socketRef.current = io(API_URL_APP_CHAT, {
      transports: ["websocket", "polling"],
    });

    socketRef.current.emit("driver_online", {
      driver_id: driver?._id,
    });

    socketRef.current.on("error", (data) => {
      console.error("Socket error:", data.message);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const fetchGoogleRoute = async (origLat, origLng, destLat, destLng) => {
    try {
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origLat},${origLng}&destination=${destLat},${destLng}&key=${GOOGLE_API_KEY}&mode=driving`;
      const res = await fetch(url);
      const json = await res.json();

      if (json.routes?.[0]?.overview_polyline?.points) {
        setRouteCoords(decodePolyline(json.routes[0].overview_polyline.points));
      }
    } catch (err) {
      console.log("Directions API failed");
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
  // console.log(chat)
  const initChat = async () => {
    if (chatLoading) return; // 🛑 prevent double click

    setChatLoading(true);

    try {
      // ✅ If chat already exists
      if (detailsSent && chat?._id) {
        Alert.alert("Info", "Driver details already sent in chat");

        navigation.navigate("ChatBox", {
          chat,
          role: "initiator",
        });

        return; // 🛑 STOP here
      }

      const payload = {
        init_driver_id: driver?._id,
        ride_post_id: rideId,
        other_driver_id: rideData?.driverPostId?._id,
      };

      console.log("📤 Chat init payload:", payload);

      const response = await axios.post(
        `${API_URL_APP_CHAT}/api/chat/init`,
        payload
      );

      console.log("📥 Chat init response:", response?.data);

      if (response?.data?.success && response?.data?.chat) {
        console.log("✅ Chat initialized successfully");

        setChat(response.data.chat);

        navigation.navigate("ChatBox", {
          chat: response.data.chat,
          role: "initiator",
        });

        return response.data.chat;
      }

      Alert.alert("Error", response?.data?.message || "Unable to start chat");
      return null;
    } catch (error) {
      console.error("❌ Chat init error");

      if (error.response) {
        console.error("🔴 Status:", error.response.status);
        console.error("🔴 Data:", error.response.data);

        Alert.alert(
          "Chat Error",
          error.response.data?.message || "Server error"
        );
      } else {
        Alert.alert("Network Error", "Please check your internet connection");
      }

      return null;
    } finally {
      setChatLoading(false); // ✅ only once
    }
  };

  const fetchMessages = async () => {
    try {
      const res = await axios.get(`${API_URL_APP_CHAT}/api/chat/${rideId}`, {
        params: { driver_id: driver?._id },
        headers: { Authorization: `Bearer ${token}` },
      });

      const hasSentDetails = res.data.chat.messages?.some(
        (msg) =>
          msg.messageType === "driver_details" && msg.sender === driver?._id
      );

      setDetailsSent(hasSentDetails);
    } catch (error) {
      console.error("Error fetching messages:", error.response.data);
    } finally {
      setLoading(false);
    }
  };

  const sendDriverDetails = async () => {
    try {
      let chatData = chat;
      if (!chatData) {
        chatData = await initChat();
        console.log("Chat initialized:", chatData);
        if (!chatData) {
          Alert.alert("Error", "Failed to initialize chat");
          return;
        }
      }

      const vehicle = driver?.current_vehicle_id;
      const photos = vehicle?.vehicle_photos || {};

      const frontUrl = photos?.front?.url || null;
      const backUrl = photos?.back?.url || null;
      const interiorUrl = photos?.interior?.url || null;

      const detailsText = `🚗 Driver Details  
━━━━━━━━━━━━━━━━━━  
👤 Name: ${driver?.driver_name || "N/A"}  
📞 Contact: ${driver?.driver_contact_number || "N/A"}  

🚙 Vehicle Details  
• Number: ${vehicle?.vehicle_number || "N/A"}  
• Name: ${vehicle?.vehicle_name || "N/A"}  
• Fuel Type: ${vehicle?.fuel_type || "N/A"}  

🖼 Vehicle Photos  
• Front: ${frontUrl ? frontUrl : "N/A"}  
• Back: ${backUrl ? backUrl : "N/A"}  
• Interior: ${interiorUrl ? interiorUrl : "N/A"}  
`;

      socketRef.current.emit("send_message", {
        chatId: chatData?._id,
        sender: driver?._id,
        text: detailsText,
        messageType: "driver_details",
        vehiclePhotos: {
          front: frontUrl,
          back: backUrl,
          interior: interiorUrl,
        },
      });

      setDetailsSent(true);
      Alert.alert("Success", "Details sent successfully");

      navigation.navigate("ChatBox", {
        chat: chatData,
        role: "initiator",
      });
    } catch (error) {
      console.error("Error:", error);
      Alert.alert("Error", "Failed to send details");
    }
  };
  const askForPaymentLink = () => {
    if (!detailsSent) {
      Alert.alert(
        "Request Details First",
        "Please send your details first before requesting payment link"
      );
      return;
    }

    if (!chat) {
      Alert.alert("Error", "Chat not initialized");
      return;
    }

    const detailsText =
      "💰 Please send the payment link at your earliest convenience.";

    socketRef.current.emit("send_message", {
      chatId: chat?._id,
      sender: driver?._id,
      text: detailsText,
      messageType: "payment_link",
    });

    Alert.alert("Success", "Payment link request sent");
  };

const shareBookingDetails = async () => {
  try {
    const vehicleType = (rideData?.vehicleType || "").toLowerCase();

    const vehicleMap = {
      mini: { name: "Maruti WagonR", capacity: 4 },
      sedan: { name: "Maruti Swift Dzire", capacity: 4 },
      suv: { name: "Maruti Ertiga / Innova", capacity: 6 },
    };

    const vehicleInfo = vehicleMap[vehicleType] || {
      name: "Any Available Vehicle",
      capacity: "As per availability",
    };

    const shareText = `🚗 *Taxi Safar – Booking Details*
━━━━━━━━━━━━━━━━━━━━

📍 *Trip Details*
• Pickup: ${rideData?.pickupAddress || "N/A"}
• Drop: ${rideData?.dropAddress || "N/A"}
• Distance: ${distance || "N/A"} km
• Duration: ${duration || "N/A"} Hour(s)

⏰ *Date & Time*
• Pickup Date: ${formatDate(rideData?.pickupDate)}
• Pickup Time: ${formatTime12Hour(rideData?.pickupTime)}

🚕 *Vehicle Details*
• Type: ${vehicleType.toUpperCase() || "N/A"}
• Preferred Vehicle: ${vehicleInfo.name} (Any Available Vehicle)
• Seating Capacity: ${vehicleInfo.capacity}

💰 *Fare Details*
• Total Fare: ₹${Number(rideData?.totalAmount || 0).toLocaleString()}
• Commission: ₹${Number(rideData?.commissionAmount || 0).toLocaleString()}
• Driver Earning: ₹${Number(rideData?.driverEarning || 0).toLocaleString()}

Thank you for choosing *Taxi Safar*!
Safe & Happy Journey 🚖`;

    await Share.share({
      title: "Taxi Safar Booking Details",
      message: shareText,
    });
  } catch (error) {
    console.error("Share booking details error:", error);
  }
};

  const handleStartRide = async () => {
    try {
      if (!rideId) {
        return Alert.alert("Error", "Ride ID missing");
      }

      const response = await axios.post(
        `${API_URL_APP}/api/v1/start-trip-post/${rideData?._id}`,
        {
          init_driver_id: driver?._id,
          ride_post_id: rideId,
          other_driver_id: rideData?.driverPostId?._id,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data?.success) {
        Alert.alert("Ride Started", "Your ride has been started");
        setRideData((prev) => ({
          ...prev,
          rideStatus: "started",
        }));
      }
    } catch (error) {
      const errorMsg = error?.response?.data?.message;
      if (errorMsg?.includes("too far")) {
        Alert.alert(
          "Too Far",
          "Please reach within 500 meters of pickup location"
        );
      } else {
        Alert.alert("Error", errorMsg || "Failed to start ride");
      }
    }
  };

  const handleDeleteRide = async (rideId) => {
    Alert.alert("Delete Ride", "Are you sure you want to delete this ride?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const res = await axios.delete(
              `${API_URL_APP}/api/v1/delete-post-ride/${rideId}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );

            if (res.data?.success) {
              Alert.alert("Success", "Ride deleted");
              navigation.goBack();
            }
          } catch (error) {
            Alert.alert("Error", "Failed to delete ride");
          }
        },
      },
    ]);
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

  const estimateDuration = (distanceKm) => {
    const speedKmPerHr = 50;
    const totalHours = distanceKm / speedKmPerHr;
    const hours = Math.floor(totalHours);
    const mH = hours < 9 ? `0${hours}` : hours;
    const minutes = Math.round((totalHours - hours) * 60);
    return `${mH}:${minutes.toString().padStart(2, "0")}`;
  };

  const fetchRideDetails = async () => {
    try {
      fetchDriverDetails();
      setLoading(true);
      const { data } = await axios.get(
        `${API_URL_APP}/api/v1/post-rides/${rideId}`
      );

      if (data.success) {
        const ride = data?.data;
        setRideData(ride);
        if (ride?.driverPostId?._id === driver?._id) {
          setOwner(true);
        } else {
          setOwner(false);
        }
        await fetchMessages();
        const [pickupLng, pickupLat] = ride.pickupLocation.coordinates;
        const [dropLng, dropLat] = ride.dropLocation.coordinates;

        const dist = calculateDistance(pickupLat, pickupLng, dropLat, dropLng);
        setDistance(dist);
        setDuration(estimateDuration(dist));

        calculateMapRegionAndRoute(ride);
      }
    } catch (error) {
      console.error("Error:", error);
      Alert.alert("Error", "Failed to load ride details");
    } finally {
      setLoading(false);
    }
  };

  // console.log("totalRatings", rideData?._id);

  useEffect(() => {
    fetchRideDetails();
  }, [rideId]);

  const successfulRides = rideData?.companyId?.successfulRides || 0;
  const cancelledRides = rideData?.companyId?.CancelRides || 0;

  const totalRides = successfulRides + cancelledRides;
  const cancelPercentage =
    totalRides > 0 ? ((cancelledRides / totalRides) * 100).toFixed(1) : 0;

  const succesPercentage =
    totalRides > 0 ? ((successfulRides / totalRides) * 100).toFixed(1) : 0;
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

  const includedItems = [];
  const requirementsMap = {
    onlyDiesel: "Only Diesel",
    musicSystem: "Music System",
    ac: "AC",
    carrier: "Carrier",
    allInclusive: "All Inclusive",
    allExclusive: "All Exclusive",
    foodAllowed: "Food Allowed",
  };

  Object.entries(rideData.extraRequirements || {}).forEach(([key, value]) => {
    if (value) {
      includedItems.push(requirementsMap[key]);
    }
  });

  if (!rideData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.errorText}>Failed to load details</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isRoundTrip = rideData.tripType === "round-trip";
  const arrivalDateTime = !isRoundTrip
    ? getArrivalDateTime(rideData.pickupDate, rideData.pickupTime, distance)
    : null;

  return (
    <SafeAreaView style={[styles.container, { paddingBottom: insets.bottom }]}>
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

      <ScrollView showsVerticalScrollIndicator={false}>
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
              {rideData?._id
                ? `CRN-${rideData._id.slice(-4)}`.toUpperCase()
                : ""}
            </Text>
          </View>

          <View style={cardDriverStyles.container}>
            {/* Header Section - Avatar, Name & Rating */}
            <View style={cardDriverStyles.header}>
              <View style={cardDriverStyles.avatarSection}>
                {rideData?.companyId?.logo ? (
                  <Image
                    source={{ uri: rideData?.companyId?.logo?.url }}
                    style={cardDriverStyles.avatar}
                  />
                ) : (
                  <View style={cardDriverStyles.avatarPlaceholder}>
                    <Text style={cardDriverStyles.avatarText}>
                      {(rideData?.companyId?.company_name || "D").charAt(0)}
                    </Text>
                  </View>
                )}

                <View style={cardDriverStyles.nameRatingContainer}>
                  <Text numberOfLines={1} style={cardDriverStyles.companyName}>
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

              {/* Contact Buttons */}
              <View style={cardDriverStyles.contactButtons}>
                {rideData?.contactType === "call" ? (
                  <>
                    <TouchableOpacity
                      style={cardDriverStyles.phoneButton}
                      onPress={() => {
                        const phone =
                          rideData?.driverPostId?.driver_contact_number;
                        if (phone) Linking.openURL(`tel:${phone}`);
                      }}
                    >
                      <Phone size={18} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        cardDriverStyles.chatButton,
                        chatLoading && cardDriverStyles.chatButtonDisabled,
                      ]}
                      onPress={initChat}
                      disabled={chatLoading}
                    >
                      {chatLoading ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <MessageCircle size={18} color="#fff" />
                      )}
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity
                    style={[
                      cardDriverStyles.chatButton,
                      chatLoading && cardDriverStyles.chatButtonDisabled,
                    ]}
                    onPress={initChat}
                    disabled={chatLoading}
                  >
                    {chatLoading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <MessageCircle size={18} color="#fff" />
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Stats Section */}
          </View>
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

          <View style={styles.dateRow}>
            <View style={styles.dateItem}>
              <Text style={styles.dateLabel}>Pickup Date</Text>
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
                <Text style={styles.dateLabel}>Return Date</Text>
                <Text style={styles.dateValue}>
                  {rideData.returnDate
                    ? formatDate(rideData.returnDate)
                    : "TBD"}
                </Text>
                <Text style={styles.timeValue}>
                  {rideData.returnTime
                    ? formatTime12Hour(rideData.returnTime)
                    : "TBD"}
                </Text>
              </View>
            ) : (
              <View style={styles.dateItem}>
                <Text style={styles.dateLabel}>Drop Date</Text>
                <Text style={styles.dateValue}>
                  {arrivalDateTime
                    ? formatDateFromDate(arrivalDateTime)
                    : formatDate(rideData.pickupDate)}
                </Text>
                <Text style={styles.timeValue}>
                  {arrivalDateTime
                    ? formatTime12HourFromDate(arrivalDateTime)
                    : "TBD"}
                </Text>
              </View>
            )}
          </View>
        </View>

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
          <View style={styles.locationItem}>
            <MapPin size={16} color="#FF3B30" />
            <Text style={styles.locationText}>{rideData.dropAddress}</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Trip Distance</Text>
            <Text style={styles.infoValue}>{distance} km</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Trip Duration</Text>
            <Text style={styles.infoValue}>{duration} Hour</Text>
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

          <View style={styles.featuresCard}>
            <Text style={styles.featuresTitle}>Included</Text>
            <View style={styles.featuresWrap}>
              {includedItems.map((item, index) => (
                <View key={index} style={styles.featureChipIncluded}>
                  <Text style={styles.featureTextIncluded}>✓ {item}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Toll & State Tax Charges</Text>
            <Text style={styles.infoValue}>
              {rideData.extraRequirements?.allExclusive === true
                ? "Extra"
                : "Included"}
            </Text>
          </View>
        </View>

        {rideData.notes && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.notesText}>{rideData.notes}</Text>
          </View>
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {owner ? (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() =>
              navigation.navigate("Add", { rideId: rideData?._id })
            }
            activeOpacity={0.7}
          >
            <Edit2 size={16} color="#FFF" />
            <Text style={styles.actionButtonText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteRide(rideData?._id)}
            activeOpacity={0.7}
          >
            <Trash2 size={16} color="#FFF" />
            <Text style={styles.actionButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {rideData?.assignedDriverId?._id === driver?._id ? (
            <>
              {rideData?.rideStatus === "driver-assigned" && (
                <View style={styles.bottomButton}>
                  <TouchableOpacity
                    style={styles.acceptButton}
                    activeOpacity={0.8}
                    onPress={handleStartRide}
                  >
                    <Text style={styles.acceptButtonText}>Start The Ride</Text>
                  </TouchableOpacity>
                </View>
              )}

              {rideData?.rideStatus === "started" && (
                <View style={styles.bottomButton}>
                  <TouchableOpacity
                    style={styles.acceptButton}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.acceptButtonText}>
                      Mark Complete This Ride
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          ) : (
            <View style={styles.bottomActionButtons}>
              <TouchableOpacity
                style={[
                  styles.threeButton,
                  styles.detailButton,
                  detailsSent && styles.disabledButton,
                ]}
                activeOpacity={detailsSent ? 1 : 0.8}
                disabled={detailsSent}
                onPress={sendDriverDetails}
              >
                <Text
                  style={[
                    styles.threeButtonText,
                    detailsSent && styles.disabledButtonText,
                  ]}
                >
                  {detailsSent ? "Details Sent" : "Details Send"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.threeButton, styles.paymentButton]}
                activeOpacity={0.8}
                onPress={askForPaymentLink}
              >
                <Text style={styles.threeButtonText}>Payment Link</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.threeButton, styles.shareButton]}
                activeOpacity={0.8}
                onPress={shareBookingDetails}
              >
                <Text style={styles.threeButtonText}>Booking Share</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
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
  },
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
  dateLabel: {
    fontSize: 12,
    fontWeight: "700",
    fontFamily: "SFProDisplay-Regular",
    color: "#000",
  },
  dateValue: {
    fontSize: 12,
    fontFamily: "SFProDisplay-Semibold",
    color: "#000",
  },
  timeValue: {
    fontSize: 12,
    textTransform: "uppercase",
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
  tripTypeBadge: {
    backgroundColor: "#000",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: "center",
    marginVertical: 8,
  },
  tripTypeText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "SFProDisplay-Semibold",
  },
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
  featuresCard: {
    marginTop: 12,
  },
  featuresTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#222",
    marginBottom: 8,
  },
  featuresWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  featureChipIncluded: {
    backgroundColor: "#E8F7EF",
    borderColor: "#27AE60",
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  featureTextIncluded: {
    fontSize: 12,
    color: "#1E8449",
    fontWeight: "500",
  },
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
  bottomSpacing: {
    height: 180,
  },
  actionButtons: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: "row",
    gap: 8,
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
  driverDetails: {
    paddingVertical: 8,
  },

  statsRow: {
    flexDirection: "row",
    gap: 10,
  },

  statCard: {
    flex: 1,
    backgroundColor: "#F4F8F7",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },

  cancelCard: {
    backgroundColor: "#FFF2F2",
  },

  statValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
  },

  statLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },

  acceptButtonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "SFProDisplay-Bold",
  },
  bottomActionButtons: {
    position: "absolute",
    bottom: 30,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 8,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E5EA",
    gap: 10,
  },
  threeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 23,
    paddingVertical: 14,
    borderRadius: 10,
    gap: 2,
  },
  threeButtonText: {
    color: "#fff",
    fontSize: 10,
    fontFamily: "SFProDisplay-Bold",
  },
  detailButton: {
    backgroundColor: "#000",
  },
  paymentButton: {
    backgroundColor: "#000",
  },
  disabledButton: {
    backgroundColor: "#ccc", // gray
  },

  disabledButtonText: {
    color: "#777",
  },
  shareButton: {
    backgroundColor: "#000",
  },
  chatButtonDisabled: {
    opacity: 0.6,
  },
});

// Styles
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
