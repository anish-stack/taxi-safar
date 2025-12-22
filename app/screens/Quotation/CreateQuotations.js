import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Switch,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import axios from "axios";
import { API_URL_APP } from "../../constant/api";
import loginStore from "../../store/auth.store";
import useDriverStore from "../../store/driver.store";
import { UniversalAlert } from "../common/UniversalAlert";
import { CommonActions } from "@react-navigation/native";
import BackWithLogo from "../common/back_with_logo";

const GST_RATE = 5;

export default function CreateQuotationForm({ navigation, route }) {
  const { token } = loginStore();
  const { driver } = useDriverStore();
  const { id } = route.params || {};
  const scrollViewRef = useRef(null);
  const scrollToInput = (reactNode) => {
    scrollViewRef.current?.scrollToFocusedInput(reactNode);
  };

  const customerNameRef = useRef(null);
  const customerContactRef = useRef(null);
  const customerAddressRef = useRef(null);
  const vehicleTypeRef = useRef(null);
  const pickupPlaceRef = useRef(null);
  const dropPlaceRef = useRef(null);
  const termsConditionsRef = useRef(null);
  // console.log(id)
  const [documentType, setDocumentType] = useState("quotation");
  const [multiStop, setMultiStop] = useState(true);
  const [stops, setStops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [company, setCompany] = useState(null);
  const [hasGST, setHasGST] = useState(false);
  const [showBankDetails, setShowBankDetails] = useState(true);

  // Alert
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    type: "success",
    title: "",
    message: "",
    primaryButton: "OK",
    onPrimaryPress: () => setAlertVisible(false),
  });

  // Form States
  const [tripType, setTripType] = useState("one_way");
  const [pricingMode, setPricingMode] = useState("km_wise"); // km_wise or day_wise

  // Customer
  const [customerName, setCustomerName] = useState("");
  const [customerContact, setCustomerContact] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");

  // Trip
  const [vehicleType, setVehicleType] = useState("");
  const [pickupPlace, setPickupPlace] = useState("");
  const [dropPlace, setDropPlace] = useState("");
  const [pickupDate, setPickupDate] = useState(new Date());
  const [pickupTime, setPickupTime] = useState(new Date());
  const [returnDate, setReturnDate] = useState(new Date());
  const [returnTime, setReturnTime] = useState(new Date());

  // Km Wise
  const [totalKm, setTotalKm] = useState("");
  const [perKmRate, setPerKmRate] = useState("");

  // Day Wise
  const [perDayCharges, setPerDayCharges] = useState("");
  const [totalDays, setTotalDays] = useState("1");
  const [tollTax, setTollTax] = useState("");

  // Discount & Additional
  const [discount, setDiscount] = useState("");
  const [additionalCharges, setAdditionalCharges] = useState([]); // { title, amount }

  // Fixed Charges
  const [stateTax, setStateTax] = useState("");
  const [driverCharge, setDriverCharge] = useState("");
  const [parkingCharge, setParkingCharge] = useState("");

  // Bank
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [termsConditions, setTermsConditions] = useState("");

  // Date Picker
  const [showPickupDate, setShowPickupDate] = useState(false);
  const [showPickupTime, setShowPickupTime] = useState(false);
  const [showReturnDate, setShowReturnDate] = useState(false);
  const [showReturnTime, setShowReturnTime] = useState(false);

  const showAlert = (type, title, message, onClose = null) => {
    setAlertConfig({
      type,
      title,
      message,
      primaryButton: "OK",
      onPrimaryPress: onClose || (() => setAlertVisible(false)),
    });
    setAlertVisible(true);
  };

  const fetchCompany = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL_APP}/api/v1/my-company`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = res.data?.data;
      if (data && Object.keys(data).length > 0) {
        setCompany(data);
        setHasGST(!!data.gst_no);
        setAccountHolderName(data.company_name || "");
        if (driver?.BankDetails) {
          setBankName(driver.BankDetails.bank_name || "");
          setAccountNumber(driver.BankDetails.account_number || "");
          setIfscCode(driver.BankDetails.ifsc_code || "");
        }
      } else {
        showAlert(
          "warning",
          "Agent Profile Required",
          "Please add Agent details first.",
          () => {
            navigation.navigate("company-details");
          }
        );
        setCompany(null);
      }
    } catch (err) {
      showAlert("error", "Error", "Failed to load company details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompany();
  }, []);

  // Auto calculate days for round trip
  useEffect(() => {
    if (tripType === "round_trip" && pickupDate && returnDate) {
      const diff = Math.abs(returnDate - pickupDate);
      const days = Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1; // inclusive
      setTotalDays(days > 1 ? days.toString() : "1");
    }
  }, [pickupDate, returnDate, tripType]);

  const formatDate = (date) =>
    date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const formatTime = (date) =>
    date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

  const addStop = () => {
    setStops([...stops, { location: "" }]);
  };

  // Update stop at index
  const updateStop = (index, value) => {
    const updated = [...stops];
    updated[index].location = value;
    setStops(updated);
  };

  // Remove stop at index
  const removeStop = (index) => {
    setStops(stops.filter((_, i) => i !== index));
  };

  const fetchQuotationDetail = async () => {
    try {
      setLoading(true);

      const response = await axios.get(
        `${API_URL_APP}/api/v1/get-quotation/${id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = response.data?.data;
      if (!data) return;

      /* -----------------------------
       CUSTOMER
    ----------------------------- */
      setCustomerName(data.bill_to?.customer_name || "");
      setCustomerContact(data.bill_to?.contact_number || "");
      setCustomerAddress(data.bill_to?.address || "");

      /* -----------------------------
       TRIP
    ----------------------------- */
      setTripType(data.trip_type || "one_way");

      const trip = data.trip_details?.[0] || {};
      const place = trip.pickup_drop_place || "";

      if (place.includes("to")) {
        const [pickup, drop] = place.split(/\s+to\s+/i); // 👈 safe split

        setPickupPlace(pickup?.trim() || "");
        setDropPlace(drop?.trim() || "");
      } else {
        setPickupPlace(place);
        setDropPlace("");
      }

      if (data.document_type) {
        setDocumentType(data.document_type);
      }
      setVehicleType(trip.vehicle_type || "");

      if (trip.pickup_date) setPickupDate(new Date(trip.pickup_date));
      if (trip.pickup_time)
        setPickupTime(new Date(`1970-01-01T${trip.pickup_time}`));

      if (trip.return_date) setReturnDate(new Date(trip.return_date));
      if (trip.return_time)
        setReturnTime(new Date(`1970-01-01T${trip.return_time}`));

      /* -----------------------------
       PRICING
    ----------------------------- */
      if (trip.pricing_mode === "day_wise") {
        setPricingMode("day_wise");
        setPerDayCharges(trip.per_day_charge?.toString() || "");
        setTotalDays(trip.total_days?.toString() || "1");
        setTollTax(trip.toll_tax?.toString() || "");
      } else {
        setPricingMode("km_wise");
        setTotalKm(trip.total_km?.toString() || "");
        setPerKmRate(trip.per_km_rate?.toString() || "");
      }

      if (data.multi_stops) {
        setMultiStop(true);

        const stops = data.stops || [];

        setStops(
          stops.map((stop) => ({
            location: typeof stop === "string" ? stop : stop.place || "",
          }))
        );
      } else {
        setMultiStop(false);
        setStops([]); // clear stops
      }

      /* -----------------------------
       SUMMARY / CHARGES
    ----------------------------- */
      const summary = data.summary || {};

      setDiscount(summary.discount?.toString() || "");
      setStateTax(summary.state_tax?.toString() || "");
      setDriverCharge(summary.driver_charge?.toString() || "");
      setParkingCharge(summary.parking_charge?.toString() || "");

      setAdditionalCharges(
        summary.additional_charges?.map((item) => ({
          title: item.title || "",
          amount: item.amount?.toString() || "",
        })) || []
      );

      /* -----------------------------
       BANK DETAILS
    ----------------------------- */
      const bank = data.bank_details || {};
      setBankName(bank.bank_name || "");
      setAccountNumber(bank.account_number || "");
      setIfscCode(bank.ifsc_code || "");
      setAccountHolderName(bank.account_holder_name || "");

      /* -----------------------------
       TERMS
    ----------------------------- */

      setTermsConditions(data.description || "");
    } catch (error) {
      console.log("❌ fetchQuotationDetail error:", error?.response?.data);
      // showAlert("error", "Error", "Failed to load quotation details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchQuotationDetail();
    }
  }, [id]);

  // Calculate Fare (only base fare before additions)
  const fare = React.useMemo(() => {
    if (pricingMode === "km_wise") {
      return (parseFloat(totalKm) || 0) * (parseFloat(perKmRate) || 0);
    } else {
      const days = parseInt(totalDays) || 1;
      const perDay = parseFloat(perDayCharges) || 0;
      const toll = parseFloat(tollTax) || 0;
      return perDay * days + toll;
    }
  }, [pricingMode, totalKm, perKmRate, perDayCharges, totalDays, tollTax]);

  const subtotal = fare;

  // Additional fixed charges sum
  const fixedAdditions =
    (parseFloat(stateTax) || 0) +
    (parseFloat(driverCharge) || 0) +
    (parseFloat(parkingCharge) || 0) +
    additionalCharges.reduce(
      (sum, item) => sum + (parseFloat(item.amount) || 0),
      0
    );

  // Apply discount & GST only on fare
  const discountAmount = parseFloat(discount) || 0;
  const afterDiscount = subtotal - discountAmount;
  const gstAmount = hasGST ? (afterDiscount * GST_RATE) / 100 : 0;

  // Grand Total
  const total = afterDiscount + gstAmount + fixedAdditions;

  const addCustomCharge = () => {
    setAdditionalCharges([...additionalCharges, { title: "", amount: "" }]);
  };

  const updateCustomCharge = (index, field, value) => {
    const updated = [...additionalCharges];
    updated[index][field] = value;
    setAdditionalCharges(updated);
  };

  const removeCustomCharge = (index) => {
    setAdditionalCharges(additionalCharges.filter((_, i) => i !== index));
  };

  const handleCreateQuotation = async () => {
    // Validation (unchanged)
    if (
      !customerName.trim() ||
      !customerContact.trim() ||
      !customerAddress.trim() ||
      !pickupPlace.trim() ||
      !dropPlace.trim() ||
      !vehicleType.trim()
    ) {
      showAlert("error", "Validation", "Please fill all required fields");
      return;
    }

    if (pricingMode === "km_wise") {
      if (!totalKm || !perKmRate || fare <= 0) {
        showAlert("error", "Invalid Fare", "Please enter valid Km and Rate");
        return;
      }
    } else {
      if (!perDayCharges || parseFloat(perDayCharges) <= 0 || !totalDays) {
        showAlert(
          "error",
          "Invalid Fare",
          "Please enter valid day charges and days"
        );
        return;
      }
    }

    if (
      showBankDetails &&
      (!bankName.trim() || !accountNumber.trim() || !ifscCode.trim())
    ) {
      showAlert("error", "Bank Details", "Please fill all bank details");
      return;
    }

    try {
      setSaving(true);

      // Build the pickup_drop_place string (with multi-stop support)
      // const pickupDropPlace = multiStop
      //   ? `${pickupPlace} → ${stops
      //       .map((s) => s.location.trim())
      //       .filter(Boolean)
      //       .join(" → ")} → ${dropPlace}`
      //   : `${pickupPlace} to ${dropPlace}`;

      const pickupDropPlace = `${pickupPlace} to ${dropPlace}`;

      const payload = {
        // Customer
        bill_to: {
          customer_name: customerName.trim(),
          contact_number: customerContact.trim(),
          address: customerAddress.trim(),
        },

        // Trip Details
        trip_type: tripType,
        vehicle_type: vehicleType.trim(),

        pickup_place: pickupPlace.trim(),
        drop_place: dropPlace.trim(),
        pickup_drop_place: pickupDropPlace,

        pickup_date: pickupDate.toISOString().split("T")[0],
        pickup_time: formatTime(pickupTime),

        ...(tripType === "round_trip" && {
          return_date: returnDate.toISOString().split("T")[0],
          return_time: formatTime(returnTime),
        }),

        // Multi-stop
        ...(multiStop && {
          multi_stop: true,
          stops: stops
            .map((s) => s.location.trim())
            .filter((location) => location !== ""),
        }),

        // Pricing
        pricing_mode: pricingMode,

        ...(pricingMode === "km_wise"
          ? {
              total_km: parseFloat(totalKm),
              per_km_rate: parseFloat(perKmRate),
            }
          : {
              per_day_charges: parseFloat(perDayCharges),
              total_days: parseInt(totalDays),
              toll_tax: parseFloat(tollTax) || 0,
            }),

        // Document Type (Quotation or Invoice)
        document_type: documentType,

        // Summary
        summary: {
          subtotal: parseFloat(subtotal.toFixed(2)),
          discount: parseFloat(discount) || 0,
          gst_applied: hasGST,
          gst_amount: parseFloat(gstAmount.toFixed(2)),
          state_tax: parseFloat(stateTax) || 0,
          driver_charge: parseFloat(driverCharge) || 0,
          parking_charge: parseFloat(parkingCharge) || 0,

          additional_charges: additionalCharges
            .filter((c) => c.title.trim() && parseFloat(c.amount) > 0)
            .map((c) => ({
              title: c.title.trim(),
              amount: parseFloat(c.amount),
            })),

          total: parseFloat(total.toFixed(2)),
        },

        // Bank Details
        show_bank_details: showBankDetails,
        bank_details: showBankDetails
          ? {
              bank_name: bankName.trim(),
              account_number: accountNumber.trim(),
              ifsc_code: ifscCode.trim(),
              account_holder_name: accountHolderName.trim(),
            }
          : null,

        // Terms
        terms_and_conditions: termsConditions.trim(),
      };

      let response;
      if (id) {
        // EDIT MODE - Update existing quotation/invoice
        response = await axios.put(
          `${API_URL_APP}/api/v1/update-quotation/${id}`,
          payload,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        showAlert(
          "success",
          "Updated!",
          `${
            documentType === "invoice" ? "Tax Invoice" : "Quotation"
          } updated successfully!`,
          () => {
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: "see-quotation" }],
              })
            );
          }
        );
      } else {
        // CREATE MODE - New quotation/invoice
        response = await axios.post(
          `${API_URL_APP}/api/v1/create-quotation`,
          payload,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        showAlert(
          "success",
          "Success!",
          `${
            documentType === "invoice" ? "Tax Invoice" : "Quotation"
          } created successfully!`,
          () => {
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: "see-quotation" }],
              })
            );
          }
        );
      }

      console.log("API Response:", response.data);
    } catch (error) {
      console.error("API Error:", error.response?.data || error.message);

      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        (id
          ? "Failed to update document"
          : `Failed to create ${
              documentType === "invoice" ? "invoice" : "quotation"
            }`);

      showAlert("error", "Error", message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }
if (!loading && !company) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.noCompanyContainer}>
        <Ionicons name="business-outline" size={60} color="#9CA3AF" />
        <Text style={styles.noCompanyTitle}>
        Agent Profile Details Required
        </Text>
        <Text style={styles.noCompanyText}>
          Please add your Agent Profile details to create quotation or invoice.
        </Text>

        <TouchableOpacity
          style={styles.addCompanyBtn}
          onPress={() => navigation.navigate("company-details")}
        >
          <Text style={styles.addCompanyBtnText}>
            Add Company Details
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}


  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 50}
      >
        <BackWithLogo
          isLogo={false}
          title={`${id ? "Edit" : "Create"} ${
            documentType === "quotation" ? "Quotation" : "Tax Invoice"
          }`}
        />

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {company && (
            <View style={styles.profileCard}>
              {/* Left: Avatar */}
              <Image
                source={{
                  uri: company.logo?.url || "https://via.placeholder.com/100",
                }}
                style={styles.profileImage}
              />

              {/* Middle: Info */}
              <View style={styles.profileInfo}>
                <Text style={styles.profileName} numberOfLines={1}>
                  {company.company_name}
                </Text>

                <View style={styles.profileMeta}>
                  <View style={styles.metaItem}>
                    <Ionicons name="call" size={14} color="#6B7280" />
                    <Text style={styles.profileText} numberOfLines={1}>
                      {company.phone || "website.com"}
                    </Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons
                      name="location-outline"
                      size={14}
                      color="#6B7280"
                    />
                    <Text style={styles.profileText} numberOfLines={1}>
                      {company.address || "Location"}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Right: Button */}
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.viewProfileBtn}
                onPress={() => navigation.navigate("company-details")}
              >
                <Text style={styles.viewProfileText}>VIEW PROFILE</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Document Type Selector */}
          <View style={styles.documentTypeSection}>
            <Text style={styles.sectionTitle}>Document Type</Text>
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[
                  styles.toggleBtn,
                  documentType === "quotation" && styles.activeToggle,
                ]}
                onPress={() => setDocumentType("quotation")}
              >
                <Text
                  style={[
                    styles.toggleText,
                    documentType === "quotation" && styles.activeText,
                  ]}
                >
                  Quotation
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleBtn,
                  documentType === "invoice" && styles.activeToggle,
                ]}
                onPress={() => setDocumentType("invoice")}
              >
                <Text
                  style={[
                    styles.toggleText,
                    documentType === "invoice" && styles.activeText,
                  ]}
                >
                  Tax Invoice
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          {/* Trip Type */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Trip Type</Text>
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[
                  styles.toggleBtn,
                  tripType === "one_way" && styles.activeToggle,
                ]}
                onPress={() => setTripType("one_way")}
              >
                <Text
                  style={[
                    styles.toggleText,
                    tripType === "one_way" && styles.activeText,
                  ]}
                >
                  One Way
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleBtn,
                  tripType === "round_trip" && styles.activeToggle,
                ]}
                onPress={() => setTripType("round_trip")}
              >
                <Text
                  style={[
                    styles.toggleText,
                    tripType === "round_trip" && styles.activeText,
                  ]}
                >
                  Round Trip
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Customer Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="person" size={14} color="#000" /> Customer Details
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Customer Name </Text>
              <TextInput
                onFocus={(e) => {
                  const node = e.target;
                  setTimeout(() => {
                    scrollViewRef.current?.scrollToFocusedInput(node);
                  }, 300);
                }}
                ref={customerNameRef}
                onSubmitEditing={() => customerContactRef.current?.focus()} // Go to next
                blurOnSubmit={false}
                returnKeyType="next"
                style={styles.input}
                placeholder="Enter customer name"
                placeholderTextColor="#999"
                value={customerName}
                onChangeText={setCustomerName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Contact Number </Text>
              <TextInput
                style={styles.input}
                ref={customerContactRef}
                placeholder="Enter contact number"
                placeholderTextColor="#999"
                value={customerContact}
                returnKeyType="next"
                onFocus={(e) => {
                  const node = e.target;
                  setTimeout(() => {
                    scrollViewRef.current?.scrollToFocusedInput(node);
                  }, 300);
                }}
                onChangeText={setCustomerContact}
                keyboardType="phone-pad"
                onSubmitEditing={() => customerAddressRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Address </Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Enter customer address"
                ref={customerAddressRef}
                returnKeyType="next"
                onSubmitEditing={() => vehicleTypeRef.current?.focus()}
                blurOnSubmit={false}
                placeholderTextColor="#999"
                value={customerAddress}
                onChangeText={setCustomerAddress}
                multiline
                numberOfLines={3}
              />
            </View>
          </View>

          {/* Trip Details */}
          {/* Trip Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="location" size={14} color="#000" /> Trip Details
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Vehicle Name </Text>
              <TextInput
                ref={vehicleTypeRef}
                style={styles.input}
                returnKeyType="next"
                onSubmitEditing={() => pickupPlaceRef.current?.focus()}
                blurOnSubmit={false}
                placeholder="e.g., Sedan, SUV, Tempo Traveller"
                placeholderTextColor="#999"
                value={vehicleType}
                onChangeText={setVehicleType}
              />
            </View>

            {/* Multi-Stop Toggle */}
            <View style={styles.gstRow}>
              <Text style={styles.gstLabel}>Multi-Stop Trip?</Text>
              <Switch value={multiStop} onValueChange={setMultiStop} />
            </View>

            {/* Pickup Location */}
            <View style={[styles.inputGroup, { marginTop: 8 }]}>
              <Text style={styles.inputLabel}>Pickup Location </Text>
              <TextInput
                ref={pickupPlaceRef}
                style={styles.input}
                placeholder="Starting point"
                returnKeyType="next"
                onSubmitEditing={() => {
                  if (multiStop && stops.length > 0) {
                    dropPlaceRef.current?.focus();
                  } else {
                    dropPlaceRef.current?.focus();
                  }
                }}
                placeholderTextColor="#999"
                value={pickupPlace}
                onChangeText={setPickupPlace}
              />
            </View>

            {/* Multi Stops */}
            {multiStop && (
              <>
                {stops.map((stop, index) => (
                  <View key={index} style={styles.multiStopRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>Stop {index + 1}</Text>
                      <TextInput
                        style={styles.input}
                        placeholder={`Enter stop location ${index + 1}`}
                        placeholderTextColor="#999"
                        value={stop.location}
                        onChangeText={(val) => updateStop(index, val)}
                      />
                    </View>
                    <TouchableOpacity
                      style={styles.removeStopBtn}
                      onPress={() => removeStop(index)}
                    >
                      <Ionicons name="close-circle" size={24} color="#e74c3c" />
                    </TouchableOpacity>
                  </View>
                ))}

                <TouchableOpacity style={styles.addStopBtn} onPress={addStop}>
                  <Ionicons name="add-circle-outline" size={20} color="#000" />
                  <Text style={styles.addStopText}>Add Another Stop</Text>
                </TouchableOpacity>
              </>
            )}

            {/* Drop Location */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Final Drop Location </Text>
              <TextInput
                ref={dropPlaceRef}
                style={styles.input}
                returnKeyType="done"
                placeholder="Destination"
                placeholderTextColor="#999"
                value={dropPlace}
                onChangeText={setDropPlace}
              />
            </View>

            {/* Date & Time Pickers */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Pickup Date & Time</Text>
              <View style={styles.row}>
                <TouchableOpacity
                  style={[styles.dateButton, { flex: 1 }]}
                  onPress={() => setShowPickupDate(true)}
                >
                  <Ionicons name="calendar" size={16} color="#000" />
                  <Text style={styles.dateText}>{formatDate(pickupDate)}</Text>
                </TouchableOpacity>
                <View style={{ width: 10 }} />
                <TouchableOpacity
                  style={[styles.dateButton, { flex: 1 }]}
                  onPress={() => setShowPickupTime(true)}
                >
                  <Ionicons name="time" size={16} color="#000" />
                  <Text style={styles.dateText}>{formatTime(pickupTime)}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {tripType === "round_trip" && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Return Date & Time</Text>
                <View style={styles.row}>
                  <TouchableOpacity
                    style={[styles.dateButton, { flex: 1 }]}
                    onPress={() => setShowReturnDate(true)}
                  >
                    <Ionicons name="calendar" size={16} color="#000" />
                    <Text style={styles.dateText}>
                      {formatDate(returnDate)}
                    </Text>
                  </TouchableOpacity>
                  <View style={{ width: 10 }} />
                  <TouchableOpacity
                    style={[styles.dateButton, { flex: 1 }]}
                    onPress={() => setShowReturnTime(true)}
                  >
                    <Ionicons name="time" size={16} color="#000" />
                    <Text style={styles.dateText}>
                      {formatTime(returnTime)}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* Pricing Mode */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pricing Mode</Text>
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[
                  styles.toggleBtn,
                  pricingMode === "km_wise" && styles.activeToggle,
                ]}
                onPress={() => setPricingMode("km_wise")}
              >
                <Text
                  style={[
                    styles.toggleText,
                    pricingMode === "km_wise" && styles.activeText,
                  ]}
                >
                  Km Wise
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleBtn,
                  pricingMode === "day_wise" && styles.activeToggle,
                ]}
                onPress={() => setPricingMode("day_wise")}
              >
                <Text
                  style={[
                    styles.toggleText,
                    pricingMode === "day_wise" && styles.activeText,
                  ]}
                >
                  Day Wise
                </Text>
              </TouchableOpacity>
            </View>

            {pricingMode === "km_wise" ? (
              <>
                <View style={styles.row}>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>Total Km</Text>
                    <TextInput
                      style={styles.input}
                      placeholderTextColor="#999"
                      value={totalKm}
                      onChangeText={setTotalKm}
                      keyboardType="decimal-pad"
                    />
                  </View>
                  <View style={{ width: 10 }} />
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>Per Km Rate (₹)</Text>
                    <TextInput
                      style={styles.input}
                      placeholderTextColor="#999"
                      value={perKmRate}
                      onChangeText={setPerKmRate}
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>
              

            
                            <Text style={styles.sectionTitle}>Fare </Text>
                            <View style={styles.earningContainer}>
                              <Text style={styles.earningAmount}>
                                ₹{fare.toFixed(2)}
                              </Text>
                             
                            </View>
                         
                
              </>
            ) : (
              <>
                <View style={styles.row}>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>Per Day Charges (₹)</Text>
                    <TextInput
                      style={styles.input}
                      value={perDayCharges}
                      onChangeText={setPerDayCharges}
                      keyboardType="decimal-pad"
                    />
                  </View>
                  <View style={{ width: 12 }} />
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>Number of Days</Text>
                    <TextInput
                      style={styles.input}
                      value={totalDays}
                      onChangeText={setTotalDays}
                      keyboardType="number-pad"
                    />
                  </View>
                </View>

                <Text style={styles.sectionTitle}>Fare </Text>
                            <View style={styles.earningContainer}>
                              <Text style={styles.earningAmount}>
                                ₹{fare.toFixed(2)}
                              </Text>
                             
                            </View>
              </>
            )}

            {/* Discount & GST on Fare only */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Discount on Fare (₹)</Text>
              <TextInput
                style={styles.input}
                value={discount}
                onChangeText={setDiscount}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.gstRow}>
              <Text style={styles.gstLabel}>
                Apply GST ({GST_RATE}%) on Fare
              </Text>
              <Switch value={hasGST} onValueChange={setHasGST} />
            </View>
          </View>

          {/* Additional Charges */}
          <View style={styles.section}>
            <View
              style={[
                styles.sectionHeader,
                {
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                },
              ]}
            >
              <Text style={styles.sectionTitle}>Additional Charges</Text>
              <TouchableOpacity onPress={addCustomCharge} style={styles.addBtn}>
                <Ionicons name="add-circle" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            <View style={styles.chargeItem}>
              <Text style={styles.chargeLabel}>Toll Tax (₹)</Text>
              <TextInput
                style={styles.chargeInput}
                value={tollTax}
                placeholder="0"
                onChangeText={setTollTax}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.chargeItem}>
              <Text style={styles.chargeLabel}>State Tax</Text>
              <TextInput
                style={styles.chargeInput}
                value={stateTax}
                onChangeText={setStateTax}
                keyboardType="decimal-pad"
                placeholder="0"
              />
            </View>
            <View style={styles.chargeItem}>
              <Text style={styles.chargeLabel}>Driver Charge</Text>
              <TextInput
                style={styles.chargeInput}
                value={driverCharge}
                onChangeText={setDriverCharge}
                keyboardType="decimal-pad"
                placeholder="0"
              />
            </View>
            <View style={styles.chargeItem}>
              <Text style={styles.chargeLabel}>Parking Charge</Text>
              <TextInput
                style={styles.chargeInput}
                value={parkingCharge}
                onChangeText={setParkingCharge}
                keyboardType="decimal-pad"
                placeholder="0"
              />
            </View>

            {additionalCharges.map((charge, index) => (
              <View key={index} style={styles.customChargeRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Charge Title"
                  value={charge.title}
                  onChangeText={(val) =>
                    updateCustomCharge(index, "title", val)
                  }
                />
                <View style={{ width: 8 }} />
                <TextInput
                  style={styles.chargeInput}
                  placeholder="0"
                  value={charge.amount}
                  onChangeText={(val) =>
                    updateCustomCharge(index, "amount", val)
                  }
                  keyboardType="decimal-pad"
                />
                <TouchableOpacity onPress={() => removeCustomCharge(index)}>
                  <Ionicons name="trash" size={20} color="#000" />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* Bank Details Toggle */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bank Details on Quotation</Text>
            <View style={styles.gstRow}>
              <Text style={styles.gstLabel}>Show Bank Details?</Text>
              <Switch
                value={showBankDetails}
                onValueChange={setShowBankDetails}
              />
            </View>
          </View>

          {/* Terms & Conditions */}
          {/* Terms & Conditions - Only show for Quotation */}
          {documentType === "quotation" && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                <Ionicons name="document" size={14} color="#000" /> Description
              </Text>
              <View style={styles.inputGroup}>
                <TextInput
                  ref={termsConditionsRef} // Optional: add ref if you want keyboard navigation here
                  style={[styles.input, styles.textArea]}
                  placeholder="Enter terms & conditions, notes, or special instructions..."
                  placeholderTextColor="#999"
                  value={termsConditions}
                  onChangeText={setTermsConditions}
                  multiline
                  numberOfLines={6}
                  returnKeyType="done"
                  onSubmitEditing={() => {
                    // Optional: blur on done
                    // Keyboard.dismiss();
                  }}
                  blurOnSubmit={true}
                />
              </View>
            </View>
          )}

          {/* Summary Card */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>
              <Ionicons name="receipt" size={16} color="#000" />
              {documentType === "quotation" ? "Quotation" : "Tax Invoice"}{" "}
              Summary
            </Text>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>₹{subtotal.toFixed(2)}</Text>
            </View>

            {discountAmount > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Discount</Text>
                <Text style={[styles.summaryValue, styles.discountText]}>
                  -₹{discountAmount.toFixed(2)}
                </Text>
              </View>
            )}

            {parseFloat(stateTax) > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>State Tax</Text>
                <Text style={styles.summaryValue}>
                  ₹{parseFloat(stateTax).toFixed(2)}
                </Text>
              </View>
            )}

            {parseFloat(driverCharge) > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Driver Charge</Text>
                <Text style={styles.summaryValue}>
                  ₹{parseFloat(driverCharge).toFixed(2)}
                </Text>
              </View>
            )}

            {parseFloat(parkingCharge) > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Parking Charge</Text>
                <Text style={styles.summaryValue}>
                  ₹{parseFloat(parkingCharge).toFixed(2)}
                </Text>
              </View>
            )}

            {hasGST && gstAmount > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>GST ({GST_RATE}%)</Text>
                <Text style={styles.summaryValue}>₹{gstAmount.toFixed(2)}</Text>
              </View>
            )}

            <View style={styles.summaryDivider} />

            <View style={styles.totalRow}>
              <View>
                <Text style={styles.totalLabel}>Total Amount</Text>
                {/* <Text style={styles.totalSubtext}>All charges included</Text> */}
              </View>
              <Text style={styles.totalValue}>₹{total.toFixed(2)}</Text>
            </View>
          </View>

          {/* Action Buttons */}
        </ScrollView>
      </KeyboardAvoidingView>
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.submitBtn, saving && { opacity: 0.7 }]}
          onPress={handleCreateQuotation}
          disabled={saving}
        >
          <Text style={styles.submitText}>
            {saving
              ? "Creating..."
              : id
              ? "Update Document"
              : `Create ${
                  documentType === "quotation" ? "Quotation" : "Tax Invoice"
                }`}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Date/Time Pickers */}
      {showPickupDate && (
        <DateTimePicker
          value={pickupDate}
          mode="date"
          display="spinner"
          onChange={(e, date) => {
            setShowPickupDate(false);
            if (date) setPickupDate(date);
          }}
        />
      )}
      {showPickupTime && (
        <DateTimePicker
          value={pickupTime}
          mode="time"
          display="spinner"
          onChange={(e, time) => {
            setShowPickupTime(false);
            if (time) setPickupTime(time);
          }}
        />
      )}
      {showReturnDate && (
        <DateTimePicker
          value={returnDate}
          mode="date"
          minimumDate={pickupDate}
          display="spinner"
          onChange={(e, date) => {
            setShowReturnDate(false);
            if (date) setReturnDate(date);
          }}
        />
      )}
      {showReturnTime && (
        <DateTimePicker
          value={returnTime}
          mode="time"
          display="spinner"
          onChange={(e, time) => {
            setShowReturnTime(false);
            if (time) setReturnTime(time);
          }}
        />
      )}

      {/* Universal Alert */}
      <UniversalAlert
        visible={alertVisible}
        onClose={() => setAlertVisible(false)}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        primaryButton={alertConfig.primaryButton}
        onPrimaryPress={alertConfig.onPrimaryPress}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#000",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerButton: {
    padding: 4,
  },
  headerTitle: {
    fontWeight: "700",
    fontSize: 18,
    color: "#fff",
    letterSpacing: 0.5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  scrollContent: {
    paddingBottom: 100,
  },
  companyCard: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  companyHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  companyName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
    marginLeft: 8,
  },
  companyDetails: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  companyAddress: {
    fontSize: 11,
    color: "#999",
    marginTop: 4,
  },
  section: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontWeight: "700",
    fontSize: 14,
    color: "#000",
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 13,
    color: "#000",
  },
  
  earningContainer: {
    backgroundColor: "#ECFDF5",
    borderRadius: 8,
    padding: 16,
    marginBottom:12,
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
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  row: {
    flexDirection: "row",
  },
  toggleRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    paddingVertical: 12,
    gap: 6,
  },
  toggleActive: {
    backgroundColor: "#000",
    borderColor: "#000",
  },
  toggleText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "600",
  },
  toggleTextActive: {
    color: "#fff",
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  dateText: {
    fontSize: 12,
    color: "#333",
    fontWeight: "500",
  },
  paymentBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    paddingVertical: 10,
    gap: 4,
  },
  paymentActive: {
    backgroundColor: "#000",
    borderColor: "#000",
  },
  gstToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f9f9f9",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  gstLabel: {
    fontSize: 13,
    color: "#333",
    fontWeight: "600",
  },
  gstAmount: {
    fontSize: 11,
    color: "#000",
    fontWeight: "700",
    marginTop: 2,
  },
  chargeItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  chargeInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  chargeLabel: {
    fontSize: 12,
    color: "#333",
    fontWeight: "500",
  },
  chargeInput: {
    width: 100,
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    color: "#000",
    textAlign: "right",
  },
  summaryCard: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    fontWeight: "700",
    fontSize: 14,
    color: "#000",
    marginBottom: 8,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: "#e0e0e0",
    marginVertical: 12,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  summaryValue: {
    fontSize: 13,
    color: "#000",
    fontWeight: "600",
  },
  discountText: {
    color: "#000",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#000",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "700",
  },
  totalSubtext: {
    fontSize: 10,
    color: "#ccc",
    marginTop: 2,
  },
  totalValue: {
    fontSize: 18,
    color: "#fff",
    fontWeight: "800",
  },
  buttonRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginTop: 16,
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#666",
    paddingVertical: 14,
    borderRadius: 10,
    gap: 6,
  },
  noCompanyContainer: {
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  padding: 24,
  backgroundColor: "#F9FAFB",
},
noCompanyTitle: {
  fontSize: 20,
  fontWeight: "700",
  marginTop: 16,
  color: "#111827",
},
noCompanyText: {
  fontSize: 14,
  color: "#6B7280",
  textAlign: "center",
  marginTop: 8,
  marginBottom: 24,
},
addCompanyBtn: {
  backgroundColor: "#000",
  paddingHorizontal: 24,
  paddingVertical: 14,
  borderRadius: 12,
},
addCompanyBtnText: {
  color: "#fff",
  fontSize: 16,
  fontWeight: "600",
},

  cancelText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  submitBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000",
    paddingVertical: 14,
    borderRadius: 10,
    gap: 6,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },

  fareDisplay: {
    fontSize: 18,
    fontWeight: "700",
    color: "#02BF4C",
    padding: 12,
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    textAlign: "center",
  },
  addBtn: {
    padding: 4,
  },
  customChargeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  gstRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  activeToggle: {
    backgroundColor: "#000",
  },
  activeText: {
    color: "#fff",
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 6,
    padding: 16,
    marginVertical: 2,

    // subtle shadow
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },

  profileImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: 14,
    backgroundColor: "#E5E7EB",
  },

  profileInfo: {
    flex: 1,
  },

  profileName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
  },

  profileMeta: {
    // flexDirection: "row",
    // alignItems: "center",
    // gap: 14,
  },

  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    maxWidth: 140,
  },

  profileText: {
    fontSize: 13,
    color: "#6B7280",
  },

  viewProfileBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "#000",
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 8,
    marginLeft: 12,
  },

  viewProfileText: {
    color: "#FFFFFF",
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  multiStopRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 12,
    gap: 10,
  },
  removeStopBtn: {
    paddingTop: 28, // align with input label
  },
  addStopBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 12,
    gap: 6,
  },
  addStopText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#000",
  },
  documentTypeSection: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
});
