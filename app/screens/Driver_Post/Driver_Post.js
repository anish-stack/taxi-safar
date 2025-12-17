import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  FlatList,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Alert,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Calendar,
  Clock,
  MapPin,
  Car,
  DollarSign,
  Send,
  ArrowLeft,
  CircleCheck as CheckCircle2,
  Plus,
  Phone,
  MessageCircle,
} from "lucide-react-native";
import { API_URL_APP } from "../../constant/api";
import DateTimePicker from "@react-native-community/datetimepicker";
import axios from "axios";
import loginStore from "../../store/auth.store";
import { useNavigation, useRoute } from "@react-navigation/native";
const { width: SCREEN_WIDTH } = Dimensions.get("window");

const GOOGLE_API_KEY = "AIzaSyCuSV_62nxNHBjLQ_Fp-rSTgRUw9m2vzhM";

const DriverPost = () => {
  // Trip Details
  const route = useRoute();
  const { rideId } = route.params || {};
  const [tripType, setTripType] = useState("one-way");
  const [vehicle, setVehicle] = useState("");
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const { token } = loginStore();
  const navigation = useNavigation();

  const [showContactModal, setShowContactModal] = useState(false);
  const [contactType, setContactType] = useState("");
  const [company, setCompany] = useState(null);

  // Date & Time
  const [pickupDate, setPickupDate] = useState(new Date());
  const [pickupTime, setPickupTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Locations
  const [pickupLocation, setPickupLocation] = useState("");
  const [pickupCoordinates, setPickupCoordinates] = useState(null);
  const [dropLocation, setDropLocation] = useState("");
  const [dropCoordinates, setDropCoordinates] = useState(null);
  const [pickupSuggestions, setPickupSuggestions] = useState([]);
  const [dropSuggestions, setDropSuggestions] = useState([]);
  const [pickupLoading, setPickupLoading] = useState(false);
  const [dropLoading, setDropLoading] = useState(false);

  // Pricing
  const [tripDays, setTripDays] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [commission, setCommission] = useState("");
  const [driverEarning, setDriverEarning] = useState(0);
  const [extraKm, setExtraKm] = useState("");
  const [extraHour, setExtraHour] = useState("");

  // Preferences
  const [acceptMode, setAcceptMode] = useState("instant");
  const [requirements, setRequirements] = useState({
    onlydiesel: false,
    withcarrier: false,
    ac: false,
    musicsystem: false,
    allinclusive: false,
    allexclusive: false,
    foodallowed: false,
  });

  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");

  // UI States
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState(null);

  const pickupTimer = useRef(null);
  const dropTimer = useRef(null);

  // Vehicle types
  const defaultVehicles = ["hatchback", "sedan", "suv", "muv", "mini", "auto"];
  const allInclusiveVehicles = ["hatchback", "sedan", "suv", "muv", "mini"];
  const vehicles = requirements.allinclusive
    ? allInclusiveVehicles
    : defaultVehicles;

  // Google Places Autocomplete
  const fetchPlaceSuggestions = async (input, setter, loadingSetter) => {
    if (!input.trim()) {
      setter([]);
      return;
    }
    loadingSetter(true);
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
          input
        )}&key=${GOOGLE_API_KEY}&language=en&components=country:in`
      );
      const data = await res.json();
      setter(data.predictions || []);
    } catch (err) {
      console.error("Autocomplete error:", err);
    } finally {
      loadingSetter(false);
    }
  };

const fetchCompany = async () => {
  try {
    setLoading(true);
    const res = await axios.get(`${API_URL_APP}/api/v1/my-company`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = res.data?.data;
    console.log("Company data:", data);

    if (data && Object.keys(data).length > 0) {
      setCompany(data);
      // Proceed with whatever you need when company exists
    } else {
      // No company found → Show simple native alert
      Alert.alert(
        "Company Required",
        "Please add company details first.",
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Add Company",
            onPress: () => navigation.navigate("company-details"),
          },
        ],
        { cancelable: false }
      );
    }
  } catch (err) {
    console.log("Fetch error:", err?.response?.data || err.message);
    Alert.alert("Error", "Failed to load company details", [
      { text: "OK" },
    ]);
  } finally {
    setLoading(false);
  }
};
  useEffect(() => {
    fetchCompany();
  }, [token]);

  const fetchRidePostedById = async () => {
    if(!rideId) return
    try {
      const response = await axios.get(
        `${API_URL_APP}/api/v1/post-rides/${rideId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        const ride = response.data.data;

        // Trip Details
        setTripType(ride.tripType || "one-way");
        setVehicle(ride.vehicleType || "");
        setAcceptMode(ride.acceptBookingType || "instant");
        setContactType(ride.contactType || "");

        // Date & Time
        setPickupDate(new Date(ride.pickupDate));
        const [hours, minutes] = ride.pickupTime?.split(":") || ["00", "00"];
        const pickupTimeDate = new Date();
        pickupTimeDate.setHours(parseInt(hours), parseInt(minutes));
        setPickupTime(pickupTimeDate);

        // Locations
        setPickupLocation(ride.pickupAddress || "");
        setPickupCoordinates(ride.pickupLocation || null);
        setDropLocation(ride.dropAddress || "");
        setDropCoordinates(ride.dropLocation || null);

        // Pricing
        setTotalAmount(ride.totalAmount?.toString() || "");
        setCommission(ride.commissionAmount?.toString() || "");
        setDriverEarning(ride.driverEarning || 0);
        setExtraKm(ride.extraKmCharge?.toString() || "");
        setExtraHour(ride.extraMinCharge?.toString() || "");

        // Requirements
        const reqs = ride.extraRequirements || {};
        setRequirements({
          onlydiesel: reqs.onlyDiesel || false,
          withcarrier: reqs.carrier || false,
          ac: reqs.ac || false,
          musicsystem: reqs.musicSystem || false,
          allinclusive: reqs.allInclusive || false,
          allexclusive: reqs.allExclusive || false,
          foodallowed: reqs.foodAllowed || false,
        });

        // Notes & Payment
        setNotes(ride.notes || "");
        setPaymentMethod(ride.paymentMethod || "cash");
      } else {
        Alert.alert("Error", "Failed to fetch ride details");
      }
    } catch (error) {
      console.error("Fetch ride error:", error);
      // Alert.alert("Error", "Something went wrong while fetching ride data");
    }
  };

  useEffect(() => {
    fetchRidePostedById();
  }, [rideId]);

  const onPickupChange = (text) => {
    setPickupLocation(text);
    if (pickupTimer.current) clearTimeout(pickupTimer.current);
    pickupTimer.current = setTimeout(
      () => fetchPlaceSuggestions(text, setPickupSuggestions, setPickupLoading),
      600
    );
  };

  const onDropChange = (text) => {
    setDropLocation(text);
    if (dropTimer.current) clearTimeout(dropTimer.current);
    dropTimer.current = setTimeout(
      () => fetchPlaceSuggestions(text, setDropSuggestions, setDropLoading),
      600
    );
  };

  useEffect(() => {
    if (requirements.allinclusive) {
      // "All Inclusive" is selected → force ALL features to true
      setRequirements((prev) => ({
        ...prev,
        onlydiesel: false,
        withcarrier: true,
        ac: true,
        musicsystem: true,
        foodallowed: true,
        allinclusive: true,
        allexclusive: false, // Cannot have both
      }));
    } else if (requirements.allexclusive) {
      // "All Exclusive" is selected → force ALL features to false (except itself)
      setRequirements((prev) => ({
        ...prev,
        onlydiesel: false,
        withcarrier: false,
        ac: false,
        musicsystem: false,
        foodallowed: false,
        allinclusive: false,
        allexclusive: true,
      }));
    }
  }, [requirements.allinclusive, requirements.allexclusive]);
  // Get place details with coordinates
  const getPlaceDetails = async (placeId, setLocationFn, setCoordinatesFn) => {
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${GOOGLE_API_KEY}&fields=formatted_address,geometry`
      );
      const data = await res.json();
      if (data.result) {
        const address = data.result.formatted_address;
        const coords = data.result.geometry?.location;

        setLocationFn(address);
        if (coords) {
          setCoordinatesFn({
            type: "Point",
            coordinates: [coords.lng, coords.lat],
          });
        }
      }
    } catch (err) {
      console.error("Place details error:", err);
      Alert.alert("Error", "Failed to get location details");
    }
  };

  // Calculate Driver Earning (Fixed: removed extra km and hour)
  useEffect(() => {
    const total = parseFloat(totalAmount) || 0;
    const comm = parseFloat(commission) || 0;
    setDriverEarning(total - comm);
  }, [totalAmount, commission]);

  // Format functions
  const formatDateForBackend = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const formatTimeForBackend = (d) => {
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  const formatDate = (d) =>
    d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const formatTime = (d) => d.toTimeString().slice(0, 5);

  // Validate form
  const validateForm = () => {
    if (!pickupLocation || !pickupCoordinates) {
      Alert.alert("Validation Error", "Please select a valid pickup location");
      return false;
    }

    if (!dropLocation || !dropCoordinates) {
      Alert.alert("Validation Error", "Please select a valid drop location");
      return false;
    }

    if (!vehicle) {
      Alert.alert("Validation Error", "Please select a vehicle type");
      return false;
    }

    if (!totalAmount || parseFloat(totalAmount) <= 0) {
      Alert.alert("Validation Error", "Please enter a valid total amount");
      return false;
    }

    if (driverEarning <= 0) {
      Alert.alert("Validation Error", "Driver earning must be greater than 0");
      return false;
    }

    if (tripType === "round-trip" && !tripDays) {
      Alert.alert(
        "Validation Error",
        "Please enter number of days for round trip"
      );
      return false;
    }

    return true;
  };

  const handlePostRide = () => {
    if (!validateForm()) return;
    setShowContactModal(true); // ← यही नया modal
  };

  const finalSubmit = async () => {
    setShowContactModal(false);
    await postBooking();
  };

  const resetForm = () => {
    // Trip Details
    setTripType("one-way");
    setVehicle("");
    setAcceptMode("instant");
    setContactType("");

    // Date & Time
    setPickupDate(new Date());
    setPickupTime(new Date());
    setShowDatePicker(false);
    setShowTimePicker(false);

    // Locations
    setPickupLocation("");
    setPickupCoordinates(null);
    setDropLocation("");
    setDropCoordinates(null);
    setPickupSuggestions([]);
    setDropSuggestions([]);
    setPickupLoading(false);
    setDropLoading(false);

    // Pricing
    setTripDays("");
    setTotalAmount("");
    setCommission("");
    setDriverEarning(0);
    setExtraKm("");
    setExtraHour("");

    // Preferences
    setRequirements({
      onlydiesel: false,
      withcarrier: false,
      ac: false,
      musicsystem: false,
      allinclusive: false,
      allexclusive: false,
      foodallowed: false,
    });

    // Notes & Payment
    setNotes("");
    setPaymentMethod("cash");

    // UI States
    setShowSuccess(false);
    setLoading(false);
    setSuccessData(null);
  };

  const postBooking = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const requestData = {
        tripType,
        vehicleType: vehicle,
        pickupDate: formatDateForBackend(pickupDate),
        pickupTime: formatTimeForBackend(pickupTime),
        pickupAddress: pickupLocation,
        pickupLocation: pickupCoordinates,
        dropAddress: dropLocation,
        dropLocation: dropCoordinates,
        totalAmount: parseFloat(totalAmount),
        commissionAmount: parseFloat(commission) || 0,
        driverEarning: parseFloat(driverEarning),
        extraKmCharge: parseFloat(extraKm) || 0,
        companyDetails:company?._id,
        extraMinCharge: parseFloat(extraHour) || 0,
        acceptBookingType: acceptMode,
        extraRequirements: Object.entries(requirements)
          .filter(([_, value]) => value)
          .map(([key]) => key),
        notes: notes.trim(),
        paymentMethod,
        contactType,
      };

      let response;
      if (rideId) {
        // EDIT mode → PUT
        response = await axios.put(
          `${API_URL_APP}/api/v1/update-post-ride/${rideId}`,
          requestData,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
      } else {
        // CREATE mode → POST
        response = await axios.post(
          `${API_URL_APP}/api/v1/post-ride`,
          requestData,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        resetForm();
      }

      if (response.data.success) {
        setSuccessData(response.data.data);
        setShowSuccess(true);
      } else {
        Alert.alert("Error", response.data.message || "Failed to submit ride");
      }
    } catch (error) {
      console.error("Ride submit error:", error);
      Alert.alert("Error", "Something went wrong while submitting ride");
    } finally {
      setLoading(false);
    }
  };

  // Success Screen
  if (showSuccess) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContainer}>
          <View style={styles.successCard}>
            <View style={styles.successIconContainer}>
              <CheckCircle2 size={80} color="#10B981" />
            </View>
            <Text style={styles.successTitle}>Ride Posted Successfully!</Text>
            <Text style={styles.successSubtitle}>
              Nearby drivers will be notified
            </Text>

            {successData && (
              <View style={styles.successDetails}>
                <Text style={styles.successDetailText}>
                  Ride ID: {successData.rideId}
                </Text>
                <Text style={styles.successDetailText}>
                  {successData.pickupAddress} → {successData.dropAddress}
                </Text>
                <Text style={styles.successDetailText}>
                  Driver Earning: ₹{successData.driverEarning}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => {
                setShowSuccess(false);

                navigation.navigate("MyTrip");
              }}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <ArrowLeft size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Post a Ride</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Trip Type */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Trip Type</Text>
            <View style={styles.segmentContainer}>
              {[
                { label: "One Way", value: "one-way" },
                { label: "Round Trip", value: "round-trip" },
              ].map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.segment,
                    tripType === type.value && styles.segmentActive,
                  ]}
                  onPress={() => setTripType(type.value)}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      tripType === type.value && styles.segmentTextActive,
                    ]}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Vehicle Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Vehicle Type</Text>
            <TouchableOpacity
              style={styles.selector}
              onPress={() => setShowVehicleModal(true)}
            >
              <View style={styles.selectorContent}>
                <Car size={20} color="#6B7280" />
                <Text
                  style={
                    vehicle ? styles.selectorText : styles.selectorPlaceholder
                  }
                >
                  {vehicle ? vehicle.toUpperCase() : "Select vehicle type"}
                </Text>
              </View>
              <Plus size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Date & Time */}
          <View style={styles.rowContainer}>
            <View style={styles.halfSection}>
              <Text style={styles.sectionTitle}>Pickup Date</Text>
              <TouchableOpacity
                onPress={() => setShowDatePicker(true)}
                style={styles.dateTimeButton}
              >
                <Calendar size={18} color="#6B7280" />
                <Text style={styles.dateTimeText}>
                  {formatDate(pickupDate)}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.halfSection}>
              <Text style={styles.sectionTitle}>Pickup Time</Text>
              <TouchableOpacity
                onPress={() => setShowTimePicker(true)}
                style={styles.dateTimeButton}
              >
                <Clock size={18} color="#6B7280" />
                <Text style={styles.dateTimeText}>
                  {formatTime(pickupTime)}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Locations */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pickup Location</Text>
            <View style={styles.locationContainer}>
              <View style={styles.locationInputContainer}>
                <MapPin size={20} color="#EF4444" />
                <TextInput
                  style={styles.locationInput}
                  placeholder="Enter pickup location"
                  value={pickupLocation}
                  onChangeText={onPickupChange}
                  placeholderTextColor="#9CA3AF"
                />
                {pickupCoordinates && (
                  <CheckCircle2 size={18} color="#10B981" />
                )}
              </View>
              {pickupLoading && (
                <ActivityIndicator
                  size="small"
                  color="#EF4444"
                  style={styles.loadingIndicator}
                />
              )}
            </View>

            {pickupSuggestions.length > 0 && (
              <View style={styles.suggestionsContainer}>
                {pickupSuggestions.slice(0, 4).map((item) => (
                  <TouchableOpacity
                    key={item.place_id}
                    style={styles.suggestionItem}
                    onPress={() => {
                      getPlaceDetails(
                        item.place_id,
                        setPickupLocation,
                        setPickupCoordinates
                      );
                      setPickupSuggestions([]);
                    }}
                  >
                    <MapPin size={16} color="#6B7280" />
                    <Text style={styles.suggestionText} numberOfLines={1}>
                      {item.description}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Drop Location</Text>
            <View style={styles.locationContainer}>
              <View style={styles.locationInputContainer}>
                <MapPin size={20} color="#10B981" />
                <TextInput
                  style={styles.locationInput}
                  placeholder="Enter drop location"
                  value={dropLocation}
                  onChangeText={onDropChange}
                  placeholderTextColor="#9CA3AF"
                />
                {dropCoordinates && <CheckCircle2 size={18} color="#10B981" />}
              </View>
              {dropLoading && (
                <ActivityIndicator
                  size="small"
                  color="#10B981"
                  style={styles.loadingIndicator}
                />
              )}
            </View>

            {dropSuggestions.length > 0 && (
              <View style={styles.suggestionsContainer}>
                {dropSuggestions.slice(0, 4).map((item) => (
                  <TouchableOpacity
                    key={item.place_id}
                    style={styles.suggestionItem}
                    onPress={() => {
                      getPlaceDetails(
                        item.place_id,
                        setDropLocation,
                        setDropCoordinates
                      );
                      setDropSuggestions([]);
                    }}
                  >
                    <MapPin size={16} color="#6B7280" />
                    <Text style={styles.suggestionText} numberOfLines={1}>
                      {item.description}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Round Trip Days */}
          {tripType === "round-trip" && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Number of Days</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 5"
                keyboardType="numeric"
                value={tripDays}
                onChangeText={setTripDays}
                placeholderTextColor="#9CA3AF"
              />
            </View>
          )}

          {/* Pricing */}
          <View style={styles.rowContainer}>
            <View style={styles.halfSection}>
              <Text style={styles.sectionTitle}>Total Amount</Text>
              <View style={styles.amountContainer}>
                <Text style={styles.rupeeSymbol}>₹</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0"
                  keyboardType="numeric"
                  value={totalAmount}
                  onChangeText={setTotalAmount}
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            <View style={styles.halfSection}>
              <Text style={styles.sectionTitle}>Commission</Text>
              <View style={styles.amountContainer}>
                <Text style={styles.rupeeSymbol}>₹</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0"
                  keyboardType="numeric"
                  value={commission}
                  onChangeText={setCommission}
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>
          </View>

          {/* Driver Earning */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Driver Earning</Text>
            <View style={styles.earningContainer}>
              <Text style={styles.earningAmount}>
                ₹{Math.max(0, driverEarning).toFixed(0)}
              </Text>
              <Text style={styles.earningLabel}>
                Your earning from this trip
              </Text>
            </View>
          </View>

          {/* Extra Charges */}
          <View style={styles.rowContainer}>
            <View style={styles.halfSection}>
              <Text style={styles.sectionTitle}>Extra KM Charge</Text>
              <View style={styles.amountContainer}>
                <Text style={styles.rupeeSymbol}>₹</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0"
                  keyboardType="numeric"
                  value={extraKm}
                  onChangeText={setExtraKm}
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            <View style={styles.halfSection}>
              <Text style={styles.sectionTitle}>Extra Hour Charge</Text>
              <View style={styles.amountContainer}>
                <Text style={styles.rupeeSymbol}>₹</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0"
                  keyboardType="numeric"
                  value={extraHour}
                  onChangeText={setExtraHour}
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>
          </View>

          {/* Accept Mode */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Accept Booking By</Text>
            <View style={styles.segmentContainer}>
              {[
                { label: "Auto", value: "instant" },
                { label: "Manual", value: "scheduled" },
              ].map((mode) => (
                <TouchableOpacity
                  key={mode.value}
                  style={[
                    styles.segment,
                    acceptMode === mode.value && styles.segmentActive,
                  ]}
                  onPress={() => setAcceptMode(mode.value)}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      acceptMode === mode.value && styles.segmentTextActive,
                    ]}
                  >
                    {mode.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Requirements */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Extra Requirements</Text>
            <View style={styles.chipContainer}>
              {[
                { label: "Only Diesel", key: "onlydiesel" },
                { label: "With Carrier", key: "withcarrier" },
                { label: "Air Conditioning", key: "ac" },
                { label: "Music System", key: "musicsystem" },
                { label: "All Inclusive", key: "allinclusive" },
                { label: "All Exclusive", key: "allexclusive" },
                { label: "Food Allowed", key: "foodallowed" },
              ].map(({ label, key }) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.chip, requirements[key] && styles.chipActive]}
                  onPress={() => {
                    const newVal = !requirements[key];
                    setRequirements((prev) => ({ ...prev, [key]: newVal }));
                    if (
                      key === "allinclusive" &&
                      !newVal &&
                      allInclusiveVehicles.includes(vehicle)
                    ) {
                      setVehicle("");
                    }
                  }}
                >
                  <Text
                    style={[
                      styles.chipText,
                      requirements[key] && styles.chipTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Notes */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Additional Notes</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="Any special instructions..."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={notes}
              onChangeText={setNotes}
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </ScrollView>

        {/* Post Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.postButton, loading && styles.postButtonDisabled]}
            onPress={handlePostRide}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Text style={styles.postButtonText}>Post Ride</Text>
                <Send size={20} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>
        </View>
        {showDatePicker && (
          <DateTimePicker
            value={pickupDate}
            mode="date"
            minimumDate={new Date()}
            onChange={(e, d) => {
              setShowDatePicker(false);
              if (d) setPickupDate(d);
            }}
          />
        )}
        {showTimePicker && (
          <DateTimePicker
            value={pickupTime}
            mode="time"
            is24Hour
            onChange={(e, t) => {
              setShowTimePicker(false);
              if (!t) return;

              const now = new Date();
              const isToday = pickupDate.toDateString() === now.toDateString();

              if (isToday) {
                if (
                  t.getHours() < now.getHours() ||
                  (t.getHours() === now.getHours() &&
                    t.getMinutes() < now.getMinutes())
                ) {
                  Alert.alert("Invalid Time", "You cannot select a past time.");
                  return;
                }
              }

              setPickupTime(t);
            }}
          />
        )}

        {/* Vehicle Modal */}
        <Modal visible={showVehicleModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Vehicle Type</Text>
                <TouchableOpacity onPress={() => setShowVehicleModal(false)}>
                  <Text style={styles.modalCloseText}>Done</Text>
                </TouchableOpacity>
              </View>
              <FlatList
                data={vehicles}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.modalItem}
                    onPress={() => {
                      setVehicle(item);
                      setShowVehicleModal(false);
                    }}
                  >
                    <Text style={styles.modalItemText}>
                      {item.toUpperCase()}
                    </Text>
                    {vehicle === item && (
                      <CheckCircle2 size={20} color="#000" />
                    )}
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Modal>

        {/* Contact Type Modal */}
        <Modal visible={showContactModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.contactModal}>
              <Text style={styles.contactTitle}>
                How should riders contact you?
              </Text>
              <Text style={styles.contactSubtitle}>
                This helps riders reach you after booking
              </Text>

              <View style={styles.contactOptions}>
                <TouchableOpacity
                  style={[
                    styles.contactOption,
                    contactType === "call" && styles.contactOptionActive,
                  ]}
                  onPress={() => setContactType("call")}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    {/* Call Icon */}
                    <View
                      style={{
                        width: 50,
                        height: 50,
                        borderRadius: 25,
                        backgroundColor:
                          contactType === "call" ? "#DC2626" : "#F3F4F6",
                        justifyContent: "center",
                        alignItems: "center",
                        position: "relative",
                      }}
                    >
                      <Phone
                        size={28}
                        color={contactType === "call" ? "#FFF" : "#DC2626"}
                      />
                    </View>
                    <View
                      style={{
                        width: 15,
                        height: 15,
                        borderRadius: 25,

                        justifyContent: "center",
                        alignItems: "center",
                        position: "relative",
                      }}
                    >
                      <Plus
                        size={10}
                        color={contactType === "call" ? "#000" : "#000"}
                      />
                    </View>
                    {/* Chat Icon */}
                    <View
                      style={{
                        width: 50,
                        height: 50,
                        borderRadius: 25,
                        backgroundColor:
                          contactType === "call" ? "#10B981" : "#F3F4F6",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <MessageCircle
                        size={28}
                        color={contactType === "call" ? "#FFF" : "#10B981"}
                      />
                    </View>
                  </View>

                  <Text
                    style={[
                      styles.contactOptionText,
                      contactType === "call" && styles.contactOptionTextActive,
                    ]}
                  >
                    Call + Chat
                  </Text>
                  <Text style={styles.contactDesc}>
                    Riders can Chat & call you directly
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.contactOption,
                    contactType === "chat" && styles.contactOptionActive,
                  ]}
                  onPress={() => setContactType("chat")}
                >
                  <View style={styles.contactIcon}>
                    <MessageCircle
                      size={28}
                      color={contactType === "chat" ? "#000" : "#10B981"}
                    />
                  </View>
                  <Text
                    style={[
                      styles.contactOptionText,
                      contactType === "chat" && styles.contactOptionTextActive,
                    ]}
                  >
                    Chat Only
                  </Text>
                  <Text style={styles.contactDesc}>
                    Only in-app chat allowed
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.contactButtons}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setShowContactModal(false)}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.submitContactBtn,
                    !contactType && styles.submitContactBtnDisabled,
                  ]}
                  disabled={!contactType}
                  onPress={finalSubmit}
                >
                  <Text style={styles.submitContactText}>Continue</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  keyboardView: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  headerSpacer: {
    width: 40,
  },

  // Scroll Content
  scrollContent: {
    paddingBottom: 120,
  },

  // Sections
  section: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 12,
  },

  // Row Layout
  rowContainer: {
    flexDirection: "row",
    gap: 12,
    marginHorizontal: 16,
    marginTop: 12,
  },
  halfSection: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
  },

  // Segmented Control
  segmentContainer: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    padding: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 6,
  },
  segmentActive: {
    backgroundColor: "#000",
  },
  segmentText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
  },
  segmentTextActive: {
    color: "#FFFFFF",
  },

  // Selector
  selector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  selectorContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  selectorText: {
    fontSize: 14,
    color: "#1F2937",
    fontWeight: "500",
  },
  selectorPlaceholder: {
    fontSize: 14,
    color: "#9CA3AF",
  },

  // Date Time
  dateTimeButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  dateTimeText: {
    fontSize: 14,
    color: "#1F2937",
    fontWeight: "500",
  },

  // Location
  locationContainer: {
    gap: 8,
  },
  locationInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  locationInput: {
    flex: 1,
    fontSize: 14,
    color: "#1F2937",
  },
  loadingIndicator: {
    marginTop: 4,
  },

  // Suggestions
  suggestionsContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    marginTop: 4,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  suggestionText: {
    flex: 1,
    fontSize: 13,
    color: "#4B5563",
  },

  // Input
  input: {
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: "#1F2937",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  // Amount
  amountContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  rupeeSymbol: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  amountInput: {
    flex: 1,
    fontSize: 14,
    color: "#1F2937",
  },

  // Earning
  earningContainer: {
    backgroundColor: "#ECFDF5",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1FAE5",
  },
  earningAmount: {
    fontSize: 24,
    fontWeight: "700",
    color: "#059669",
    marginBottom: 4,
  },
  earningLabel: {
    fontSize: 12,
    color: "#065F46",
  },

  // Chips
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#F3F4F6",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  chipActive: {
    backgroundColor: "#000",
    borderColor: "#000",
  },
  chipText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6B7280",
  },
  chipTextActive: {
    color: "#FFFFFF",
  },

  // Notes
  notesInput: {
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: "#1F2937",
    minHeight: 80,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  // Button
  buttonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  postButton: {
    backgroundColor: "#000",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  postButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  postButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "100%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  modalCloseText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
  },
  modalItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  modalItemText: {
    fontSize: 14,
    color: "#1F2937",
    fontWeight: "500",
  },

  // Success Screen
  successContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  successCard: {
    width: "100%",
    maxWidth: 350,
    alignItems: "center",
  },
  successIconContainer: {
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1F2937",
    textAlign: "center",
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
  },
  successDetails: {
    backgroundColor: "#F9FAFB",
    padding: 16,
    borderRadius: 12,
    width: "100%",
    marginBottom: 24,
  },
  successDetailText: {
    fontSize: 13,
    color: "#4B5563",
    marginBottom: 6,
    textAlign: "center",
  },
  doneButton: {
    backgroundColor: "#000",
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
  },
  doneButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  // Contact Modal Styles
  contactModal: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 24,
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
  },
  contactTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    textAlign: "center",
    marginBottom: 8,
  },
  contactSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
  },
  contactOptions: {
    gap: 16,
    marginBottom: 24,
  },
  contactOption: {
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: "transparent",
    alignItems: "center",
  },
  contactOptionActive: {
    borderColor: "#000",
    backgroundColor: "#00000005",
  },
  contactIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  contactOptionText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 4,
  },
  contactOptionTextActive: {
    color: "#000",
    fontWeight: "700",
  },
  contactDesc: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
  },
  contactButtons: {
    flexDirection: "row",
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
  },
  submitContactBtn: {
    flex: 2,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#000",
    alignItems: "center",
  },
  submitContactBtnDisabled: {
    backgroundColor: "#9CA3AF",
  },
  submitContactText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
});

export default DriverPost;
