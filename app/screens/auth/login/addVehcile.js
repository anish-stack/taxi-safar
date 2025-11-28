
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Image,
  ScrollView,
  Alert,
  Platform,
  ActivityIndicator,
  Modal,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import axios from "axios";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../../constant/ui";
import BackWithLogo from "../../common/back_with_logo";
import { API_URL_APP } from "../../../constant/api";
import { useRoute } from "@react-navigation/native";
import { getData, saveData } from "../../../utils/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";

const QUICKEKYC_API_KEY = "a43f4a59-8f3a-45dc-bcbd-5d2a4c512e73";
const AADHAAR_DATA_KEY = "aadhaar_verified_data";
const RC_DATA_KEY = "rc_verified_data";

export default function AddVehicle({ navigation }) {
  const route = useRoute();
  const { driverId } = route.params || {};
  
  const VEHICLE_TYPES = ["Mini", "Sedan", "SUV", "Premium"];

  // 🚨 BYPASS MODE - Set to false for production
  const byPass = true;

  // New states for RC verification
  const [vehicleOwnership, setVehicleOwnership] = useState("");
  const [rcNumber, setRcNumber] = useState("");
  const [rcData, setRcData] = useState(null);
  const [isRcVerified, setIsRcVerified] = useState(false);
  const [driverData, setDriverData] = useState(null);
  const [isVerifyingRc, setIsVerifyingRc] = useState(false);

  // Aadhaar verification states
  const [showAadhaarModal, setShowAadhaarModal] = useState(false);
  const [ownerAadhaar, setOwnerAadhaar] = useState("");
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [aadhaarRequestId, setAadhaarRequestId] = useState(null);
  const [timer, setTimer] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const otpRefs = useRef([]);

  // const [brands, setBrands] = useState([]);
  // const [selectedBrand, setSelectedBrand] = useState(null);
  const [vehicleNames, setVehicleNames] = useState([]);
  const [vehicleName, setVehicleName] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [dates, setDates] = useState({
    regDate: null,
    insuranceExpiry: null,
    permitExpiry: null,
  });
  const [docs, setDocs] = useState({
    rcBook: null,
    insurance: null,
    permit: null,
    vehicleFront: null,
    vehicleBack: null,
    vehicleInterior: null,
  });
  const [showDatePicker, setShowDatePicker] = useState({
    key: null,
    visible: false,
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [brandsLoading, setBrandsLoading] = useState(true);
  const [demoModal, setDemoModal] = useState({
    visible: false,
    image: null,
    title: "",
  });

  const DEMO_IMAGES = {
    vehicleFront: require("../../../assets/demo/front.jpg"),
    vehicleBack: require("../../../assets/demo/back.jpg"),
    vehicleInterior: require("../../../assets/demo/interior.jpg"),
  };

  useEffect(() => {
    fetchBrands();
    requestPermissions();
  }, []);

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer((t) => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  useEffect(() => {
    if (driverId) fetchDriverDetails();
  }, [driverId]);

  const requestPermissions = async () => {
    await ImagePicker.requestCameraPermissionsAsync();
    await ImagePicker.requestMediaLibraryPermissionsAsync();
  };

  const fetchDriverDetails = async () => {
    try {
      const response = await axios.get(
        `${API_URL_APP}/api/v1/driver-details/${driverId}`
      );

      if (response.data.success) {
        setDriverData(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching driver details:", error);
    }
  };

  const fetchBrands = async () => {
    try {
      setBrandsLoading(true);
      const res = await axios.get(
        `${API_URL_APP}/api/v1/vehicles/get-all-brands`
      );
      if (res.data.success && Array.isArray(res.data.data)) {
        // setBrands(res.data.data);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to load brands.", [
        { text: "Retry", onPress: fetchBrands },
        { text: "Cancel" },
      ]);
    } finally {
      setBrandsLoading(false);
    }
  };

  // ========================================
  // RC VERIFICATION
  // ========================================
  const handleVerifyRC = async () => {
    if (!rcNumber.trim()) {
      return setFieldError("rcNumber", "Please enter RC number");
    }

    setIsVerifyingRc(true);
    setErrors({});

    try {
      // ============================================
      // 🚀 BYPASS MODE (For testing without API calls)
      // ============================================
      if (byPass) {
        console.log("⚠️ RC VERIFICATION BYPASSED (TEST MODE)");

        const dummyRC = {
          rc_number: "DL3CAV5959",
          fit_up_to: "2039-10-05",
          registration_date: "2019-10-06",
          owner_name: "ANISH",
          father_name: "KRISHAN KUMAR",
          present_address:
            "H.NO-645/A-B KH.NO-3/25-2/21, BLOCK-B BEGUMPUR RAJEEV NAGAR, , New Delhi, Delhi, 110086",
          permanent_address:
            "H.NO-645/A-B KH.NO-3/25-2/21, BLOCK-B BEGUMPUR RAJEEV NAGAR, , New Delhi, Delhi, 110086",
          mobile_number: "",
          vehicle_category: "LMV-CAR",
          vehicle_chasi_number: "MA3ERLF1S00415206",
          vehicle_engine_number: "K12MN2841891",
          maker_description: "MARUTI SUZUKI INDIA LTD",
          maker_model: "SWIFT DZIRE VDI",
          body_type: "SALOON",
          fuel_type: "DIESEL",
          color: "WHITE",
          norms_type: "BHARAT STAGE IV",
          financer: "HDFC Bank Ltd",
          financed: "HYPOTHECATION",
          insurance_company: "ICICI Lombard General Insurance Co. Ltd.",
          insurance_policy_number: "3005/RF-19631930/00/000",
          insurance_upto: "2029-10-05",
          manufacturing_date: "9/2019",
          manufacturing_date_formatted: "2019-09",
          registered_at: "ROHINI, Delhi",
          latest_by: null,
          less_info: false,
          tax_upto: "2039-10-05",
          tax_paid_upto: null,
          cubic_capacity: "1248",
          vehicle_gross_weight: "1490",
          no_cylinders: "4",
          seat_capacity: "5",
          sleeper_capacity: "0",
          standing_capacity: "0",
          wheelbase: "2450",
          unladen_weight: "1040",
          vehicle_category_description: "LIGHT MOTOR VEHICLE (CAR)",
          pucc_number: "DL01100400035711",
          pucc_upto: "2026-10-05",
          permit_number: "DL3T0010013562",
          permit_issue_date: "2019-10-15",
          permit_valid_from: "2019-10-15",
          permit_valid_upto: "2029-10-14",
          permit_type: "ALL INDIA TOURIST PERMIT",
          national_permit_number: null,
          national_permit_upto: null,
          national_permit_issued_by: null,
          non_use_status: null,
          non_use_from: null,
          non_use_to: null,
          blacklist_status: null,
          noc_details: null,
          owner_number: "1",
          rc_status: "ACTIVE",
          masked_name: null,
          challan_details: null,
          variant: "SWIFT DZIRE VDI",
          rto_code: "11",
        };

        setRcData(dummyRC);
        await saveData(RC_DATA_KEY, JSON.stringify(dummyRC));

        // Check if bike
        const vehicleCategory = dummyRC.vehicle_category?.toUpperCase() || "";
        const isBike =
          vehicleCategory.includes("2W") ||
          vehicleCategory.includes("TWO WHEELER") ||
          vehicleCategory.includes("MOTORCYCLE");

        if (isBike) {
          setFieldError(
            "rcNumber",
            "Bikes/Two-wheelers are not allowed. Please register a car."
          );
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          return;
        }

        const aadhaarVerified = await verifyNameWithAadhaar(dummyRC.owner_name);

        if (!aadhaarVerified) {
          setFieldError("rcNumber", "Name does not match Aadhaar record");
          return;
        }

        await fillFormFromRC(dummyRC);
        setIsRcVerified(true);

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("Success", "RC bypass verified (test mode)!");
        return;
      }

      // ============================================
      // 🟢 LIVE MODE → REAL API CALL
      // ============================================
      const response = await axios.post(
        "https://api.quickekyc.com/api/v1/rc/rc_sp",
        {
          id_number: rcNumber.toUpperCase(),
          key: QUICKEKYC_API_KEY,
        },
        {
          headers: { "Content-Type": "application/json" },
          timeout: 20000,
        }
      );

      if (response.data.status === "success" && response.data.data) {
        const rcInfo = response.data.data;

        // Check if bike
        const vehicleCategory = rcInfo.vehicle_category?.toUpperCase() || "";
        const isBike =
          vehicleCategory.includes("2W") ||
          vehicleCategory.includes("TWO WHEELER") ||
          vehicleCategory.includes("MOTORCYCLE");

        if (isBike) {
          setFieldError(
            "rcNumber",
            "Bikes/Two-wheelers are not allowed. Please register a car."
          );
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          return;
        }

        setRcData(rcInfo);
        await saveData(RC_DATA_KEY, JSON.stringify(rcInfo));

        const aadhaarVerified = await verifyNameWithAadhaar(rcInfo.owner_name);

        if (!aadhaarVerified) {
          setFieldError("rcNumber", "Name does not match Aadhaar record");
          return;
        }

        await fillFormFromRC(rcInfo);

        setIsRcVerified(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("Success", "RC verified successfully!");
      } else {
        setFieldError(
          "rcNumber",
          response.data.message || "RC verification failed"
        );
      }
    } catch (error) {
      console.error("RC verification error:", error);
      const msg =
        error.response?.data?.message ||
        "Failed to verify RC. Please try again.";

      setFieldError("rcNumber", msg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsVerifyingRc(false);
    }
  };

  const verifyNameWithAadhaar = (rcOwnerName) => {
    try {
      if (!driverData) {
        Alert.alert("Please wait", "Fetching driver details...");
        return false;
      }

      const driverName = (driverData.driver_name || "").trim().toUpperCase();
      const ownerName = rcOwnerName.trim().toUpperCase();

      console.log("Driver Name:", driverName);
      console.log("RC Owner Name:", ownerName);

      // ✔ 100% exact match required
      if (driverName === ownerName) {
        return true;
      } else {
        // ❌ mismatch
        Alert.alert("Name Mismatch", `Please verify owner's Aadhaar.`, [
          { text: "OK", onPress: () => setShowAadhaarModal(true) },
        ]);
        return false;
      }
    } catch (error) {
      console.error("Name verification error:", error);
      setShowAadhaarModal(true);
      return false;
    }
  };

  const fillFormFromRC = async (rcInfo) => {
    // Set vehicle number
    setVehicleNumber(rcInfo.rc_number || "");

    // Set dates
    if (rcInfo.registration_date) {
      setDates((prev) => ({ ...prev, regDate: rcInfo.registration_date }));
    }
    if (rcInfo.insurance_upto) {
      setDates((prev) => ({
        ...prev,
        insuranceExpiry: rcInfo.insurance_upto,
      }));
    }



  };

  // ========================================
  // AADHAAR OTP GENERATION
  // ========================================
  const handleGenerateAadhaarOTP = async () => {
    if (isVerifying) return;
    setErrors({});

    if (!ownerAadhaar.match(/^\d{12}$/)) {
      return setFieldError(
        "ownerAadhaar",
        "Please enter a valid 12-digit Aadhaar number"
      );
    }

    setIsVerifying(true);
    try {
      // ============================================
      // 🚀 BYPASS MODE (For testing without API calls)
      // ============================================
      if (byPass) {
        console.log("⚠️ AADHAAR OTP GENERATION BYPASSED (TEST MODE)");

        const dummyResponse = {
          data: {
            otp_sent: true,
            if_number: true,
            valid_aadhaar: true,
          },
          status_code: 200,
          message: "OTP Sent.",
          status: "success",
          request_id: 58,
        };

        setAadhaarRequestId(dummyResponse.request_id);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setShowAadhaarModal(false);
        setShowOtpModal(true);
        setTimer(30);
        setOtp(["", "", "", "", "", ""]);
        return;
      }

      // ============================================
      // 🟢 LIVE MODE → REAL API CALL
      // ============================================
      const response = await axios.post(
        "https://api.quickekyc.com/api/v1/aadhaar-v2/generate-otp",
        {
          key: QUICKEKYC_API_KEY,
          id_number: ownerAadhaar,
        },
        {
          headers: { "Content-Type": "application/json" },
          timeout: 20000,
        }
      );

      if (response.data.status === "success" && response.data.data.otp_sent) {
        setAadhaarRequestId(response.data.request_id);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setShowAadhaarModal(false);
        setShowOtpModal(true);
        setTimer(30);
        setOtp(["", "", "", "", "", ""]);
      } else {
        setFieldError(
          "ownerAadhaar",
          response.data.message || "Failed to send OTP"
        );
      }
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        "Failed to send OTP. Please try again.";
      setFieldError("ownerAadhaar", msg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsVerifying(false);
    }
  };

  // ========================================
  // AADHAAR OTP VERIFICATION
  // ========================================
  const handleVerifyAadhaarOtp = async () => {
    if (isVerifying) return;
    const otpValue = otp.join("");
    if (otpValue.length !== 6)
      return setFieldError("otp", "Enter 6-digit OTP");

    setIsVerifying(true);
    try {
      // ============================================
      // 🚀 BYPASS MODE (For testing without API calls)
      // ============================================
      if (byPass) {
        console.log("⚠️ AADHAAR OTP VERIFICATION BYPASSED (TEST MODE)");

        const dummyAadhaarData = {
          full_name: rcData.owner_name,
          dob: "1990-01-01",
          gender: "M",
          address: rcData.present_address,
        };

        await fillFormFromRC(rcData);
        setIsRcVerified(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setShowOtpModal(false);
        Alert.alert(
          "Success",
          "Owner's Aadhaar verified successfully! (Test Mode)"
        );
        return;
      }

      // ============================================
      // 🟢 LIVE MODE → REAL API CALL
      // ============================================
      const response = await axios.post(
        "https://api.quickekyc.com/api/v1/aadhaar-v2/submit-otp",
        {
          key: QUICKEKYC_API_KEY,
          request_id: aadhaarRequestId.toString(),
          otp: otpValue,
        },
        {
          headers: { "Content-Type": "application/json" },
          timeout: 20000,
        }
      );

      if (response.data.status === "success") {
        const data = response.data.data;
        const ownerName = data.full_name.toUpperCase();
        const rcOwnerName = rcData.owner_name.toUpperCase();

        // Verify name match
        if (ownerName.includes(rcOwnerName) || rcOwnerName.includes(ownerName)) {
          await fillFormFromRC(rcData);
          setIsRcVerified(true);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setShowOtpModal(false);
          Alert.alert("Success", "Owner's Aadhaar verified successfully!");
        } else {
          setFieldError(
            "otp",
            `Name mismatch: ${data.full_name} ≠ ${rcData.owner_name}`
          );
        }
      } else {
        setFieldError("otp", response.data?.message || "Invalid OTP");
      }
    } catch (error) {
      setFieldError(
        "otp",
        error.response?.data?.message || "Verification failed"
      );
    } finally {
      setIsVerifying(false);
    }
  };

  // ========================================
  // RESEND OTP
  // ========================================
  const handleResendOtp = async () => {
    if (timer > 0 || isResending) return;
    setIsResending(true);
    setOtp(["", "", "", "", "", ""]);

    try {
      if (byPass) {
        setAadhaarRequestId(Math.floor(Math.random() * 1000));
        setTimer(30);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setIsResending(false);
        return;
      }

      const response = await axios.post(
        "https://api.quickekyc.com/api/v1/aadhaar-v2/generate-otp",
        {
          key: QUICKEKYC_API_KEY,
          id_number: ownerAadhaar,
        },
        {
          headers: { "Content-Type": "application/json" },
          timeout: 15000,
        }
      );

      if (response.data.status === "success") {
        setAadhaarRequestId(response.data.request_id);
        setTimer(30);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      setFieldError(
        "resend",
        error.response?.data?.message || "Failed to resend"
      );
    } finally {
      setIsResending(false);
    }
  };

  const handleOtpChange = (value, index) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };



  const pickDocument = async (field) => {
    if (
      ["vehicleFront", "vehicleBack", "vehicleInterior"].includes(field) &&
      !docs[field]
    ) {
      setDemoModal({
        visible: true,
        image: DEMO_IMAGES[field],
        title: getDocLabel(field),
      });
      setTimeout(() => {
        setDemoModal({ visible: false, image: null, title: "" });
        openImagePicker(field);
      }, 2000);
    } else {
      openImagePicker(field);
    }
  };

  const openImagePicker = async (field) => {
    try {
      Alert.alert(
        `Upload ${getDocLabel(field)}`,
        "Choose source",
        [
          {
            text: "Camera",
            onPress: async () => {
              try {
                const { status } =
                  await ImagePicker.requestCameraPermissionsAsync();
                if (status !== "granted") {
                  return Alert.alert(
                    "Permission Required",
                    "Camera permission is needed to take photos"
                  );
                }

                const result = await ImagePicker.launchCameraAsync({
                  quality: 0.8,
                  allowsEditing: true,
                  aspect: [4, 3],
                });

                if (!result.canceled && result.assets?.[0]) {
                  handleImagePicked(result, field);
                }
              } catch (error) {
                console.error("Camera error:", error);
                Alert.alert("Error", "Failed to open camera");
              }
            },
          },
          {
            text: "Gallery",
            onPress: async () => {
              try {
                const { status } =
                  await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (status !== "granted") {
                  return Alert.alert(
                    "Permission Required",
                    "Gallery permission is needed to select photos"
                  );
                }

                const result = await ImagePicker.launchImageLibraryAsync({
                  quality: 0.8,
                  allowsEditing: true,
                  aspect: [4, 3],
                  mediaTypes: ImagePicker.MediaTypeOptions.Images,
                });

                if (!result.canceled && result.assets?.[0]) {
                  handleImagePicked(result, field);
                }
              } catch (error) {
                console.error("Gallery error:", error);
                Alert.alert("Error", "Failed to open gallery");
              }
            },
          },
          { text: "Cancel", style: "cancel" },
        ],
        { cancelable: true }
      );
    } catch (error) {
      console.error("Image picker error:", error);
      Alert.alert("Error", "Failed to open image picker");
    }
  };

  const handleImagePicked = (result, field) => {
    try {
      const uri = result.assets[0].uri;
      const fileName = uri.split("/").pop() || `${field}.jpg`;

      setDocs((prev) => ({
        ...prev,
        [field]: {
          uri,
          name: fileName,
          mimeType: "image/jpeg",
        },
      }));

      clearFieldError(field);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Error handling picked image:", error);
      Alert.alert("Error", "Failed to process image");
    }
  };

  const getDocLabel = (field) => {
    const labels = {
      rcBook: "RC Book (Detail Page)",
      insurance: "Insurance",
      permit: "Permit",
      vehicleFront: "Front Photo",
      vehicleBack: "Back Photo",
      vehicleInterior: "Interior (Seat Covers)",
    };
    return labels[field] || field;
  };

  const handleDateChange = (event, selectedDate) => {
    if (event.type === "set" && selectedDate) {
      const formatted = selectedDate.toISOString().split("T")[0];
      setDates((prev) => ({ ...prev, [showDatePicker.key]: formatted }));
      clearFieldError(showDatePicker.key);
    }
    setShowDatePicker({ key: null, visible: false });
  };

  const setFieldError = (field, msg) =>
    setErrors((prev) => ({ ...prev, [field]: msg }));
  const clearFieldError = (field) =>
    setErrors((prev) => {
      const e = { ...prev };
      delete e[field];
      return e;
    });
  const renderError = (field) =>
    errors[field] ? <Text style={styles.error}>{errors[field]}</Text> : null;

  const validateForm = () => {
    const e = {};
    if (!isRcVerified) e.rc = "Please verify RC first";
    if (!vehicleType) e.vehicleType = "Select type";
    if (!vehicleNumber.trim()) e.vehicleNumber = "Enter number";
    if (!dates.regDate) e.regDate = "Select reg date";
    if (!dates.insuranceExpiry) e.insuranceExpiry = "Select expiry";
    if (!dates.permitExpiry) e.permitExpiry = "Select permit expiry";
    if (!docs.permit) e.permit = "Upload permit";
    if (!docs.vehicleFront) e.vehicleFront = "Upload front";
    if (!docs.vehicleBack) e.vehicleBack = "Upload back";
    if (!docs.vehicleInterior) e.vehicleInterior = "Upload interior";
    setErrors(e);
    return Object.keys(e).length === 0;
  };
  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert("Incomplete Form", "Please fill all required fields");
      return;
    }

    setLoading(true);

    try {
      const riderId = (await getData("driverid")) || driverId;
      if (!riderId) {
        Alert.alert("Error", "Driver ID missing");
        return;
      }

      const formData = new FormData();
      // formData.append("brandId", selectedBrand._id);
      formData.append("maker_model", rcData.maker_model);
      formData.append("maker_description",  rcData.maker_description);
      formData.append('fuel_type', rcData.fuel_type);
      formData.append("color", rcData.color); 
      formData.append("norms_type", rcData.norms_type);
      formData.append("vehicleType", vehicleType);
      formData.append("vehicleNumber", vehicleNumber.toUpperCase());
      formData.append("registrationDate", dates.regDate);
      formData.append("insuranceExpiry", dates.insuranceExpiry);
      formData.append("permitExpiry", dates.permitExpiry);
      formData.append("vehicleOwnership", vehicleOwnership);

      // Append RC data
      if (rcData) {
        formData.append("rcData", JSON.stringify(rcData));
      }

      // Only upload permit and vehicle photos
      ["permit", "vehicleFront", "vehicleBack", "vehicleInterior"].forEach((key) => {
        if (docs[key]) {
          formData.append(key, {
            uri: docs[key].uri,
            type: docs[key].mimeType,
            name: docs[key].name,
          });
        }
      });

      const res = await axios.post(
        `${API_URL_APP}/api/v1/add-vehicle-details/${riderId}`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      if (res.data.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("Success", "Vehicle added successfully!", [
          {
            text: "OK",
            onPress: () =>
              navigation.navigate("bankAdd", {
                driverId: res.data.driverId || riderId,
              }),
          },
        ]);
      }
    } catch (err) {
      console.error("Submit error:", err);
      Alert.alert("Error", err.response?.data?.message || "Failed to add vehicle. Please try again.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  if (brandsLoading) {
    return (
      <>
        <BackWithLogo />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading brands...</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <BackWithLogo />
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Progress */}
        <View style={styles.progressBar}>
          {["Profile", "Docs", "Vehicle", "Bank"].map((label, i) => (
            <View key={i} style={styles.step}>
              <View style={[styles.dot, i === 2 && styles.dotActive]} />
              <Text
                style={[styles.stepLabel, i === 2 && styles.stepLabelActive]}
              >
                {label}
              </Text>
            </View>
          ))}
        </View>

        <Text style={styles.title}>Add Your Vehicle</Text>
        <Text style={styles.subtitle}>Verify RC and provide details</Text>

        {/* Vehicle Ownership */}
        {!isRcVerified && (
          <>
            <Text style={styles.label}>Vehicle Ownership</Text>
            <View style={styles.pickerBox}>
              <Picker
                selectedValue={vehicleOwnership}
                onValueChange={(v) => {
                  setVehicleOwnership(v);
                  clearFieldError("ownership");
                }}
              >
                <Picker.Item label="Select Ownership Type" value="" />
                <Picker.Item label="Vehicle Owner" value="owner" />
                <Picker.Item label="Driver" value="driver" />
              </Picker>
            </View>
            {renderError("ownership")}

            {/* RC Number */}
            {vehicleOwnership && (
              <>
                <Text style={styles.label}>RC Number</Text>
                <View style={styles.row}>
                  <TextInput
                    placeholder="DL01AB1234"
                    value={rcNumber}
                    onChangeText={(v) => {
                      setRcNumber(v.toUpperCase());
                      clearFieldError("rcNumber");
                    }}
                    style={[styles.input, { flex: 1, marginBottom: 0 }]}
                    autoCapitalize="characters"
                  />
                  <TouchableOpacity
                    style={styles.verifyBtn}
                    onPress={handleVerifyRC}
                    disabled={isVerifyingRc}
                  >
                    {isVerifyingRc ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.verifyBtnText}>Verify</Text>
                    )}
                  </TouchableOpacity>
                </View>
                {renderError("rcNumber")}
                {renderError("rc")}
              </>
            )}
          </>
        )}

        {/* RC Verified Badge */}
        {isRcVerified && (
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark-circle" size={24} color="#10b981" />
            <Text style={styles.verifiedText}>RC Verified</Text>
          </View>
        )}

        {/* Show form only after RC verification */}
        {isRcVerified && (
          <>
            {/* Brand */}
            <Text style={styles.label}>Brand</Text>
            {/* <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.brandScroll}
            >
              {brands.map((b) => (
                <TouchableOpacity
                  key={b._id}
                  onPress={() => handleBrandSelect(b)}
                  style={[
                    styles.brandCard,
                    selectedBrand?._id === b._id && styles.brandCardActive,
                  ]}
                >
                  <Image
                    source={{ uri: b.brandLogo?.url }}
                    style={styles.brandImg}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView> */}
            {renderError("brand")}

            {/* Model & Type */}
            <View style={styles.row}>
              <View style={styles.half}>
                <Text style={styles.label}>Model</Text>
                <View style={styles.pickerBox}>
                  <Picker
                    selectedValue={vehicleName}
                    onValueChange={(v) => {
                      setVehicleName(v);
                      clearFieldError("vehicleName");
                    }}
                    enabled={vehicleNames.length > 0}
                  >
                    <Picker.Item label="Select" value="" />
                    {vehicleNames.map((n, i) => (
                      <Picker.Item key={i} label={n} value={n} />
                    ))}
                  </Picker>
                </View>
                {renderError("vehicleName")}
              </View>

              <View style={styles.half}>
                <Text style={styles.label}>Type</Text>
                <View style={styles.pickerBox}>
                  <Picker
                    selectedValue={vehicleType}
                    onValueChange={(v) => {
                      setVehicleType(v);
                      clearFieldError("vehicleType");
                    }}
                  >
                    <Picker.Item label="Select" value="" />
                    {VEHICLE_TYPES.map((t) => (
                      <Picker.Item key={t} label={t} value={t} />
                    ))}
                  </Picker>
                </View>
                {renderError("vehicleType")}
              </View>
            </View>

            {/* Number */}
            <Text style={styles.label}>Number Plate</Text>
            <TextInput
              placeholder="AN01J 8844"
              value={vehicleNumber}
              onChangeText={(v) => {
                setVehicleNumber(v.toUpperCase());
                clearFieldError("vehicleNumber");
              }}
              style={styles.input}
              autoCapitalize="characters"
              editable={false}
            />
            {renderError("vehicleNumber")}

            {/* Dates */}
            {[
              { key: "regDate", label: "Registration Date" },
              { key: "insuranceExpiry", label: "Insurance Expiry" },
              { key: "permitExpiry", label: "Permit Expiry" },
            ].map(({ key, label }) => (
              <View key={key}>
                <Text style={styles.label}>{label}</Text>
                <TouchableOpacity
                  style={styles.dateBox}
                  onPress={() => setShowDatePicker({ key, visible: true })}
                >
                  <Text
                    style={[styles.dateText, !dates[key] && styles.placeholder]}
                  >
                    {dates[key]
                      ? new Date(dates[key]).toLocaleDateString("en-GB")
                      : "DD-MM-YYYY"}
                  </Text>
                  <Ionicons name="calendar" size={20} color={Colors.primary} />
                </TouchableOpacity>
                {renderError(key)}
              </View>
            ))}

            {/* Permit Upload Only */}
            <Text style={styles.section}>Upload Permit</Text>
            <View>
              <Text style={styles.label}>Permit Document</Text>
              <TouchableOpacity
                style={styles.uploadBtn}
                onPress={() => pickDocument("permit")}
              >
                {docs.permit ? (
                  <Image source={{ uri: docs.permit.uri }} style={styles.uploadImg} />
                ) : (
                  <View style={styles.uploadPlaceholder}>
                    <Ionicons name="document-attach" size={28} color="#999" />
                    <Text style={styles.uploadText}>Tap to Upload Permit</Text>
                  </View>
                )}
              </TouchableOpacity>
              {renderError("permit")}
            </View>

            {/* Photos */}
            <Text style={styles.section}>Vehicle Photos</Text>
            <View style={styles.photoGrid}>
              {["vehicleFront", "vehicleBack", "vehicleInterior"].map((f) => (
                <View key={f} style={styles.photoItem}>
                  <Text style={styles.photoLabel}>{getDocLabel(f)}</Text>
                  <TouchableOpacity
                    style={styles.photoBtn}
                    onPress={() => pickDocument(f)}
                  >
                    {docs[f] ? (
                      <Image
                        source={{ uri: docs[f].uri }}
                        style={styles.photoImg}
                      />
                    ) : (
                      <View style={styles.photoPlaceholder}>
                        <Ionicons name="camera" size={24} color="#999" />
                        <Text style={styles.photoHint}>Tap to add</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                  {renderError(f)}
                </View>
              ))}
            </View>

            {/* Submit */}
            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>Submit & Continue</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* Date Picker */}
      {showDatePicker.visible && (
        <DateTimePicker
          mode="date"
          value={
            dates[showDatePicker.key]
              ? new Date(dates[showDatePicker.key])
              : new Date()
          }
          minimumDate={
            showDatePicker.key === "regDate" ? undefined : new Date()
          }
          onChange={handleDateChange}
        />
      )}

      {/* Aadhaar Input Modal */}
      <Modal visible={showAadhaarModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.aadhaarCard}>
            <Text style={styles.modalTitle}>Verify Vehicle Owner</Text>
            <Text style={styles.modalSubtitle}>
              Enter the vehicle owner's Aadhaar number
            </Text>

            <TextInput
              placeholder="Enter 12-digit Aadhaar"
              value={ownerAadhaar}
              onChangeText={(v) => {
                setOwnerAadhaar(v.replace(/\D/g, ""));
                clearFieldError("ownerAadhaar");
              }}
              keyboardType="numeric"
              maxLength={12}
              style={styles.aadhaarInput}
            />
            {renderError("ownerAadhaar")}

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowAadhaarModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalVerifyBtn}
                onPress={handleGenerateAadhaarOTP}
                disabled={isVerifying}
              >
                {isVerifying ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalVerifyText}>Send OTP</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* OTP Modal */}
      <Modal visible={showOtpModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.otpCard}>
            <Text style={styles.modalTitle}>Verify OTP</Text>
            <Text style={styles.modalSubtitle}>
              Enter the 6-digit OTP sent to Aadhaar-linked mobile
            </Text>

            <View style={styles.otpContainer}>
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => (otpRefs.current[index] = ref)}
                  value={digit}
                  onChangeText={(v) => handleOtpChange(v, index)}
                  onKeyPress={({ nativeEvent }) => {
                    if (nativeEvent.key === "Backspace" && !digit && index > 0) {
                      otpRefs.current[index - 1]?.focus();
                    }
                  }}
                  keyboardType="numeric"
                  maxLength={1}
                  style={styles.otpBox}
                />
              ))}
            </View>
            {renderError("otp")}

            {/* Resend Timer */}
            <View style={styles.resendRow}>
              {timer > 0 ? (
                <Text style={styles.timerText}>Resend OTP in {timer}s</Text>
              ) : (
                <TouchableOpacity onPress={handleResendOtp} disabled={isResending}>
                  <Text style={styles.resendText}>
                    {isResending ? "Sending..." : "Resend OTP"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => {
                  setShowOtpModal(false);
                  setShowAadhaarModal(true);
                }}
              >
                <Text style={styles.modalCancelText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalVerifyBtn}
                onPress={handleVerifyAadhaarOtp}
                disabled={isVerifying}
              >
                {isVerifying ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalVerifyText}>Verify</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Demo Modal */}
      <Modal visible={demoModal.visible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.demoCard}>
            <Text style={styles.demoTitle}>Example Photo</Text>
            <Text style={styles.demoSubtitle}>{demoModal.title}</Text>
            <Image source={demoModal.image} style={styles.demoImg} />
            <Text style={styles.demoHint}>Take a clear, well-lit photo like this</Text>
            <TouchableOpacity
              style={styles.closeDemo}
              onPress={() => {
                setDemoModal({ visible: false, image: null, title: "" });
              }}
            >
              <Text style={styles.closeText}>Got it!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}


const styles = {
  container: { padding: 20, backgroundColor: "#f9f9f9", paddingBottom: 40 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
  },
  loadingText: { marginTop: 10, color: "#666" },

  progressBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  step: { alignItems: "center" },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#ddd",
    marginBottom: 4,
  },
  dotActive: { backgroundColor: Colors.primary },
  stepLabel: { fontSize: 12, color: "#999" },
  stepLabelActive: { color: Colors.primary, fontWeight: "600" },

  title: { fontSize: 26, fontWeight: "bold", color: "#222", marginBottom: 6 },
  subtitle: { fontSize: 15, color: "#666", marginBottom: 20 },
  section: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#222",
    marginTop: 24,
    marginBottom: 12,
  },
  label: { fontSize: 15, fontWeight: "600", color: "#333", marginBottom: 6, marginTop: 8 },

  // Verified Badge
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#d1fae5",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  verifiedText: { color: "#065f46", fontWeight: "600", fontSize: 15 },

  // Verify Button
  verifyBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 14,
    marginLeft: 8,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 100,
  },
  verifyBtnText: { color: "#fff", fontWeight: "600", fontSize: 15 },

  // Brand
  brandScroll: { marginBottom: 10 },
  brandCard: {
    width: 70,
    height: 70,
    borderRadius: 14,
    backgroundColor: "#fff",
    marginRight: 12,
    padding: 10,
    borderWidth: 2,
    borderColor: "transparent",
    elevation: 2,
  },
  brandCardActive: { borderColor: Colors.primary },
  brandImg: { width: "100%", height: "100%", resizeMode: "contain" },

  // Row
  row: { flexDirection: "row", gap: 12, marginBottom: 6, alignItems: "flex-start" },
  half: { flex: 1 },

  // Inputs
  input: {
    borderWidth: 1.5,
    borderColor: "#ddd",
    borderRadius: 14,
    padding: 16,
    backgroundColor: "#fff",
    fontSize: 16,
    elevation: 1,
    marginBottom: 8,
  },
  pickerBox: {
    borderWidth: 1.5,
    borderColor: "#ddd",
    borderRadius: 14,
    backgroundColor: "#fff",
    overflow: "hidden",
    elevation: 1,
  },
  dateBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#ddd",
    borderRadius: 14,
    padding: 16,
    backgroundColor: "#fff",
    elevation: 1,
    marginBottom: 8,
  },
  dateText: { fontSize: 16, color: "#222" },
  placeholder: { color: "#aaa" },

  // Uploads
  uploadBtn: {
    height: 90,
    borderWidth: 2,
    borderColor: "#ddd",
    borderStyle: "dashed",
    borderRadius: 14,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  uploadImg: { width: "100%", height: "100%", borderRadius: 12 },
  uploadPlaceholder: { alignItems: "center" },
  uploadText: { marginTop: 6, color: "#999", fontSize: 14 },

  // Photos
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
  },
  photoItem: { width: "31%" },
  photoLabel: {
    fontSize: 13,
    color: "#555",
    marginBottom: 4,
    textAlign: "center",
  },
  photoBtn: {
    height: 100,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#eee",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  photoImg: { width: "100%", height: "100%" },
  photoPlaceholder: { alignItems: "center" },
  photoHint: { fontSize: 11, color: "#999", marginTop: 4 },

  // Submit
  submitBtn: {
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 30,
    alignItems: "center",
    marginTop: 20,
    elevation: 3,
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitText: { color: "#fff", fontSize: 17, fontWeight: "bold" },

  error: { color: Colors.error, fontSize: 13, marginTop: 4, marginLeft: 4 },

  // Modal Overlay
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  // Aadhaar Card
  aadhaarCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    elevation: 10,
  },
  modalTitle: { fontSize: 22, fontWeight: "bold", marginBottom: 8, color: "#222" },
  modalSubtitle: { fontSize: 14, color: "#666", marginBottom: 20 },
  aadhaarInput: {
    borderWidth: 1.5,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 8,
  },

  // OTP Card
  otpCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    elevation: 10,
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 20,
    gap: 8,
  },
  otpBox: {
    flex: 1,
    borderWidth: 2,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 16,
    fontSize: 20,
    textAlign: "center",
    fontWeight: "bold",
  },

  // Resend
  resendRow: { alignItems: "center", marginBottom: 20 },
  timerText: { color: "#666", fontSize: 14 },
  resendText: { color: Colors.primary, fontSize: 14, fontWeight: "600" },

  // Modal Buttons
  modalBtnRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  modalCancelBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    padding: 14,
    borderRadius: 30,
    alignItems: "center",
  },
  modalCancelText: { color: Colors.primary, fontWeight: "600", fontSize: 15 },
  modalVerifyBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    padding: 14,
    borderRadius: 30,
    alignItems: "center",
  },
  modalVerifyText: { color: "#fff", fontWeight: "600", fontSize: 15 },

  // Demo Modal
  demoCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    width: "85%",
    elevation: 10,
  },
  demoTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 4, color: "#222" },
  demoSubtitle: { fontSize: 14, color: "#666", marginBottom: 12 },
  demoImg: { width: 240, height: 160, borderRadius: 12, marginVertical: 12 },
  demoHint: { color: "#666", fontSize: 14, marginBottom: 20, textAlign: "center" },
  closeDemo: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 30,
  },
  closeText: { color: "#fff", fontWeight: "600", fontSize: 16 },
};