import React, { useState, useEffect, useRef } from "react";
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
  KeyboardAvoidingView,
  Platform,
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
import { getData } from "../../../utils/storage";
import { UniversalAlert } from "../../common/UniversalAlert";
import useSettings from "../../../hooks/Settings";
import { SafeAreaView } from "react-native-safe-area-context";
import { scale, verticalScale, moderateScale } from "react-native-size-matters";

export default function AddVehicle({ navigation }) {
  const route = useRoute();
  const { driverId, fromAll, mobile } = route.params || {};
  const VEHICLE_TYPES = ["Mini", "Sedan", "SUV", "Invoa Crysta Premium"];

  const { data, fetchSettings } = useSettings({ autoFetch: true });

  // RC States
  const [rcNumber, setRcNumber] = useState("");
  const [rcData, setRcData] = useState(null);
  const [isRcVerified, setIsRcVerified] = useState(false);
  const [isVerifyingRc, setIsVerifyingRc] = useState(false);

  // Aadhaar States
  const [ownerAadhaar, setOwnerAadhaar] = useState("");
  const [showAadhaarModal, setShowAadhaarModal] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(true);
  const [showNameMismatchAlert, setShowNameMismatchAlert] = useState(false);
  const [isOwnerAadhaarFlow, setIsOwnerAadhaarFlow] = useState(false);
  const [otp, setOtp] = useState("");
  const [aadhaarRequestId, setAadhaarRequestId] = useState(null);
  const [timer, setTimer] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const otpRefs = useRef([]);

  // Form States
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
  // const isByPass =true

  const [showDatePicker, setShowDatePicker] = useState({
    key: null,
    visible: false,
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Alert
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    type: "success",
    title: "",
    message: "",
    onPrimaryPress: () => setAlertVisible(false),
  });

  const showAlert = (type, title, message, onPrimaryPress = null) => {
    setAlertConfig({
      type,
      title,
      message,
      primaryButton: "OK",
      // अगर onPrimaryPress दिया है, तो पहले वो चलाओ, फिर alert बंद करो
      onPrimaryPress: () => {
        if (onPrimaryPress) {
          onPrimaryPress(); // जैसे Aadhaar modal खोलना
        }
        setAlertVisible(false); // हमेशा alert बंद करो OK press पर
      },
      // optional: cancel button अगर चाहो तो
      // showCancel: false,
    });
    setAlertVisible(true); // alert दिखाओ
  };

  useEffect(() => {
    (async () => {
      await ImagePicker.requestCameraPermissionsAsync();
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    })();
  }, []);

  useEffect(() => {
    if (timer > 0) {
      const id = setInterval(() => setTimer((t) => t - 1), 1000);
      return () => clearInterval(id);
    }
  }, [timer]);

  useEffect(() => {
    if (rcData && !isRcVerified) {
      checkDriverAadhaarMatch();
    }
  }, [rcData]);

  const checkDriverAadhaarMatch = async () => {
    try {
      const stored = await getData("aadhaar_verified_data");
      if (!stored) {
        setIsOwnerAadhaarFlow(true);
        setShowAadhaarModal(true);
        return;
      }

      const parsed = JSON.parse(stored);
      const driverName = parsed.data?.full_name?.toLowerCase().trim();
      const rcOwnerName = rcData.owner_name?.toLowerCase().trim();

      if (
        driverName &&
        rcOwnerName &&
        (driverName.includes(rcOwnerName) || rcOwnerName.includes(driverName))
      ) {
        showAlert("success", "Verified", "You're the vehicle owner!");
        return;
      }

      setShowNameMismatchAlert(true);
    } catch {
      setIsOwnerAadhaarFlow(true);
      console.log("Yaha se open hu catch se");

      // setShowAadhaarModal(true);
    }
  };

  const handleNameMismatchResponse = (isMyVehicle) => {
    setShowNameMismatchAlert(false);
    if (!isMyVehicle) {
      setIsOwnerAadhaarFlow(true);
      setShowAadhaarModal(true);
    } else {
      showAlert("success", "Proceeding", "Continuing as vehicle owner");
    }
  };

  const handleVerifyRC = async () => {
    console.log("🚀 RC Verify started");

    fetchSettings();

    if (!rcNumber.trim()) {
      console.log("❌ RC number empty");
      return showAlert("error", "Invalid", "Enter RC number");
    }

    setIsVerifyingRc(true);

    const deviceId = await Application.getAndroidId();
    console.log("📱 Device ID:", deviceId);
    console.log("🔢 RC Number:", rcNumber.toUpperCase().trim());
    console.log("🛑 isByPass:", isByPass);

    try {
      console.log("📡 Calling RC verify API...");

      const res = await axios.post(`${API_URL_APP}/api/v1/rc-verify`, {
        rcNumber: rcNumber.toUpperCase().trim(),
        isByPass,
        driverId,
        deviceId,
      });

      console.log("✅ API Response:", res.data);

      if (res.data.success) {
        const data = res.data.rcData;
        console.log("🚗 RC Data:", data);

        if (
          data.vehicle_category?.includes("2W") ||
          data.vehicle_category?.includes("MOTORCYCLE")
        ) {
          console.log("❌ Two-wheeler detected:", data.vehicle_category);
          return showAlert(
            "error",
            "Invalid Vehicle",
            "Only four-wheelers allowed"
          );
        }

        setRcData(data);
        fillFormFromRC(data);
        setIsRcVerified(true);

        console.log("🎉 RC verified successfully");
        showAlert("success", "RC Verified", "Vehicle details loaded");
      } else {
        console.log("❌ RC verification failed:", res.data.message);

        showAlert("error", "Failed", res.data.message || "Invalid RC", () => {
          console.log("Opening Aadhaar modal (API failure)");
          checkDriverAadhaarMatch();
          setShowAadhaarModal(true);
        });
      }
    } catch (err) {
      const errorData = err.response?.data;

      console.log("🔥 RC verify error:", errorData);

      if (errorData?.rcData) {
        console.log("⚠️ Partial RC Data from error:", errorData.rcData);
        setRcData(errorData.rcData);
      }

      const shouldOpenAadhaarModal = errorData?.aadharModel === true;

      showAlert(
        "error",
        "Error",
        errorData?.message || "RC verification failed",
        shouldOpenAadhaarModal
          ? () => {
              console.log("Opening Aadhaar modal after user taps OK");
              checkDriverAadhaarMatch();
              setShowAadhaarModal(true);
            }
          : null // अगर कोई callback नहीं तो सिर्फ alert बंद होगा OK पर
      );
    } finally {
      setIsVerifyingRc(false);
      console.log("⏹ RC Verify process ended");
    }
  };

  console.log("🎉 RC verified successfully", rcData?.rc_number);

  useEffect(() => {
    if (rcData?.rc_number) {
      setVehicleNumber(rcData.rc_number || "");
    } else {
      console.log(rcData);
      console.log("Bhai error hu");
    }
  }, [rcData]);
  const fillFormFromRC = async (rcInfo) => {
    setVehicleNumber(rcInfo.rc_number || "");

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

  const handleGenerateAadhaarOTP = async () => {
    if (!/^\d{12}$/.test(ownerAadhaar)) {
      return showAlert(
        "error",
        "Invalid Aadhaar",
        "Enter 12-digit Aadhaar number"
      );
    }

    setIsVerifying(true);
    const deviceId = await Application.getAndroidId();

    try {
      const res = await axios.post(`${API_URL_APP}/api/v1/send-otp-on-aadhar`, {
        aadhaarNumber: ownerAadhaar,
        device_id: deviceId,
      });

      if (res.data.success) {
        setAadhaarRequestId(res.data.request_id);
        setShowAadhaarModal(false);
        setShowOtpModal(true);
        setTimer(30);
        setOtp(["", "", "", "", "", ""]);
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
      setIsVerifying(false);
    }
  };

  const handleVerifyAadhaarOtp = async () => {
    const otpValue = otp;
    if (otpValue.length !== 6)
      return showAlert("error", "Invalid OTP", "Enter 6 digits");

    setIsVerifying(true);
    const deviceId = await Application.getAndroidId();

    try {
      const res = await axios.post(
        `${API_URL_APP}/api/v1/verify-otp-on-aadhar`,
        {
          request_id: aadhaarRequestId,
          otp: otpValue,
          deviceId,
          aadhaarNumber: ownerAadhaar,
        }
      );

      if (res.data.success) {
        const aadhaarName = res.data.aadhaarData?.full_name
          ?.toLowerCase()
          .trim();
        const rcOwnerName = rcData?.owner_name?.toLowerCase().trim();

        if (
          aadhaarName &&
          rcOwnerName &&
          (aadhaarName.includes(rcOwnerName) ||
            rcOwnerName.includes(aadhaarName))
        ) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setShowOtpModal(false);
          setIsRcVerified(true);
          showAlert("success", "Success!", "Aadhaar verified successfully!");
        } else {
          showAlert(
            "error",
            "Name Mismatch",
            `RC Owner: ${rcData.owner_name}\nAadhaar: ${res.data.aadhaarData.full_name}`
          );
        }
      } else {
        showAlert("error", "Invalid OTP", res.data.message);
      }
    } catch (err) {
      showAlert(
        "error",
        "Error",
        err.response?.data?.message || "Verification failed"
      );
    } finally {
      setIsVerifying(false);
    }
  };

  const pickImage = async (key, source = "library") => {
    try {
      let result;

      if (source === "camera") {
        result = await ImagePicker.launchCameraAsync({
          quality: 0.8,
          allowsEditing: true,
          aspect: [4, 3],
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          quality: 0.8,
          allowsEditing: true,
          aspect: [4, 3],
        });
      }

      if (!result.canceled && result.assets[0]) {
        const { uri } = result.assets[0];
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
      permit: "Authorization 1Year Permit",
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
    if (!docs.vehicleFront) e.vehicleFront = "Upload front photo";
    if (!docs.vehicleBack) e.vehicleBack = "Upload back photo";
    if (!docs.vehicleInterior) e.vehicleInterior = "Upload interior photo";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm())
      return showAlert("error", "Incomplete", "Fill all required fields");

    setLoading(true);
    const riderId = driverId || (await getData("driverid"));
    const formData = new FormData();

    formData.append("vehicleType", vehicleType);
    formData.append("vehicleNumber", vehicleNumber.toUpperCase());
    formData.append("registrationDate", dates.regDate);
    formData.append("insuranceExpiry", dates.insuranceExpiry);
    formData.append("permitExpiry", dates.permitExpiry);

    if (rcData) formData.append("rcData", JSON.stringify(rcData));

    [
      "rcFront",
      "rcBack",
      "insurance",
      "permit",
      "vehicleFront",
      "vehicleBack",
      "vehicleInterior",
    ].forEach((k) => {
      if (docs[k]) {
        formData.append(k, {
          uri: docs[k].uri,
          type: docs[k].mimeType,
          name: docs[k].name,
        });
      }
    });

    try {
      const res = await axios.post(
        `${API_URL_APP}/api/v1/add-vehicle-details/${riderId}`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      if (res.data.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        if (fromAll) {
          showAlert(
            "success",
            "Success!",
            "Vehicle added successfully!",
            () => {
              navigation.goBack();
            }
          );
        } else {
          showAlert(
            "success",
            "Success!",
            "Vehicle added successfully!",
            () => {
              navigation.navigate("bankAdd", {
                driverId: res.data.driverId || riderId,
              });
            }
          );
        }
      }
    } catch (err) {
      showAlert(
        "error",
        "Failed",
        err.response?.data?.message || "Something went wrong"
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

  const renderDocumentUpload = (field, hasDemo = false) => {
    return (
      <View style={styles.docUploadContainer}>
        <View style={styles.docHeader}>
          <Text style={styles.docLabel}>{getDocLabel(field)}</Text>
          {docs[field] && (
            <View style={styles.uploadedBadge}>
              <Ionicons name="checkmark-circle" size={10} color="#10b981" />
              <Text style={styles.uploadedText}>Uploaded</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.uploadBox,
            errors[field] && styles.uploadBoxError,
            docs[field] && styles.uploadBoxSuccess,
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
              <Ionicons name="cloud-upload-outline" size={40} color="#9ca3af" />
              <Text style={styles.uploadHintText}>Tap to upload</Text>
              <Text style={styles.uploadSubText}>Camera or Gallery</Text>
            </View>
          )}
        </TouchableOpacity>

        {renderError(field)}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <BackWithLogo isLogo={false} title={"Add Your Vehicle"} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {!isRcVerified ? (
          <View style={styles.rcCard}>
            <View style={styles.rcIconContainer}>
              <Ionicons name="car-outline" size={48} color={Colors.primary} />
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
            <View style={styles.verifiedCard}>
              <Ionicons name="shield-checkmark" size={32} color="#10b981" />
              <View style={styles.verifiedTextContainer}>
                <Text style={styles.verifiedTitle}>RC Verified</Text>
                <Text style={styles.verifiedSubtitle}>
                  Vehicle details loaded successfully
                </Text>
              </View>
            </View>

            {/* Vehicle Type */}
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
                  {VEHICLE_TYPES.map((type) => (
                    <Picker.Item key={type} label={type} value={type} />
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

              <Text style={styles.inputLabel}>
                Authorization 1Year Permit Expiry Date{" "}
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
                  size={22}
                  color={Colors.primary}
                />
              </TouchableOpacity>
              {renderError("permitExpiry")}
            </View>

            {/* RC Photos - Side by Side */}
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>RC Book Photos</Text>
              <View style={styles.rcPhotosGrid}>
                <View style={styles.halfWidth}>
                  {renderDocumentUpload("rcFront", false)}
                </View>
                <View style={styles.halfWidth}>
                  {renderDocumentUpload("rcBack", false)}
                </View>
              </View>
            </View>

            {/* Other Documents */}
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Additional Documents</Text>
              {renderDocumentUpload("insurance", false)}
              {renderDocumentUpload("permit", false)}
            </View>

            {/* Vehicle Photos with Demo */}
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
                  <Ionicons name="arrow-forward" size={20} color="#fff" />
                </>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

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
                <Ionicons name="close-circle" size={32} color="#6b7280" />
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
                size={24}
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

      {/* Name Mismatch Modal */}
      <Modal visible={showNameMismatchAlert} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.alertModalContainer}>
            <View style={styles.alertIconContainer}>
              <Ionicons name="alert-circle" size={64} color="#f59e0b" />
            </View>
            <Text style={styles.alertModalTitle}>Name Mismatch Detected</Text>
            <View style={styles.mismatchInfoBox}>
              <Text style={styles.mismatchLabel}>RC Owner Name:</Text>
              <Text style={styles.mismatchValue}>{rcData?.owner_name}</Text>
            </View>
            <Text style={styles.alertModalMessage}>
              The name on your Aadhaar doesn't match the RC owner name. Is this
              your vehicle?
            </Text>
            <View style={styles.alertButtonRow}>
              <TouchableOpacity
                style={[styles.alertButton, styles.alertButtonSuccess]}
                onPress={() => handleNameMismatchResponse(true)}
              >
                <Ionicons name="checkmark" size={20} color="#fff" />
                <Text style={styles.alertButtonText}>Yes, it's mine</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.alertButton, styles.alertButtonPrimary]}
                onPress={() => handleNameMismatchResponse(false)}
              >
                <Ionicons name="person" size={20} color="#fff" />
                <Text style={styles.alertButtonText}>Different owner</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Aadhaar Modal */}
      <Modal visible={showAadhaarModal} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalOverlay}>
            <ScrollView
              contentContainerStyle={styles.scrollModalContent}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.aadhaarModalContainer}>
                <View style={styles.aadhaarIconContainer}>
                  <Ionicons name="card" size={22} color={Colors.primary} />
                </View>
                <Text style={styles.aadhaarModalTitle}>
                  {isOwnerAadhaarFlow
                    ? "Verify Owner's Aadhaar"
                    : "Verify Your Aadhaar"}
                </Text>
                {isOwnerAadhaarFlow && rcData && (
                  <View style={styles.ownerInfoCard}>
                    <Text style={styles.ownerInfoLabel}>RC Owner Name</Text>
                    <Text style={styles.ownerInfoValue}>
                      {rcData.owner_name}
                    </Text>
                  </View>
                )}
                <Text style={styles.aadhaarInputLabel}>
                  Enter Rc Owner Aadhaar Number
                </Text>
                <TextInput
                  placeholder="1234 5678 9012"
                  placeholderTextColor="#9ca3af"
                  value={ownerAadhaar.replace(
                    /(\d{4})(\d{4})(\d{4})/,
                    "$1 $2 $3"
                  )}
                  onChangeText={(text) => {
                    const digits = text.replace(/\D/g, "").slice(0, 12);
                    setOwnerAadhaar(digits);
                  }}
                  keyboardType="numeric"
                  maxLength={14}
                  style={styles.aadhaarInput}
                  autoFocus
                />
                <Text style={styles.aadhaarHintText}>
                  OTP will be sent to the mobile number linked with this Aadhaar
                </Text>
                <View style={styles.aadhaarButtonRow}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      setShowAadhaarModal(false);
                      setAlertVisible(false);
                      setOwnerAadhaar("");
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.primaryButton,
                      (ownerAadhaar.length !== 12 || isVerifying) &&
                        styles.primaryButtonDisabled,
                    ]}
                    onPress={handleGenerateAadhaarOTP}
                    disabled={ownerAadhaar.length !== 12 || isVerifying}
                  >
                    {isVerifying ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.primaryButtonText}>Send OTP</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* OTP Modal */}
      <Modal visible={showOtpModal} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalOverlay}>
            <ScrollView
              contentContainerStyle={styles.scrollModalContent}
              keyboardShouldPersistTaps="handled"
            >
              
              <View style={styles.otpModalContainer}>
                
                <View style={styles.otpIconContainer}>
                  <Ionicons
                    name="mail-outline"
                    size={56}
                    color={Colors.primary}
                  />
                </View>
                <Text style={styles.otpModalTitle}>Enter OTP</Text>
                <Text style={styles.otpSubtitle}>
                  We've sent a 6-digit code to your Aadhaar-linked mobile
                </Text>
                 {timer > 0 ? (
                              <View style={[styles.successBox,{flex:1,alignItems:"center",justifyContent:"center",alignSelf:"center"}]}>
                                <Text style={styles.successMessage}>
                                  OTP sent successfully
                                </Text>
                              </View>
                            ) : null}
                <View style={styles.otpInputRow}>
                  <TextInput
                    value={otp}
                    onChangeText={setOtp}
                    keyboardType="numeric"
                    maxLength={6}
                    style={styles.otpInputBox}
                  />
                </View>
                <View style={styles.otpTimerContainer}>
                  {timer > 0 ? (
                    <Text style={styles.otpTimerText}>
                      Resend OTP in {timer}s
                    </Text>
                  ) : (
                    <TouchableOpacity onPress={handleGenerateAadhaarOTP}>
                      <Text style={styles.resendOtpText}>Resend OTP</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <View style={styles.otpButtonRow}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      setShowOtpModal(false);
                      setShowAadhaarModal(true);
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.primaryButton,
                      isVerifying && styles.primaryButtonDisabled,
                    ]}
                    onPress={handleVerifyAadhaarOtp}
                    disabled={isVerifying}
                  >
                    {isVerifying ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.primaryButtonText}>Verify OTP</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
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
    padding: 20,
    paddingBottom: 40,
  },
  scrollModalContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
    marginBottom: 24,
    letterSpacing: -0.5,
  },

  // RC Verification Card
  rcCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 28,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  rcIconContainer: {
    alignSelf: "center",
    backgroundColor: Colors.primary + "15",
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  rcTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
    marginBottom: 8,
  },
  rcSubtitle: {
    fontSize: 15,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  rcInputRow: {
    flexDirection: "row",
    gap: 12,
  },
  rcInput: {
    flex: 1,
    borderWidth: 2,
    borderColor: "#e5e7eb",
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    color: "#111827",
    backgroundColor: "#f9fafb",
  },
  verifyButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 100,
  },
  verifyButtonDisabled: {
    opacity: 0.6,
  },
  verifyButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  // Verified Card
  verifiedCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#d1fae5",
    padding: 18,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: "#a7f3d0",
  },
  verifiedTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  verifiedTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#065f46",
  },
  verifiedSubtitle: {
    fontSize: 14,
    color: "#047857",
    marginTop: 2,
  },

  // Form Section
  formSection: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 16,
  },
  pickerContainer: {
    borderWidth: 2,
    borderColor: "#e5e7eb",
    borderRadius: 14,
    backgroundColor: "#f9fafb",
    marginBottom: 8,
    overflow: "hidden",
  },
  picker: {
    height: verticalScale(40),
  },
  textInput: {
    borderWidth: 2,
    borderColor: "#e5e7eb",
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    color: "#111827",
    backgroundColor: "#f9fafb",
    marginBottom: 16,
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
    borderRadius: 14,
    padding: 16,
    backgroundColor: "#f9fafb",
    marginBottom: 8,
  },
  placeholderText: {
    color: "#9ca3af",
    fontSize: 16,
  },
  dateText: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "500",
  },

  // RC Photos Grid
  rcPhotosGrid: {
    flexDirection: "row",
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },

  // Document Upload
  docUploadContainer: {
    marginBottom: 20,
  },
  docHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  docLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
  },
  uploadedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#d1fae5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  uploadedText: {
    fontSize: 8,
    color: "#065f46",
    fontWeight: "600",
  },
  uploadBox: {
    height: 160,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#d1d5db",
    borderRadius: 16,
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
  uploadedImage: {
    width: "100%",
    height: "100%",
  },
  uploadPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  uploadHintText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#6b7280",
    marginTop: 10,
  },
  uploadSubText: {
    fontSize: 13,
    color: "#9ca3af",
    marginTop: 4,
  },
  errorText: {
    color: "#ef4444",
    fontSize: 13,
    marginTop: 6,
    fontWeight: "500",
  },

  // Submit Button
  submitButton: {
    backgroundColor: Colors.primary,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    padding: 18,
    borderRadius: 16,
    marginTop: 10,
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
    fontSize: 17,
    fontWeight: "700",
  },

  // Modal Overlay
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    padding: 6,
    marginBottom: 22,
  },

  // Demo Modal
  demoModalContainer: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    maxHeight: "85%",
  },
  demoModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  demoModalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  demoImage: {
    width: "100%",
    height: 320,
    borderRadius: 16,
    marginBottom: 20,
  },
  demoHintContainer: {
    flexDirection: "row",
    backgroundColor: Colors.primary + "10",
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginBottom: 20,
  },
  demoHintText: {
    flex: 1,
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
  },
  demoCloseButton: {
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  demoCloseButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  // Alert Modal
  alertModalContainer: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 28,
  },
  alertIconContainer: {
    alignSelf: "center",
    marginBottom: 20,
  },
  alertModalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
    marginBottom: 20,
  },
  mismatchInfoBox: {
    backgroundColor: "#fef3c7",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  mismatchLabel: {
    fontSize: 13,
    color: "#92400e",
    marginBottom: 4,
  },
  mismatchValue: {
    fontSize: 17,
    fontWeight: "700",
    color: "#78350f",
  },
  alertModalMessage: {
    fontSize: 15,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  alertButtonRow: {
    flexDirection: "row",
    gap: 12,
  },
  alertButton: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    padding: 16,
    borderRadius: 14,
  },
  alertButtonSuccess: {
    backgroundColor: "#10b981",
  },
  alertButtonPrimary: {
    backgroundColor: Colors.primary,
  },
  alertButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },

  // Aadhaar Modal
  aadhaarModalContainer: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 28,
  },
  aadhaarIconContainer: {
    alignSelf: "center",
    backgroundColor: Colors.primary + "15",
    width: 34,
    height: 34,
    borderRadius: 48,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  aadhaarModalTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
    marginBottom: 20,
  },
  ownerInfoCard: {
    backgroundColor: "#f0fdf4",
    padding: 6,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "#bbf7d0",
  },
  ownerInfoLabel: {
    fontSize: 10,
    color: "#166534",
    marginBottom: 6,
  },
  ownerInfoValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#14532d",
  },
   successBox: {
    width: "60%",
    backgroundColor: "#28a745", // success green
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginTop: 4,
    marginBottom:10,
    marginLeft: 0,
    // alignSelf: "stretch",
  },
  successMessage: {
    color: "#ffffff", // white text
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  aadhaarInputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 10,
  },
  aadhaarInput: {
    borderWidth: 2,
    borderColor: Colors.primary + "40",
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    padding: 8,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    color: "#111827",
  },
  aadhaarHintText: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
    marginTop: 12,
    marginBottom: 20,
    lineHeight: 18,
  },
  aadhaarButtonRow: {
    flexDirection: "row",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 7,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    color: Colors.primary,
    fontSize: 12,

    fontWeight: "700",
  },
  primaryButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    padding: 7,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },

  // OTP Modal
  otpModalContainer: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 28,
  },
  otpIconContainer: {
    alignSelf: "center",
    backgroundColor: Colors.primary + "15",
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  otpModalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
    marginBottom: 8,
  },
  otpSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    // marginBottom: 24,
    lineHeight: 20,
  },
  otpInputRow: {
    // flexDirection: "row",
    // justifyContent: "space-between",
    marginBottom: 20,
    gap: 8,
  },
  otpInputBox: {
    flex: 1,
    
    borderWidth: 2,
    borderColor: "#e5e7eb",
    borderRadius: 14,
    textAlign: "center",
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    backgroundColor: "#f9fafb",
  },
  otpTimerContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  otpTimerText: {
    fontSize: 14,
    color: "#6b7280",
  },
  resendOtpText: {
    fontSize: 15,
    color: Colors.primary,
    fontWeight: "700",
  },
  otpButtonRow: {
    flexDirection: "row",
    gap: 12,
  },
};
   