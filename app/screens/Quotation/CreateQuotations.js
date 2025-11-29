import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  Image,
  Switch,
} from "react-native";
import {
  MaterialCommunityIcons,
  Ionicons,
  FontAwesome5,
} from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import axios from "axios";
import { useNavigation } from "@react-navigation/native";
import { UniversalAlert } from "../common/UniversalAlert";
import { API_URL_APP } from "../../constant/api";
import DateTimePicker from "@react-native-community/datetimepicker";
import loginStore from "../../store/auth.store";
import useDriverStore from "../../store/driver.store";

export default function CreateQuotations() {
  const navigation = useNavigation();
  const { token } = loginStore();
  const { driver } = useDriverStore();

  // Loading & Data States
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [company, setCompany] = useState(null);

  // Alert State
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    type: "success",
    title: "",
    message: "",
    primaryButton: "OK",
    onPrimaryPress: () => setAlertVisible(false),
  });

  // Form State - Invoice
  const [invoiceDate, setInvoiceDate] = useState(new Date());
  const [showInvoiceDatePicker, setShowInvoiceDatePicker] = useState(false);

  // Form State - Customer Details
  const [customerName, setCustomerName] = useState("");
  const [customerContact, setCustomerContact] = useState("");

  // Form State - Trip Type
  const [tripType, setTripType] = useState("one_way"); // 'one_way' or 'round_trip'

  // Form State - Pricing Mode
  const [pricingMode, setPricingMode] = useState("detailed"); // 'detailed' or 'simplified'

  // Form State - Trip Details
  const [pickupPlace, setPickupPlace] = useState("");
  const [dropPlace, setDropPlace] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [pickupDate, setPickupDate] = useState(new Date());
  const [pickupTime, setPickupTime] = useState("");
  const [returnDate, setReturnDate] = useState(new Date());
  const [returnTime, setReturnTime] = useState("");

  // Detailed Pricing Fields
  const [totalDays, setTotalDays] = useState("1");
  const [perDayCharges, setPerDayCharges] = useState("");
  const [tollTax, setTollTax] = useState("0");

  // Simplified Pricing Field
  const [totalAmount, setTotalAmount] = useState("");

  // Extra Charges
  const [extraCharges, setExtraCharges] = useState([]);

  // Form State - Additional Charges (Summary)
  const [stateTax, setStateTax] = useState("0");
  const [driverCharge, setDriverCharge] = useState("0");
  const [parkingCharge, setParkingCharge] = useState("0");

  // Form State - Bank Details
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [termsConditions, setTermsConditions] = useState(
    "Thank you for doing business with us."
  );

  // Date Picker Visibility
  const [showPickupDatePicker, setShowPickupDatePicker] = useState(false);
  const [showPickupTimePicker, setShowPickupTimePicker] = useState(false);
  const [showReturnDatePicker, setShowReturnDatePicker] = useState(false);
  const [showReturnTimePicker, setShowReturnTimePicker] = useState(false);

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

  // Fetch Company Details
  const fetchCompany = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL_APP}/api/v1/my-company`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = res.data?.data;

      if (!data || Object.keys(data).length === 0) {
        setCompany(null);
        showAlert(
          "warning",
          "Company Details Required",
          "Please add your company details to create quotations.",
          () => {
            setAlertVisible(false);
            navigation.navigate("company-details");
          }
        );
      } else {
        setCompany(data);

        // Pre-fill bank details
        const bankDetails = driver?.BankDetails;
        if (bankDetails) {
          setBankName(bankDetails.bank_name || "");
          setAccountNumber(bankDetails.account_number || "");
          setIfscCode(bankDetails.ifsc_code || "");
          setAccountHolderName(
            bankDetails.account_holder_name || data.company_name || ""
          );
        }
      }
    } catch (err) {
      console.error("Fetch company error:", err);
      showAlert("error", "Error", "Failed to load company details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompany();
  }, []);

  // Auto-calculate total days for round trip
  useEffect(() => {
    if (tripType === "round_trip" && pickupDate && returnDate) {
      const diffTime = Math.abs(returnDate - pickupDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setTotalDays(diffDays > 0 ? diffDays.toString() : "1");
    }
  }, [pickupDate, returnDate, tripType]);

  // Form Validation
  const validateForm = () => {
    const validations = [
      { value: customerName.trim(), message: "Customer name is required" },
      { value: customerContact.trim(), message: "Customer contact is required" },
      { value: pickupPlace.trim(), message: "Pickup place is required" },
      { value: dropPlace.trim(), message: "Drop place is required" },
      { value: vehicleType.trim(), message: "Vehicle type is required" },
      { value: pickupTime.trim(), message: "Pickup time is required" },
      { value: bankName.trim(), message: "Bank name is required" },
      { value: accountNumber.trim(), message: "Account number is required" },
      { value: ifscCode.trim(), message: "IFSC code is required" },
      { value: accountHolderName.trim(), message: "Account holder name is required" },
    ];

    // Round trip validations
    if (tripType === "round_trip") {
      validations.push(
        { value: returnTime.trim(), message: "Return time is required" }
      );
    }

    // Pricing mode validations
    if (pricingMode === "detailed") {
      validations.push(
        { value: perDayCharges && parseFloat(perDayCharges) > 0, message: "Valid per day charges are required" }
      );
    } else {
      validations.push(
        { value: totalAmount && parseFloat(totalAmount) > 0, message: "Valid total amount is required" }
      );
    }

    for (const validation of validations) {
      if (!validation.value) {
        showAlert("error", "Validation Error", validation.message);
        return false;
      }
    }

    return true;
  };

  // Handle Create Quotation
  const handleCreateQuotation = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);

      // Build trip details based on pricing mode
      const tripDetail = {
        pickup_drop_place: `${pickupPlace.trim()} To ${dropPlace.trim()}`,
        vehicle_type: vehicleType.trim(),
        pickup_date: pickupDate.toISOString().split("T")[0],
        pickup_time: pickupTime.trim(),
        extra_charges: extraCharges.filter(ec => ec.description && ec.amount),
      };

      // Add return details for round trip
      if (tripType === "round_trip") {
        tripDetail.return_date = returnDate.toISOString().split("T")[0];
        tripDetail.return_time = returnTime.trim();
      }

      // Add pricing based on mode
      if (pricingMode === "simplified") {
        tripDetail.TotalAmountOftrip = parseFloat(totalAmount);
      } else {
        tripDetail.total_days = parseInt(totalDays);
        tripDetail.per_day_cab_charges = parseFloat(perDayCharges);
        tripDetail.toll_tax_amount = parseFloat(tollTax) || 0;
      }

      const quotationData = {
        invoice_date: invoiceDate.toISOString().split("T")[0],
        bill_to: {
          customer_name: customerName.trim(),
          contact_number: customerContact.trim(),
        },
        trip_type: tripType,
        trip_details: [tripDetail],
        summary: {
          state_tax: parseFloat(stateTax) || 0,
          driver_charge: parseFloat(driverCharge) || 0,
          parking_charge: parseFloat(parkingCharge) || 0,
        },
        payment_mode: "bank_transfer",
        bank_details: {
          bank_name: bankName.trim(),
          account_number: accountNumber.trim(),
          ifsc_code: ifscCode.trim(),
          account_holder_name: accountHolderName.trim(),
        },
        terms_and_conditions: termsConditions.trim(),
      };

      const response = await axios.post(
        `${API_URL_APP}/api/v1/create-quotation`,
        quotationData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.success) {
        showAlert(
          "success",
          "Success",
          "Quotation created successfully!",
          () => {
            setAlertVisible(false);
            navigation.goBack();
          }
        );
      }
    } catch (error) {
      console.error("Create quotation error:", error);
      const errorMessage =
        error.response?.data?.message || "Failed to create quotation";
      showAlert("error", "Error", errorMessage);
    } finally {
      setSaving(false);
    }
  };

  // Format time from Date object
  const formatTime = (date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    const formattedHours = hours % 12 || 12;
    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
    return `${formattedHours}:${formattedMinutes} ${ampm}`;
  };

  // Add Extra Charge
  const addExtraCharge = () => {
    setExtraCharges([...extraCharges, { description: "", amount: "" }]);
  };

  // Remove Extra Charge
  const removeExtraCharge = (index) => {
    const updated = extraCharges.filter((_, i) => i !== index);
    setExtraCharges(updated);
  };

  // Update Extra Charge
  const updateExtraCharge = (index, field, value) => {
    const updated = [...extraCharges];
    updated[index][field] = value;
    setExtraCharges(updated);
  };

  // Loading Screen
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#FF1744" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF1744" />
          <Text style={styles.loadingText}>Loading company details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Main Render
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Create Quotation</Text>
          {company && (
            <Text style={styles.headerSubtitle}>{company.company_name}</Text>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Company Info Card */}
        {company && (
          <View style={styles.companyCard}>
            <View style={styles.companyIconContainer}>
              <Image
                source={{ uri: company?.logo?.url }}
                style={{ width: 40, height: 40 }}
                resizeMode="cover"
              />
            </View>
            <View style={styles.companyInfo}>
              <Text style={styles.companyName}>{company.company_name}</Text>
              {company.email && (
                <Text style={styles.companyDetail}>
                  <Ionicons name="mail" size={12} color="#666" />{" "}
                  {company.email}
                </Text>
              )}
              {company.phone && (
                <Text style={styles.companyDetail}>
                  <Ionicons name="call" size={12} color="#666" />{" "}
                  {company.phone}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Invoice Date Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons
              name="calendar-clock"
              size={20}
              color="#FF1744"
            />
            <Text style={styles.sectionTitle}>Invoice Date</Text>
          </View>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowInvoiceDatePicker(true)}
          >
            <View style={styles.dateButtonContent}>
              <Ionicons name="calendar-outline" size={20} color="#FF1744" />
              <Text style={styles.dateButtonText}>
                {invoiceDate.toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={20} color="#999" />
          </TouchableOpacity>
          {showInvoiceDatePicker && (
            <DateTimePicker
              value={invoiceDate}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setShowInvoiceDatePicker(false);
                if (selectedDate) setInvoiceDate(selectedDate);
              }}
            />
          )}
        </View>

        {/* Customer Details Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person" size={20} color="#FF1744" />
            <Text style={styles.sectionTitle}>Customer Details</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Customer Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter customer name"
              placeholderTextColor="#999"
              value={customerName}
              onChangeText={setCustomerName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Contact Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter 10-digit mobile number"
              placeholderTextColor="#999"
              value={customerContact}
              onChangeText={setCustomerContact}
              keyboardType="phone-pad"
              maxLength={10}
            />
          </View>
        </View>

        {/* Trip Type Selection */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons
              name="swap-horizontal"
              size={20}
              color="#FF1744"
            />
            <Text style={styles.sectionTitle}>Trip Type</Text>
          </View>

          <View style={styles.tripTypeContainer}>
            <TouchableOpacity
              style={[
                styles.tripTypeButton,
                tripType === "one_way" && styles.tripTypeButtonActive,
              ]}
              onPress={() => setTripType("one_way")}
            >
              <MaterialCommunityIcons
                name="arrow-right"
                size={20}
                color={tripType === "one_way" ? "#fff" : "#FF1744"}
              />
              <Text
                style={[
                  styles.tripTypeText,
                  tripType === "one_way" && styles.tripTypeTextActive,
                ]}
              >
                One Way
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tripTypeButton,
                tripType === "round_trip" && styles.tripTypeButtonActive,
              ]}
              onPress={() => setTripType("round_trip")}
            >
              <MaterialCommunityIcons
                name="arrow-left-right"
                size={20}
                color={tripType === "round_trip" ? "#fff" : "#FF1744"}
              />
              <Text
                style={[
                  styles.tripTypeText,
                  tripType === "round_trip" && styles.tripTypeTextActive,
                ]}
              >
                Round Trip
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Pricing Mode Selection */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons
              name="cash-multiple"
              size={20}
              color="#FF1744"
            />
            <Text style={styles.sectionTitle}>Pricing Mode</Text>
          </View>

          <View style={styles.pricingModeContainer}>
            <TouchableOpacity
              style={[
                styles.pricingModeButton,
                pricingMode === "detailed" && styles.pricingModeButtonActive,
              ]}
              onPress={() => setPricingMode("detailed")}
            >
              <Text
                style={[
                  styles.pricingModeText,
                  pricingMode === "detailed" && styles.pricingModeTextActive,
                ]}
              >
                Detailed (Per Day)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.pricingModeButton,
                pricingMode === "simplified" &&
                  styles.pricingModeButtonActive,
              ]}
              onPress={() => setPricingMode("simplified")}
            >
              <Text
                style={[
                  styles.pricingModeText,
                  pricingMode === "simplified" &&
                    styles.pricingModeTextActive,
                ]}
              >
                Simplified (Total)
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Trip Details Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="car" size={20} color="#FF1744" />
            <Text style={styles.sectionTitle}>Trip Details</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Pickup Place *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter pickup location"
              placeholderTextColor="#999"
              value={pickupPlace}
              onChangeText={setPickupPlace}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Drop Place *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter drop location"
              placeholderTextColor="#999"
              value={dropPlace}
              onChangeText={setDropPlace}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Vehicle Type *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Ertiga SUV, Innova Crysta"
              placeholderTextColor="#999"
              value={vehicleType}
              onChangeText={setVehicleType}
            />
          </View>

          {/* Pickup Date & Time Row */}
          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <Text style={styles.label}>Pickup Date *</Text>
              <TouchableOpacity
                style={styles.dateInputSmall}
                onPress={() => setShowPickupDatePicker(true)}
              >
                <Text style={styles.dateTextSmall}>
                  {pickupDate.toLocaleDateString("en-IN")}
                </Text>
                <Ionicons name="calendar" size={16} color="#666" />
              </TouchableOpacity>
              {showPickupDatePicker && (
                <DateTimePicker
                  value={pickupDate}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowPickupDatePicker(false);
                    if (selectedDate) setPickupDate(selectedDate);
                  }}
                />
              )}
            </View>

            <View style={styles.halfWidth}>
              <Text style={styles.label}>Pickup Time *</Text>
              <TouchableOpacity
                style={styles.dateInputSmall}
                onPress={() => setShowPickupTimePicker(true)}
              >
                <Text style={styles.dateTextSmall}>
                  {pickupTime || "Select"}
                </Text>
                <Ionicons name="time" size={16} color="#666" />
              </TouchableOpacity>
              {showPickupTimePicker && (
                <DateTimePicker
                  value={pickupDate}
                  mode="time"
                  display="default"
                  onChange={(event, selectedTime) => {
                    setShowPickupTimePicker(false);
                    if (selectedTime) {
                      setPickupTime(formatTime(selectedTime));
                    }
                  }}
                />
              )}
            </View>
          </View>

          {/* Return Date & Time (Only for Round Trip) */}
          {tripType === "round_trip" && (
            <View style={styles.row}>
              <View style={styles.halfWidth}>
                <Text style={styles.label}>Return Date *</Text>
                <TouchableOpacity
                  style={styles.dateInputSmall}
                  onPress={() => setShowReturnDatePicker(true)}
                >
                  <Text style={styles.dateTextSmall}>
                    {returnDate.toLocaleDateString("en-IN")}
                  </Text>
                  <Ionicons name="calendar" size={16} color="#666" />
                </TouchableOpacity>
                {showReturnDatePicker && (
                  <DateTimePicker
                    value={returnDate}
                    mode="date"
                    display="default"
                    minimumDate={pickupDate}
                    onChange={(event, selectedDate) => {
                      setShowReturnDatePicker(false);
                      if (selectedDate) setReturnDate(selectedDate);
                    }}
                  />
                )}
              </View>

              <View style={styles.halfWidth}>
                <Text style={styles.label}>Return Time *</Text>
                <TouchableOpacity
                  style={styles.dateInputSmall}
                  onPress={() => setShowReturnTimePicker(true)}
                >
                  <Text style={styles.dateTextSmall}>
                    {returnTime || "Select"}
                  </Text>
                  <Ionicons name="time" size={16} color="#666" />
                </TouchableOpacity>
                {showReturnTimePicker && (
                  <DateTimePicker
                    value={returnDate}
                    mode="time"
                    display="default"
                    onChange={(event, selectedTime) => {
                      setShowReturnTimePicker(false);
                      if (selectedTime) {
                        setReturnTime(formatTime(selectedTime));
                      }
                    }}
                  />
                )}
              </View>
            </View>
          )}

          {/* Pricing Fields Based on Mode */}
          {pricingMode === "detailed" ? (
            <>
              <View style={styles.row}>
                <View style={styles.halfWidth}>
                  <Text style={styles.label}>Total Days *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Days"
                    placeholderTextColor="#999"
                    value={totalDays}
                    onChangeText={setTotalDays}
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.halfWidth}>
                  <Text style={styles.label}>Per Day Charges *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="₹ 0"
                    placeholderTextColor="#999"
                    value={perDayCharges}
                    onChangeText={setPerDayCharges}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Toll Tax Amount</Text>
                <TextInput
                  style={styles.input}
                  placeholder="₹ 0"
                  placeholderTextColor="#999"
                  value={tollTax}
                  onChangeText={setTollTax}
                  keyboardType="numeric"
                />
              </View>
            </>
          ) : (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Total Trip Amount *</Text>
              <TextInput
                style={styles.input}
                placeholder="₹ 0"
                placeholderTextColor="#999"
                value={totalAmount}
                onChangeText={setTotalAmount}
                keyboardType="numeric"
              />
              <Text style={styles.helperText}>
                Enter the total fare (all charges included)
              </Text>
            </View>
          )}
        </View>

        {/* Extra Charges Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons
              name="plus-circle"
              size={20}
              color="#FF1744"
            />
            <Text style={styles.sectionTitle}>Extra Charges (Optional)</Text>
          </View>

          {extraCharges.map((charge, index) => (
            <View key={index} style={styles.extraChargeItem}>
              <View style={styles.extraChargeInputs}>
                <TextInput
                  style={[styles.input, { flex: 1, marginRight: 8 }]}
                  placeholder="Description (e.g., Night halt)"
                  placeholderTextColor="#999"
                  value={charge.description}
                  onChangeText={(text) =>
                    updateExtraCharge(index, "description", text)
                  }
                />
                <TextInput
                  style={[styles.input, { width: 100 }]}
                  placeholder="₹ Amount"
                  placeholderTextColor="#999"
                  value={charge.amount}
                  onChangeText={(text) =>
                    updateExtraCharge(index, "amount", text)
                  }
                  keyboardType="numeric"
                />
              </View>
              <TouchableOpacity
                onPress={() => removeExtraCharge(index)}
                style={styles.removeChargeButton}
              >
                <Ionicons name="trash" size={20} color="#FF1744" />
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity
            style={styles.addChargeButton}
            onPress={addExtraCharge}
          >
            <Ionicons name="add-circle-outline" size={20} color="#FF1744" />
            <Text style={styles.addChargeText}>Add Extra Charge</Text>
          </TouchableOpacity>
        </View>

        {/* Additional Charges Section (Only for Detailed Mode) */}
        {pricingMode === "detailed" && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons
                name="cash-plus"
                size={20}
                color="#FF1744"
              />
              <Text style={styles.sectionTitle}>Additional Charges</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>State Tax</Text>
              <TextInput
                style={styles.input}
                placeholder="₹ 0"
                placeholderTextColor="#999"
                value={stateTax}
                onChangeText={setStateTax}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Driver Charge</Text>
              <TextInput
                style={styles.input}
                placeholder="₹ 0"
                placeholderTextColor="#999"
                value={driverCharge}
                onChangeText={setDriverCharge}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Parking Charge</Text>
              <TextInput
                style={styles.input}
                placeholder="₹ 0"
                placeholderTextColor="#999"
                value={parkingCharge}
                onChangeText={setParkingCharge}
                keyboardType="numeric"
              />
            </View>
          </View>
        )}

        {/* Bank Details Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="bank" size={20} color="#FF1744" />
            <Text style={styles.sectionTitle}>Bank Details</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Bank Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter bank name"
              placeholderTextColor="#999"
              value={bankName}
              onChangeText={setBankName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Account Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter account number"
              placeholderTextColor="#999"
              value={accountNumber}
              onChangeText={setAccountNumber}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>IFSC Code *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter IFSC code"
              placeholderTextColor="#999"
              value={ifscCode}
              onChangeText={setIfscCode}
              autoCapitalize="characters"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Account Holder Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter account holder name"
              placeholderTextColor="#999"
              value={accountHolderName}
              onChangeText={setAccountHolderName}
            />
          </View>
        </View>

        {/* Terms & Conditions Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons
              name="file-document"
              size={20}
              color="#FF1744"
            />
            <Text style={styles.sectionTitle}>Terms & Conditions</Text>
          </View>

          <View style={styles.inputGroup}>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Enter terms and conditions"
              placeholderTextColor="#999"
              value={termsConditions}
              onChangeText={setTermsConditions}
              multiline
              numberOfLines={4}
            />
          </View>
        </View>

        {/* Create Button */}
        <TouchableOpacity
          style={[styles.createButton, saving && styles.createButtonDisabled]}
          onPress={handleCreateQuotation}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <MaterialCommunityIcons name="send" size={20} color="#fff" />
              <Text style={styles.createButtonText}>Create Quotation</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      <UniversalAlert
        visible={alertVisible}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        primaryButton={alertConfig.primaryButton}
        onPrimaryPress={alertConfig.onPrimaryPress}
        onClose={() => setAlertVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  header: {
    backgroundColor: "#FF1744",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  backButton: {
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#fff",
    opacity: 0.9,
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  companyCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  companyIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FFE5E9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    overflow: "hidden",
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  companyDetail: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  section: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginLeft: 8,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: "#333",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  helperText: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
    fontStyle: "italic",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  halfWidth: {
    flex: 1,
    marginRight: 8,
  },
  dateButton: {
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  dateButtonContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  dateButtonText: {
    fontSize: 14,
    color: "#333",
    marginLeft: 8,
  },
  dateInputSmall: {
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  dateTextSmall: {
    fontSize: 14,
    color: "#333",
  },
  tripTypeContainer: {
    flexDirection: "row",
    gap: 12,
  },
  tripTypeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#FF1744",
    backgroundColor: "#fff",
  },
  tripTypeButtonActive: {
    backgroundColor: "#FF1744",
  },
  tripTypeText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FF1744",
    marginLeft: 6,
  },
  tripTypeTextActive: {
    color: "#fff",
  },
  pricingModeContainer: {
    flexDirection: "row",
    gap: 12,
  },
  pricingModeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#FF1744",
    backgroundColor: "#fff",
    alignItems: "center",
  },
  pricingModeButtonActive: {
    backgroundColor: "#FF1744",
  },
  pricingModeText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FF1744",
  },
  pricingModeTextActive: {
    color: "#fff",
  },
  extraChargeItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  extraChargeInputs: {
    flex: 1,
    flexDirection: "row",
  },
  removeChargeButton: {
    marginLeft: 8,
    padding: 8,
  },
  addChargeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FF1744",
    borderStyle: "dashed",
  },
  addChargeText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FF1744",
    marginLeft: 6,
  },
  createButton: {
    backgroundColor: "#FF1744",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  createButtonDisabled: {
    backgroundColor: "#FF6B7A",
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
    marginLeft: 8,
  },
});