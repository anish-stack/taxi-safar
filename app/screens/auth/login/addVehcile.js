import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Image,
  ScrollView,
  Modal,
  ActivityIndicator,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import axios from "axios";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import * as Application from "expo-application";
import { Colors } from "../../../constant/ui";
import BackWithLogo from "../../common/back_with_logo";
import { API_URL_APP } from "../../../constant/api";
import { useRoute } from "@react-navigation/native";
import { getData, saveData } from "../../../utils/storage";
import { UniversalAlert } from "../../common/UniversalAlert";
import useSettings from "../../../hooks/Settings";
import { SafeAreaView } from "react-native-safe-area-context";
import { scale, verticalScale, moderateScale } from "react-native-size-matters";

const MAX_FILE_SIZE = 2 * 1024 * 1024;

// RC Status Constants
const RC_STATUS = {
  NOT_VERIFIED: "NOT_VERIFIED",
  VERIFIED: "VERIFIED",
  PENDING_VERIFICATION: "PENDING_VERIFICATION",
  FAILED: "FAILED",
};

const RELATIONS = [
  { label: "Father", value: "father" },
  { label: "Mother", value: "mother" },
  { label: "Brother", value: "brother" },
  { label: "Sister", value: "sister" },
  { label: "Spouse", value: "spouse" },
  { label: "Son", value: "son" },
  { label: "Daughter", value: "daughter" },
  { label: "Uncle", value: "uncle" },
  { label: "Aunt", value: "aunt" },
  { label: "Friend", value: "friend" },
  { label: "Other", value: "other" },
];

export default function AddVehicle({ navigation }) {
  const route = useRoute();
  const { driverId, fromAll, mobile } = route.params || {};

  const { data, fetchSettings } = useSettings({ autoFetch: true });

  const [rcNumber, setRcNumber] = useState("");
  const [rcData, setRcData] = useState(null);
  const [rcStatus, setRcStatus] = useState(RC_STATUS.NOT_VERIFIED);
  const [isVerifyingRc, setIsVerifyingRc] = useState(false);
  const [vehicleRates, setVehicleRates] = useState([]);

  const [vehicleType, setVehicleType] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [dates, setDates] = useState({
    regDate: null,
    insuranceExpiry: null,
    permitExpiry: null,
  });

  const [docs, setDocs] = useState({
    rcFront: null,
    rcBack: null,
    insurance: null,
    permit: null,
    vehicleFront: null,
    vehicleBack: null,
    vehicleInterior: null,
  });

  const [showRelationModal, setShowRelationModal] = useState(false);
  const [ownerRelation, setOwnerRelation] = useState("");
  const [ownerAadhaar, setOwnerAadhaar] = useState("");
  const [showOwnerAadhaarModal, setShowOwnerAadhaarModal] = useState(false);
  const [showOwnerOtpModal, setShowOwnerOtpModal] = useState(false);
  const [ownerOtp, setOwnerOtp] = useState("");
  const [ownerAadhaarRequestId, setOwnerAadhaarRequestId] = useState("");
  const [isVerifyingOwner, setIsVerifyingOwner] = useState(false);
  const [showLegalDocUpload, setShowLegalDocUpload] = useState(false);

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

  const isByPass =
    data?.data?.ByPassApi === true || data?.ByPassApi === true ? true : false;

  const [showDatePicker, setShowDatePicker] = useState({
    key: null,
    visible: false,
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    type: "success",
    title: "",
    message: "",
    onPrimaryPress: () => setAlertVisible(false),
  });

  const [showBackConfirmation, setShowBackConfirmation] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const vehicles = useMemo(() => {
    if (vehicleRates.length === 0) return [];
    return vehicleRates.sort((a, b) => a.sortOrder - b.sortOrder);
  }, [vehicleRates]);

  const showAlert = (type, title, message, onPrimaryPress = null) => {
    setAlertConfig({
      type,
      title,
      message,
      primaryButton: "OK",
      onPrimaryPress: () => {
        if (onPrimaryPress) {
          onPrimaryPress();
        }
        setAlertVisible(false);
      },
    });
    setAlertVisible(true);
  };

  // Track unsaved changes
  useEffect(() => {
    const hasData =
      rcNumber ||
      vehicleType ||
      vehicleNumber ||
      dates.permitExpiry ||
      Object.values(docs).some((doc) => doc !== null);
    setHasUnsavedChanges(hasData);
  }, [rcNumber, vehicleType, vehicleNumber, dates, docs]);

  // Handle back button press
  const handleBackPress = () => {
    if (hasUnsavedChanges) {
      setShowBackConfirmation(true);
    } else {
      navigation.goBack();
    }
  };

  const handleConfirmBack = async (saveData) => {
    if (saveData) {
      // Persist data
      const formState = {
        rcNumber,
        rcData,
        rcStatus,
        vehicleType,
        vehicleNumber,
        dates,
        timestamp: Date.now(),
      };
      await saveData("vehicleFormState", JSON.stringify(formState));
      showAlert(
        "success",
        "Data Saved",
        "Your progress has been saved.",
        () => {
          navigation.goBack();
        }
      );
    } else {
      // Clear data
      await saveData("vehicleFormState", null);
      navigation.goBack();
    }
    setShowBackConfirmation(false);
  };

  // Load saved data on mount
  useEffect(() => {
    (async () => {
      const savedState = await getData("vehicleFormState");
      if (savedState) {
        try {
          const parsed = JSON.parse(savedState);
          const hoursSinceLastSave =
            (Date.now() - parsed.timestamp) / (1000 * 60 * 60);

          if (hoursSinceLastSave < 24) {
            setRcNumber(parsed.rcNumber || "");
            setRcData(parsed.rcData || null);
            setRcStatus(parsed.rcStatus || RC_STATUS.NOT_VERIFIED);
            setVehicleType(parsed.vehicleType || "");
            setVehicleNumber(parsed.vehicleNumber || "");
            setDates(parsed.dates || {});
            showAlert(
              "info",
              "Welcome Back",
              "Your previous progress has been restored."
            );
          } else {
            await saveData("vehicleFormState", null);
          }
        } catch (error) {
          console.error("Failed to restore form state:", error);
        }
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      await ImagePicker.requestCameraPermissionsAsync();
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    })();
  }, []);

  const fetchRateConfiguration = async () => {
    try {
      const response = await axios.get(
        `${API_URL_APP}/api/v1/rate-configuration`
      );

      if (response.data.success) {
        const config = response.data.data;
        const activeVehicles = config.vehicleRates
          .filter((v) => v.isActive)
          .sort((a, b) => a.sortOrder - b.sortOrder);

        setVehicleRates(activeVehicles);
      }
    } catch (error) {
      console.error("Failed to fetch rate configuration:", error);
      setVehicleRates([
        {
          vehicleKey: "mini",
          vehicleName: "Mini",
          displayName: "Mini",
          seating: "4+1",
          example: "WagonR",
          maxRatePerKm: 22,
          minRatePerKm: 10,
          stopChargePerStop: 50,
          allowedInAllInclusive: true,
          sortOrder: 1,
        },
        {
          vehicleKey: "sedan",
          vehicleName: "Sedan",
          displayName: "Sedan",
          seating: "4+1",
          example: "Swift Dzire",
          maxRatePerKm: 25,
          minRatePerKm: 12,
          stopChargePerStop: 75,
          allowedInAllInclusive: true,
          sortOrder: 2,
        },
        {
          vehicleKey: "suv",
          vehicleName: "SUV",
          displayName: "SUV",
          seating: "6+1",
          example: "Ertiga",
          maxRatePerKm: 30,
          minRatePerKm: 15,
          stopChargePerStop: 100,
          allowedInAllInclusive: true,
          sortOrder: 3,
        },
        {
          vehicleKey: "prime_suv",
          vehicleName: "Prime SUV",
          displayName: "Prime SUV",
          seating: "6+1",
          example: "Innova Crysta",
          maxRatePerKm: 40,
          minRatePerKm: 20,
          stopChargePerStop: 150,
          allowedInAllInclusive: false,
          sortOrder: 4,
        },
      ]);
    }
  };

  useEffect(() => {
    fetchRateConfiguration();
  }, []);
  useEffect(() => {
    if (rcData?.rcNumber) {
      setVehicleNumber(rcData.rcNumber || "");
    }
  }, [rcData]);

  const handleVerifyRC = async () => {
    fetchSettings();
    fetchRateConfiguration();

    if (!rcNumber.trim()) {
      return showAlert("error", "Invalid", "Enter RC number");
    }

    setIsVerifyingRc(true);

    const deviceId = Application.getAndroidId();

    try {
      const res = await axios.post(`${API_URL_APP}/api/v1/rc-verify`, {
        rcNumber: rcNumber.toUpperCase().trim(),
        isByPass,
        driverId,
        deviceId,
      });

      if (res.data.success) {
        const data = res.data.rcData;
        console.log("res.data.manualVerification", res.data.manualVerification);
        // Handle manual verification scenario
        if (res.data.manualVerification === true) {
          setRcData(data);
          setRcStatus(RC_STATUS.PENDING_VERIFICATION);
          fillFormFromRC(data);

          showAlert(
            "info",
            "Manual Verification Required",
            res.data.message ||
              "We are unable to verify your RC at the moment. Please continue. We will verify your RC within the next 24 hours. Please upload it."
          );
        } else {
          // Successfully verified
          setRcData(data);
          setRcStatus(RC_STATUS.VERIFIED);
          fillFormFromRC(data);

          showAlert("success", "RC Verified", "Vehicle details loaded");
        }
      }
    } catch (err) {
      //    rcData: rcInfo,
      // driverName: nameOfDriver,
      // rcOwnerName: nameOnRc,
      const rcData = err.response?.data?.rcData;
      const nameOfDriver = err.response?.data?.driverName;
      const nameOnRc = err.response?.data?.rcOwnerName;
      const errorData = err.response?.data;

      if (rcData) {
        console.log("rcData from error:", rcData);
        setRcData(errorData.rcData);
      }
      setVehicleNumber(rcNumber);

      if (errorData?.errorCode === "RC_NAME_MISMATCH") {
        setRcStatus(RC_STATUS.FAILED);

        showAlert(
          "error",
          "Name Mismatch Detected",
          `RC Owner: ${errorData.rcOwnerName}\nDriver: ${errorData.driverName}\n\nPlease verify the vehicle owner's relationship.`,
          () => {
            setShowRelationModal(true);
          }
        );
        return;
      }

      // Check for bike detection error
      if (
        errorData?.errorType === "BIKE_NOT_ALLOWED" ||
        errorData?.bikeDetected
      ) {
        setRcStatus(RC_STATUS.FAILED);
        showAlert(
          "error",
          "Two-Wheeler Not Allowed",
          "Two-wheelers are not allowed. Please register a car."
        );
      } else {
        setRcStatus(RC_STATUS.FAILED);
        showAlert(
          "error",
          "Verification Failed",
          errorData?.message || "Failed to verify RC"
        );
      }
    } finally {
      setIsVerifyingRc(false);
    }
  };

  const handleRelationSelect = () => {
    if (!ownerRelation) {
      return showAlert(
        "error",
        "Select Relation",
        "Please select vehicle owner's relation"
      );
    }

    setShowRelationModal(false);

    if (ownerRelation === "other") {
      // Show legal document upload
      setShowLegalDocUpload(true);
      setRcStatus(RC_STATUS.PENDING_VERIFICATION);
      setVehicleNumber(rcNumber);
      showAlert(
        "info",
        "Legal Document Required",
        "Please upload a legal document proving your authorization to use this vehicle."
      );
    } else {
      // Ask for owner's Aadhaar
      setShowOwnerAadhaarModal(true);
    }
  };

  const handleGenerateOwnerAadhaarOTP = async () => {
    if (!/^\d{12}$/.test(ownerAadhaar)) {
      return showAlert(
        "error",
        "Invalid Aadhaar",
        "Enter 12-digit Aadhaar number"
      );
    }

    setIsVerifyingOwner(true);
    const deviceId = Application.getAndroidId();

    try {
      const res = await axios.post(
        `${API_URL_APP}/api/v1/send-otp-on-aadhar-for-rc`,
        {
          aadhaarNumber: ownerAadhaar,
          device_id: deviceId,
        }
      );

      if (res.data.success) {
        setOwnerAadhaarRequestId(res.data.request_id);
        setShowOwnerAadhaarModal(false);
        setShowOwnerOtpModal(true);
        setOwnerOtp("");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        showAlert("error", "Failed", res.data.message);
      }
    } catch (err) {
      showAlert(
        "error",
        "Error",
        err.response?.data?.message || "Failed to send OTP"
      );
    } finally {
      setIsVerifyingOwner(false);
    }
  };

  const handleVerifyOwnerAadhaarOtp = async () => {
    if (ownerOtp.length !== 6) {
      return showAlert("error", "Invalid OTP", "Enter 6 digits");
    }

    setIsVerifyingOwner(true);
    const deviceId = Application.getAndroidId();

    try {
      const { data } = await axios.post(
        `${API_URL_APP}/api/v1/verify-otp-on-aadhar-for-rc`,
        {
          request_id: ownerAadhaarRequestId,
          otp: ownerOtp,
          deviceId,
          aadhaarNumber: ownerAadhaar,
          rcOwnerName: rcData?.owner_name,
          driverId,
          vehicleNumber,
          rcNumber,
          relation: ownerRelation,
        }
      );

      if (!data.success) {
        return showAlert("error", "OTP Verification Failed", data.message);
      }

      // Close OTP modal
      setShowOwnerOtpModal(false);

      if (data.aadhaar_verified) {
        if (data.name_matched) {
          setRcStatus(RC_STATUS.VERIFIED);
          fillFormFromRC(rcData);

          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          showAlert(
            "success",
            "RC Verified!",
            "Vehicle owner's Aadhaar verified successfully!"
          );
        } else {
          showAlert(
            "warning",
            "Name Mismatch",
            `Aadhaar verified, but name did not fully match.\nRC Owner: ${data.rc_owner_name}\nAadhaar Name: ${data.aadhaar_name}`,
            () => {
              setShowOwnerAadhaarModal(true);
              setOwnerAadhaar("");
              setOwnerOtp("");
              setOwnerAadhaarRequestId("");
              setRcStatus(RC_STATUS.FAILED);
              setShowOwnerOtpModal(false);
            }
          );
        }
      }
    } catch (err) {
      showAlert(
        "error",
        "Verification Error",
        err.response?.data?.message || "Something went wrong"
      );
    } finally {
      setIsVerifyingOwner(false);
    }
  };

  const fillFormFromRC = async (rcInfo) => {
    setVehicleNumber(rcInfo.rcNumber || rcInfo.rc_number || "");

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

  const getFileSize = async (uri) => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      return blob.size;
    } catch (error) {
      return 0;
    }
  };

  const pickImage = async (key, source = "library") => {
    try {
      let result;

      const options = {
        quality: 0.8,
        allowsEditing: false,
      };

      if (source === "camera") {
        result = await ImagePicker.launchCameraAsync(options);
      } else {
        result = await ImagePicker.launchImageLibraryAsync(options);
      }

      if (!result.canceled && result.assets[0]) {
        const { uri } = result.assets[0];

        const fileSize = await getFileSize(uri);

        if (fileSize > MAX_FILE_SIZE) {
          return showAlert(
            "error",
            "File Too Large",
            "Image size must be less than 2MB. Please select a smaller image or compress it."
          );
        }

        setDocs((prev) => ({
          ...prev,
          [key]: { uri, name: uri.split("/").pop(), mimeType: "image/jpeg" },
        }));

        setErrors((prev) => {
          const e = { ...prev };
          delete e[key];
          return e;
        });

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      showAlert("error", "Error", "Failed to pick image");
    }
  };

  const showImagePickerOptions = (key, hasDemo = false) => {
    const options = [
      {
        text: "Camera",
        onPress: () => pickImage(key, "camera"),
      },
      {
        text: "Gallery",
        onPress: () => pickImage(key, "library"),
      },
    ];

    if (hasDemo) {
      options.push({
        text: "View Demo",
        onPress: () => showDemoImage(key),
      });
    }

    options.push({ text: "Cancel", onPress: () => {}, style: "cancel" });

    Alert.alert(
      "Choose Photo Source",
      "Select how to upload the photo",
      options
    );
  };

  const showDemoImage = (field) => {
    if (DEMO_IMAGES[field]) {
      setDemoModal({
        visible: true,
        image: DEMO_IMAGES[field],
        title: getDocLabel(field),
      });
    }
  };

  const getDocLabel = (field) => {
    const labels = {
      rcFront: "RC Front",
      rcBack: "RC Back",
      insurance: "Insurance Certificate",
      permit: "Authorization Permit",
      vehicleFront: "Vehicle Front Photo",
      vehicleBack: "Vehicle Back Photo",
      vehicleInterior: "Interior (Seat Covers)",
    };
    return labels[field] || field;
  };

  const validateForm = () => {
    const e = {};
    if (!vehicleType) e.vehicleType = "Select vehicle type";
    if (!dates.permitExpiry) e.permitExpiry = "Select permit expiry";

    // RC Upload is mandatory for PENDING_VERIFICATION status
    if (rcStatus === RC_STATUS.PENDING_VERIFICATION) {
      if (!docs.rcFront)
        e.rcFront = "Upload RC front (Required for verification)";
      if (!docs.rcBack) e.rcBack = "Upload RC back (Required for verification)";
    }

    if (!docs.vehicleFront) e.vehicleFront = "Upload front photo";
    if (!docs.vehicleBack) e.vehicleBack = "Upload back photo";
    if (!docs.vehicleInterior) e.vehicleInterior = "Upload interior photo";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    // 1️⃣ Validate form
    if (!validateForm()) {
      return showAlert(
        "error",
        "Incomplete Details",
        "Please fill all required vehicle details before continuing."
      );
    }

    setLoading(true);

    try {
      const riderId = driverId || (await getData("driverid"));
      const formData = new FormData();

      // 2️⃣ Append vehicle details
      formData.append("vehicleType", vehicleType);
      formData.append("vehicleNumber", vehicleNumber.toUpperCase());
      formData.append("registrationDate", dates.regDate);
      formData.append("insuranceExpiry", dates.insuranceExpiry);
      formData.append("permitExpiry", dates.permitExpiry);
      formData.append("rcStatus", rcStatus);
      formData.append("relation", ownerRelation);

      if (rcData) {
        formData.append("rcData", JSON.stringify(rcData));
      }

      // 3️⃣ Append documents
      [
        "rcFront",
        "rcBack",
        "insurance",
        "permit",
        "vehicleFront",
        "legalDoc",
        "vehicleBack",
        "vehicleInterior",
      ].forEach((key) => {
        if (docs[key]) {
          formData.append(key, {
            uri: docs[key].uri,
            type: docs[key].mimeType,
            name: docs[key].name,
          });
        }
      });

      // 4️⃣ POST to backend
      const res = await axios.post(
        `${API_URL_APP}/api/v1/add-vehicle-details/${riderId}`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      // 5️⃣ Debug logging
      console.log("🚀 Full response:", res);
      console.log("✅ res.data:", res.data);

      // 6️⃣ Handle response
      if (res.data?.success) {
        // Haptic feedback
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Clear saved state
        await saveData("vehicleFormState", null);

        // Friendly messages based on status
        const isProcessing = res.data.status === "processing";
        const title = isProcessing ? "Upload in Progress" : "Success";
        const message = isProcessing
          ? res.data.message ||
            "Your vehicle documents have been uploaded successfully. Verification is in progress and you will be notified once it is completed."
          : "Vehicle added successfully!";

        // 7️⃣ Navigate based on source
        if (fromAll) {
          showAlert("success", title, message, () => {
            navigation.goBack();
          });
        } else {
          showAlert("success", title, message, () => {
            navigation.navigate("bankAdd", {
              driverId: res.data.driverId || riderId,
            });
          });
        }
      } else {
        // 8️⃣ Backend returned success = false
        showAlert(
          "error",
          "Submission Failed",
          res.data?.message ||
            "Something went wrong while uploading your vehicle details. Please try again."
        );
      }
    } catch (err) {
      // 9️⃣ Catch network / server errors
      console.log("❌ Upload failed:", err?.message, err?.response?.data);

      showAlert(
        "error",
        "Upload Failed",
        err?.response?.data?.message ||
          "Something went wrong while uploading your vehicle details. Please check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const renderError = (field) => {
    return errors[field] ? (
      <Text style={styles.errorText}>{errors[field]}</Text>
    ) : null;
  };

  const renderStatusBadge = () => {
    if (rcStatus === RC_STATUS.VERIFIED) {
      return (
        <View style={styles.verifiedCard}>
          <Ionicons
            name="shield-checkmark"
            size={moderateScale(32)}
            color="#10b981"
          />
          <View style={styles.verifiedTextContainer}>
            <Text style={styles.verifiedTitle}>RC Verified</Text>
            <Text style={styles.verifiedSubtitle}>
              Vehicle details loaded successfully
            </Text>
          </View>
        </View>
      );
    } else if (rcStatus === RC_STATUS.PENDING_VERIFICATION) {
      return (
        <View style={styles.pendingCard}>
          <Ionicons
            name="time-outline"
            size={moderateScale(32)}
            color="#f59e0b"
          />
          <View style={styles.verifiedTextContainer}>
            <Text style={styles.pendingTitle}>Manual Verification Pending</Text>
            <Text style={styles.pendingSubtitle}>
              Please upload your RC documents. We'll verify within 24 hours.
            </Text>
          </View>
        </View>
      );
    }
    return null;
  };

  const closeOwnerAadhaarModal = useCallback(() => {
    setShowOwnerAadhaarModal(false);
  }, []);

  const closeOwnerOtpModal = useCallback(() => {
    setShowOwnerOtpModal(false);
  }, []);

  const handleOwnerAadhaarChange = useCallback((text) => {
    setOwnerAadhaar(text);
  }, []);

  const handleOwnerOtpChange = useCallback((text, index) => {
    setOwnerOtp((prev) => {
      const updated = [...prev];
      updated[index] = text;
      return updated;
    });
  }, []);

  const renderDocumentUpload = (field, hasDemo = false) => {
    const isRcUpload = field === "rcFront" || field === "rcBack";
    const isRequired =
      rcStatus === RC_STATUS.PENDING_VERIFICATION && isRcUpload;

    return (
      <View style={styles.docUploadContainer}>
        <View style={styles.docHeader}>
          <Text numberOfLines={1} style={styles.docLabel}>
            {getDocLabel(field)}
            {isRequired && <Text style={styles.requiredMark}> *</Text>}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.uploadBox,
            errors[field] && styles.uploadBoxError,
            docs[field] && styles.uploadBoxSuccess,
            isRequired && !docs[field] && styles.uploadBoxRequired,
          ]}
          onPress={() => showImagePickerOptions(field, hasDemo)}
        >
          {docs[field] ? (
            <Image
              source={{ uri: docs[field].uri }}
              style={styles.uploadedImage}
            />
          ) : (
            <View style={styles.uploadPlaceholder}>
              <Ionicons
                name="cloud-upload-outline"
                size={moderateScale(40)}
                color="#9ca3af"
              />
              <Text style={styles.uploadHintText}>Tap to upload</Text>
            </View>
          )}
        </TouchableOpacity>

        {docs[field] && (
          <View style={{ flexDirection: "column", alignItems: "center" }}>
            <View style={styles.uploadedBadge}>
              <Ionicons
                name="checkmark-circle"
                size={scale(10)}
                color="#10b981"
              />
              <Text style={styles.uploadedText}>Uploaded</Text>
            </View>
          </View>
        )}
        {renderError(field)}
      </View>
    );
  };
  const handleCloseRelationModal = useCallback(() => {
    setShowRelationModal(false);
  }, []);

  const handleSelectRelation = useCallback((value) => {
    setOwnerRelation(value);
  }, []);

  const RelationModal = useMemo(() => {
    return (
      <Modal
        visible={showRelationModal}
        transparent
        animationType="slide"
        onRequestClose={handleCloseRelationModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.relationModalContainer}>
            <Text style={styles.modalTitle}>Vehicle Owner Relationship</Text>
            <Text style={styles.modalSubtitle}>
              What is your relationship with the vehicle owner?
            </Text>

            <ScrollView style={styles.relationList}>
              {RELATIONS.map((relation) => (
                <TouchableOpacity
                  key={relation.value}
                  style={[
                    styles.relationOption,
                    ownerRelation === relation.value &&
                      styles.relationOptionSelected,
                  ]}
                  onPress={() => handleSelectRelation(relation.value)}
                >
                  <Text
                    style={[
                      styles.relationText,
                      ownerRelation === relation.value &&
                        styles.relationTextSelected,
                    ]}
                  >
                    {relation.label}
                  </Text>

                  {ownerRelation === relation.value && (
                    <Ionicons
                      name="checkmark-circle"
                      size={24}
                      color={Colors.primary}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={handleRelationSelect}
              disabled={!ownerRelation}
            >
              <Text style={styles.modalButtonText}>Continue</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={handleCloseRelationModal}
            >
              <Text style={styles.modalCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }, [
    showRelationModal,
    ownerRelation,
    handleCloseRelationModal,
    handleSelectRelation,
    handleRelationSelect,
  ]);

  const OwnerAadhaarModal = useMemo(() => {
    return (
      <Modal
        visible={showOwnerAadhaarModal}
        transparent
        animationType="slide"
        onRequestClose={closeOwnerAadhaarModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.aadhaarModalContainer}>
            <Ionicons name="card-outline" size={48} color={Colors.primary} />

            <Text style={styles.modalTitle}>Vehicle Owner's Aadhaar</Text>
            <Text style={styles.modalSubtitle}>
              Enter the Aadhaar number of {rcData?.owner_name}
            </Text>

            <TextInput
              style={styles.aadhaarInput}
              placeholder="Enter 12-digit Aadhaar"
              value={ownerAadhaar}
              onChangeText={handleOwnerAadhaarChange}
              keyboardType="numeric"
              maxLength={12}
              placeholderTextColor="#9ca3af"
            />

            <TouchableOpacity
              style={styles.modalButton}
              onPress={handleGenerateOwnerAadhaarOTP}
              disabled={isVerifyingOwner}
            >
              {isVerifyingOwner ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.modalButtonText}>Send OTP</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={closeOwnerAadhaarModal}
            >
              <Text style={styles.modalCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }, [
    showOwnerAadhaarModal,
    ownerAadhaar,
    rcData?.owner_name,
    isVerifyingOwner,
    closeOwnerAadhaarModal,
    handleOwnerAadhaarChange,
    handleGenerateOwnerAadhaarOTP,
  ]);

  const OwnerOtpModal = useMemo(() => {
    return (
      <Modal
        visible={showOwnerOtpModal}
        transparent
        animationType="slide"
        onRequestClose={closeOwnerOtpModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.otpModalContainer}>
            <Ionicons
              name="shield-checkmark-outline"
              size={48}
              color={Colors.primary}
            />

            <Text style={styles.modalTitle}>Verify Owner's Aadhaar</Text>
            <Text style={styles.modalSubtitle}>
              Enter OTP sent to owner's Aadhaar linked mobile
            </Text>

            <View style={styles.otpContainer}>
              <TextInput
                style={styles.otpInput}
                placeholder="Enter 6-digit OTP"
                value={ownerOtp}
                onChangeText={(text) => {
                  if (/^\d*$/.test(text)) {
                    setOwnerOtp(text.slice(0, 6));
                  }
                }}
                keyboardType="numeric"
                maxLength={6}
                textAlign="center"
              />
            </View>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={handleVerifyOwnerAadhaarOtp}
              disabled={isVerifyingOwner}
            >
              {isVerifyingOwner ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.modalButtonText}>Verify OTP</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={closeOwnerOtpModal}
            >
              <Text style={styles.modalCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }, [
    showOwnerOtpModal,
    ownerOtp,
    isVerifyingOwner,
    closeOwnerOtpModal,
    handleOwnerOtpChange,
    handleVerifyOwnerAadhaarOtp,
  ]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <BackWithLogo
        isLogo={false}
        title={"Add Your Vehicle"}
        onBackPress={handleBackPress}
      />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {rcStatus === RC_STATUS.NOT_VERIFIED ||
        rcStatus === RC_STATUS.FAILED ? (
          <View style={styles.rcCard}>
            <View style={styles.rcIconContainer}>
              <Ionicons
                name="car-outline"
                size={moderateScale(48)}
                color={Colors.primary}
              />
            </View>
            <Text style={styles.rcTitle}>Verify RC Number</Text>
            <Text style={styles.rcSubtitle}>
              Enter your vehicle's registration number
            </Text>

            <Text style={styles.inputLabel}>RC Number</Text>
            <View style={styles.rcInputRow}>
              <TextInput
                style={styles.rcInput}
                placeholder="DL01AB1234"
                value={rcNumber}
                onChangeText={setRcNumber}
                autoCapitalize="characters"
                placeholderTextColor="#9ca3af"
              />
              <TouchableOpacity
                style={[
                  styles.verifyButton,
                  isVerifyingRc && styles.verifyButtonDisabled,
                ]}
                onPress={handleVerifyRC}
                disabled={isVerifyingRc}
              >
                {isVerifyingRc ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.verifyButtonText}>Verify</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            {renderStatusBadge()}

            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Vehicle Information</Text>

              <Text style={styles.inputLabel}>Vehicle Type</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={vehicleType}
                  onValueChange={setVehicleType}
                  style={styles.picker}
                >
                  <Picker.Item label="Select Vehicle Type" value="" />
                  {vehicles.map((type) => (
                    <Picker.Item
                      key={type?.vehicleKey}
                      label={`${type.displayName}-${type.seating} (${type.example})`}
                      value={type?.vehicleKey}
                    />
                  ))}
                </Picker>
              </View>
              {renderError("vehicleType")}

              <Text style={styles.inputLabel}>Vehicle Number</Text>
              <TextInput
                style={[styles.textInput, styles.disabledInput]}
                value={vehicleNumber}
                editable={false}
              />

              <Text numberOfLines={2} style={styles.inputLabel}>
                Authorization Permit Expiry Date
              </Text>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() =>
                  setShowDatePicker({ key: "permitExpiry", visible: true })
                }
              >
                <Text
                  style={
                    !dates.permitExpiry
                      ? styles.placeholderText
                      : styles.dateText
                  }
                >
                  {dates.permitExpiry
                    ? new Date(dates.permitExpiry).toLocaleDateString("en-GB")
                    : "Select Date"}
                </Text>
                <Ionicons
                  name="calendar-outline"
                  size={moderateScale(22)}
                  color={Colors.primary}
                />
              </TouchableOpacity>
              {renderError("permitExpiry")}
            </View>

            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>RC Book Photos</Text>
              {rcStatus === RC_STATUS.PENDING_VERIFICATION && (
                <Text style={styles.sectionWarning}>
                  RC upload is mandatory for manual verification
                </Text>
              )}
              <View style={styles.rcPhotosGrid}>
                <View style={styles.halfWidth}>
                  {renderDocumentUpload("rcFront", false)}
                </View>
                <View style={styles.halfWidth}>
                  {renderDocumentUpload("rcBack", false)}
                </View>
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Additional Documents</Text>
              <View style={styles.rcPhotosGrid}>
                <View style={styles.halfWidth}>
                  {renderDocumentUpload("insurance", false)}
                </View>
                <View style={styles.halfWidth}>
                  {renderDocumentUpload("permit", false)}
                </View>
              </View>
            </View>
            {showLegalDocUpload && (
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>
                  Legal Authorization Document
                </Text>
                <Text style={styles.sectionWarning}>
                  Upload legal document proving authorization to use this
                  vehicle
                </Text>
                {renderDocumentUpload("legalDoc", false)}
              </View>
            )}

            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Vehicle Photos</Text>
              <Text style={styles.sectionSubtitle}>
                Clear photos help us verify your vehicle faster
              </Text>
              {renderDocumentUpload("vehicleFront", true)}
              {renderDocumentUpload("vehicleBack", true)}
              {renderDocumentUpload("vehicleInterior", true)}
            </View>

            <TouchableOpacity
              style={[
                styles.submitButton,
                loading && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Text style={styles.submitButtonText}>Submit & Continue</Text>
                  <Ionicons
                    name="arrow-forward"
                    size={moderateScale(20)}
                    color="#fff"
                  />
                </>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* Back Confirmation Modal */}
      <Modal
        visible={showBackConfirmation}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBackConfirmation(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModalContainer}>
            <Ionicons
              name="warning-outline"
              size={moderateScale(48)}
              color="#f59e0b"
            />
            <Text style={styles.confirmTitle}>Unsaved Changes</Text>
            <Text style={styles.confirmMessage}>
              You have unsaved changes. What would you like to do?
            </Text>

            <View style={styles.confirmButtonGroup}>
              <TouchableOpacity
                style={[styles.confirmButton, styles.saveButton]}
                onPress={() => handleConfirmBack(true)}
              >
                <Text style={styles.saveButtonText}>Save & Exit</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmButton, styles.discardButton]}
                onPress={() => handleConfirmBack(false)}
              >
                <Text style={styles.discardButtonText}>Discard & Exit</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmButton, styles.cancelButton]}
                onPress={() => setShowBackConfirmation(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Demo Image Modal */}
      <Modal
        visible={demoModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setDemoModal({ visible: false, image: null, title: "" })
        }
      >
        <View style={styles.modalOverlay}>
          <View style={styles.demoModalContainer}>
            <View style={styles.demoModalHeader}>
              <Text style={styles.demoModalTitle}>{demoModal.title}</Text>
              <TouchableOpacity
                onPress={() =>
                  setDemoModal({ visible: false, image: null, title: "" })
                }
                style={styles.closeButton}
              >
                <Ionicons
                  name="close-circle"
                  size={moderateScale(32)}
                  color="#6b7280"
                />
              </TouchableOpacity>
            </View>

            {demoModal.image && (
              <Image
                source={demoModal.image}
                style={styles.demoImage}
                resizeMode="contain"
              />
            )}

            <View style={styles.demoHintContainer}>
              <Ionicons
                name="information-circle"
                size={moderateScale(24)}
                color={Colors.primary}
              />
              <Text style={styles.demoHintText}>
                This is an example of a properly formatted photo. Ensure your
                photo is clear, well-lit, and follows this format.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.demoCloseButton}
              onPress={() =>
                setDemoModal({ visible: false, image: null, title: "" })
              }
            >
              <Text style={styles.demoCloseButtonText}>Got It</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {showDatePicker.visible && (
        <DateTimePicker
          mode="date"
          value={new Date()}
          minimumDate={new Date()}
          onChange={(event, selectedDate) => {
            if (event.type === "set" && selectedDate) {
              setDates((prev) => ({
                ...prev,
                [showDatePicker.key]: selectedDate.toISOString().split("T")[0],
              }));
            }
            setShowDatePicker({ key: null, visible: false });
          }}
        />
      )}

      {RelationModal}
      {OwnerAadhaarModal}

      {OwnerOtpModal}
      <UniversalAlert
        visible={alertVisible}
        {...alertConfig}
        onClose={() => setAlertVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = {
  safeArea: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  scrollContent: {
    padding: scale(20),
    paddingBottom: verticalScale(40),
  },
  rcCard: {
    backgroundColor: "#fff",
    borderRadius: moderateScale(20),
    padding: scale(28),
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  rcIconContainer: {
    alignSelf: "center",
    backgroundColor: Colors.primary + "15",
    width: moderateScale(80),
    height: moderateScale(80),
    borderRadius: moderateScale(40),
    justifyContent: "center",
    alignItems: "center",
    marginBottom: verticalScale(16),
  },
  rcTitle: {
    fontSize: moderateScale(22),
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
    marginBottom: verticalScale(8),
  },
  rcSubtitle: {
    fontSize: moderateScale(15),
    color: "#6b7280",
    textAlign: "center",
    marginBottom: verticalScale(24),
  },
  inputLabel: {
    fontSize: moderateScale(15),
    fontWeight: "600",
    overflow: "hidden",
    color: "#374151",
    marginBottom: verticalScale(8),
  },
  rcInputRow: {
    flexDirection: "row",
    gap: scale(12),
  },
  rcInput: {
    flex: 1,
    borderWidth: 2,
    borderColor: "#e5e7eb",
    borderRadius: moderateScale(14),
    padding: scale(16),
    fontSize: moderateScale(16),
    color: "#111827",
    backgroundColor: "#f9fafb",
  },
  verifyButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: scale(28),
    paddingVertical: verticalScale(16),
    borderRadius: moderateScale(14),
    justifyContent: "center",
    alignItems: "center",
    minWidth: scale(100),
  },
  verifyButtonDisabled: {
    opacity: 0.6,
  },
  verifyButtonText: {
    color: "#fff",
    fontSize: moderateScale(16),
    fontWeight: "700",
  },
  verifiedCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#d1fae5",
    padding: scale(18),
    borderRadius: moderateScale(16),
    marginBottom: verticalScale(24),
    borderWidth: 2,
    borderColor: "#a7f3d0",
  },
  verifiedTextContainer: {
    marginLeft: scale(12),
    flex: 1,
  },
  verifiedTitle: {
    fontSize: moderateScale(17),
    fontWeight: "700",
    color: "#065f46",
  },
  verifiedSubtitle: {
    fontSize: moderateScale(14),
    color: "#047857",
    marginTop: verticalScale(2),
  },
  pendingCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef3c7",
    padding: scale(18),
    borderRadius: moderateScale(16),
    marginBottom: verticalScale(24),
    borderWidth: 2,
    borderColor: "#fde68a",
  },
  pendingTitle: {
    fontSize: moderateScale(17),
    fontWeight: "700",
    color: "#92400e",
  },
  pendingSubtitle: {
    fontSize: moderateScale(14),
    color: "#b45309",
    marginTop: verticalScale(2),
  },
  formSection: {
    backgroundColor: "#fff",
    borderRadius: moderateScale(16),
    padding: scale(12),
    marginBottom: verticalScale(20),
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  sectionTitle: {
    fontSize: moderateScale(18),
    fontWeight: "700",
    textAlign: "center",
    color: "#111827",
    marginBottom: verticalScale(6),
  },
  sectionSubtitle: {
    fontSize: moderateScale(10),
    color: "#6b7280",
    textAlign: "center",
    marginBottom: verticalScale(16),
  },
  sectionWarning: {
    fontSize: moderateScale(12),
    color: "#f59e0b",
    textAlign: "center",
    marginBottom: verticalScale(12),
    fontWeight: "600",
  },
  pickerContainer: {
    borderWidth: 2,
    borderColor: "#e5e7eb",
    borderRadius: moderateScale(14),
    backgroundColor: "#f9fafb",
    marginBottom: verticalScale(8),
    overflow: "hidden",
  },
  picker: {
    height: verticalScale(50),
  },
  textInput: {
    borderWidth: 2,
    borderColor: "#e5e7eb",
    borderRadius: moderateScale(14),
    padding: scale(16),
    fontSize: moderateScale(16),
    color: "#111827",
    backgroundColor: "#f9fafb",
    marginBottom: verticalScale(16),
  },
  disabledInput: {
    backgroundColor: "#f3f4f6",
    color: "#6b7280",
  },
  datePickerButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#e5e7eb",
    borderRadius: moderateScale(14),
    padding: scale(16),
    backgroundColor: "#f9fafb",
    marginBottom: verticalScale(8),
  },
  placeholderText: {
    color: "#9ca3af",
    fontSize: moderateScale(16),
  },
  dateText: {
    color: "#111827",
    fontSize: moderateScale(16),
    fontWeight: "500",
  },
  rcPhotosGrid: {
    flexDirection: "row",
    gap: scale(12),
  },
  halfWidth: {
    flex: 1,
  },
  docUploadContainer: {
    marginBottom: verticalScale(20),
  },
  docHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    textAlign: "center",
    marginBottom: verticalScale(10),
  },
  docLabel: {
    fontSize: moderateScale(13),
    textAlign: "center",
    width: "100%",
    fontWeight: "600",
    color: "#374151",
  },
  requiredMark: {
    color: "#ef4444",
    fontSize: moderateScale(15),
  },
  uploadedBadge: {
    flexDirection: "row",
    width: 70,
    marginTop: 5,
    gap: scale(2),
    backgroundColor: "#d1fae5",
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
    borderRadius: moderateScale(20),
  },
  uploadedText: {
    fontSize: moderateScale(8),
    color: "#065f46",
    fontWeight: "600",
  },
  uploadBox: {
    height: verticalScale(90),
    borderWidth: 2,
    padding: 2,
    textAlign: "center",
    borderStyle: "dashed",
    borderColor: "#d1d5db",
    borderRadius: moderateScale(16),
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fafafa",
    overflow: "hidden",
  },
  uploadBoxError: {
    borderColor: "#ef4444",
    backgroundColor: "#fef2f2",
  },
  uploadBoxSuccess: {
    borderStyle: "solid",
    borderColor: "#10b981",
    backgroundColor: "#fff",
  },
  uploadBoxRequired: {
    borderColor: "#f59e0b",
    backgroundColor: "#fffbeb",
  },
  uploadedImage: {
    width: "100%",
    height: "100%",
  },
  uploadPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  uploadHintText: {
    fontSize: moderateScale(10),
    fontWeight: "600",
    color: "#6b7280",
    marginTop: verticalScale(10),
  },
  errorText: {
    color: "#ef4444",
    fontSize: moderateScale(13),
    marginTop: verticalScale(6),
    fontWeight: "500",
  },
  submitButton: {
    backgroundColor: Colors.primary,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: scale(10),
    padding: scale(18),
    borderRadius: moderateScale(16),
    marginTop: verticalScale(10),
    elevation: 4,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: moderateScale(17),
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    padding: scale(16),
  },
  confirmModalContainer: {
    backgroundColor: "#fff",
    borderRadius: moderateScale(24),
    padding: scale(28),
    alignItems: "center",
  },
  confirmTitle: {
    fontSize: moderateScale(22),
    fontWeight: "700",
    color: "#111827",
    marginTop: verticalScale(16),
    marginBottom: verticalScale(8),
  },
  confirmMessage: {
    fontSize: moderateScale(15),
    color: "#6b7280",
    textAlign: "center",
    marginBottom: verticalScale(24),
    lineHeight: moderateScale(22),
  },
  confirmButtonGroup: {
    width: "100%",
    gap: scale(12),
  },
  confirmButton: {
    padding: scale(16),
    borderRadius: moderateScale(14),
    alignItems: "center",
  },
  saveButton: {
    backgroundColor: Colors.primary,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: moderateScale(16),
    fontWeight: "700",
  },
  discardButton: {
    backgroundColor: "#ef4444",
  },
  discardButtonText: {
    color: "#fff",
    fontSize: moderateScale(16),
    fontWeight: "700",
  },
  cancelButton: {
    backgroundColor: "#f3f4f6",
  },
  cancelButtonText: {
    color: "#374151",
    fontSize: moderateScale(16),
    fontWeight: "700",
  },
  demoModalContainer: {
    backgroundColor: "#fff",
    borderRadius: moderateScale(24),
    padding: scale(24),
    maxHeight: "85%",
  },
  demoModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: verticalScale(20),
  },
  demoModalTitle: {
    fontSize: moderateScale(20),
    fontWeight: "700",
    color: "#111827",
    flex: 1,
  },
  closeButton: {
    padding: scale(4),
  },
  demoImage: {
    width: "100%",
    height: verticalScale(220),
    borderRadius: moderateScale(16),
    marginBottom: verticalScale(20),
  },
  demoHintContainer: {
    flexDirection: "row",
    backgroundColor: Colors.primary + "10",
    padding: scale(16),
    borderRadius: moderateScale(12),
    gap: scale(12),
    marginBottom: verticalScale(20),
  },
  demoHintText: {
    flex: 1,
    fontSize: moderateScale(14),
    color: "#374151",
    lineHeight: moderateScale(20),
  },
  demoCloseButton: {
    backgroundColor: Colors.primary,
    padding: scale(16),
    borderRadius: moderateScale(14),
    alignItems: "center",
  },
  demoCloseButtonText: {
    color: "#fff",
    fontSize: moderateScale(16),
    fontWeight: "700",
  },
  relationModalContainer: {
    backgroundColor: "#fff",
    borderRadius: moderateScale(24),
    padding: scale(24),
    maxHeight: "80%",
    width: "100%",
  },
  modalTitle: {
    fontSize: moderateScale(22),
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
    marginBottom: verticalScale(8),
  },
  modalSubtitle: {
    fontSize: moderateScale(15),
    color: "#6b7280",
    textAlign: "center",
    marginBottom: verticalScale(20),
  },
  relationList: {
    maxHeight: verticalScale(300),
    marginBottom: verticalScale(20),
  },
  relationOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: scale(16),
    borderWidth: 2,
    borderColor: "#e5e7eb",
    borderRadius: moderateScale(12),
    marginBottom: verticalScale(12),
  },
  relationOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + "10",
  },
  relationText: {
    fontSize: moderateScale(16),
    color: "#374151",
    fontWeight: "600",
  },
  relationTextSelected: {
    color: Colors.primary,
  },
  aadhaarModalContainer: {
    backgroundColor: "#fff",
    borderRadius: moderateScale(24),
    padding: scale(28),
    alignItems: "center",
  },
  aadhaarInput: {
    width: "100%",
    borderWidth: 2,
    borderColor: "#e5e7eb",
    borderRadius: moderateScale(14),
    padding: scale(16),
    fontSize: moderateScale(18),
    textAlign: "center",
    marginBottom: verticalScale(20),
  },
  otpModalContainer: {
    backgroundColor: "#fff",
    borderRadius: moderateScale(24),
    padding: scale(18),

    position: "relative",
    bottom: verticalScale(90),
    alignItems: "center",
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: scale(3),
    marginBottom: verticalScale(14),
  },
  otpInput: {
    flex: 1,
    borderWidth: 2,
    borderColor: "#e5e7eb",
    borderRadius: moderateScale(12),
    textAlign: "center",
    fontSize: moderateScale(20),
    fontWeight: "700",
  },
  modalButton: {
    backgroundColor: Colors.primary,
    width: "100%",
    padding: scale(10),
    borderRadius: moderateScale(14),
    alignItems: "center",
    marginBottom: verticalScale(12),
  },
  modalButtonText: {
    color: "#fff",
    fontSize: moderateScale(17),
    fontWeight: "700",
  },
  modalCancelButton: {
    width: "100%",
    padding: scale(8),
    alignItems: "center",
  },
  modalCancelButtonText: {
    color: "#6b7280",
    fontSize: moderateScale(16),
    fontWeight: "600",
  },
};
