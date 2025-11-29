import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Image,
  Alert,
  ScrollView,
  Modal,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { Colors } from "../../../constant/ui";
import { Ionicons } from "@expo/vector-icons";
import BackWithLogo from "../../common/back_with_logo";
import { API_URL_APP } from "../../../constant/api";
import axios from "axios";
import { getFCMToken } from "../../../utils/NotificationService";
import * as Application from "expo-application";
import { useRoute } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { UniversalAlert } from "../../common/UniversalAlert";

const QUICKEKYC_API_KEY = "a43f4a59-8f3a-45dc-bcbd-5d2a4c512e73";
const AADHAAR_DATA_KEY = "aadhaar_verified_data";
const AADHAAR_EXPIRY_HOURS = 10;

export default function RegisterScreen({ navigation }) {
  const route = useRoute();
  const { step: routeStep, driver } = route.params || {};
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    type: "success",
    title: "",
    message: "",
    primaryButton: "OK",
    onPrimaryPress: () => setAlertVisible(false),
  });

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

  // === STEP & BASIC INFO ===
  const [currentStep, setCurrentStep] = useState(1);
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [name, setName] = useState("");
  const [dob, setDob] = useState(null);
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState("");
  const [address, setAddress] = useState({});
  const [profileImage, setProfileImage] = useState(null);
  const [referralId, setReferralId] = useState("");

  // === AADHAAR VERIFICATION ===
  const [isAadhaarVerified, setIsAadhaarVerified] = useState(false);
  const [aadhaarRequestId, setAadhaarRequestId] = useState(null);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(30);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  // === STEP 2: DOCUMENTS & DL VERIFICATION ===
  const [aadhaarFrontDoc, setAadhaarFrontDoc] = useState(null);
  const [aadhaarBackDoc, setAadhaarBackDoc] = useState(null);
  const [panDoc, setPanDoc] = useState(null);
  const [licenseFrontDoc, setLicenseFrontDoc] = useState(null);
  const [licenseBackDoc, setLicenseBackDoc] = useState(null);
  const [licenseNumber, setLicenseNumber] = useState("");
  const [isDLVerified, setIsDLVerified] = useState(false);
  const [dlData, setDlData] = useState(null);

  // === UI STATES ===
  const [showPicker, setShowPicker] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraMode, setCameraMode] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const otpRefs = [
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
  ];
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);

  // === LOAD CACHED AADHAAR DATA ===
  useEffect(() => {
    loadCachedAadhaarData();
  }, []);

  const loadCachedAadhaarData = async () => {
    try {
      const cachedData = await AsyncStorage.getItem(AADHAAR_DATA_KEY);
      if (cachedData) {
        const { data, timestamp, profileImageBase64 } = JSON.parse(cachedData);
        const now = new Date().getTime();
        const expiryTime = timestamp + AADHAAR_EXPIRY_HOURS * 60 * 60 * 1000;

        if (now < expiryTime) {
          // Data is still valid
          setAadhaarNumber(data.aadhaar_number);
          setName(data.full_name);
          setDob(new Date(data.dob));
          setGender(data.gender);
          setAddress(data.address);
          if (profileImageBase64) {
            setProfileImage(`data:image/jpeg;base64,${profileImageBase64}`);
          }
          setIsAadhaarVerified(true);
          Alert.alert("Success", "Aadhaar details loaded from cache");
        } else {
          // Data expired
          await AsyncStorage.removeItem(AADHAAR_DATA_KEY);
        }
      }
    } catch (error) {
      console.error("Error loading cached data:", error);
    }
  };

  const saveCachedAadhaarData = async (data, profileImageBase64) => {
    try {
      const cacheObject = {
        data,
        profileImageBase64,
        timestamp: new Date().getTime(),
      };
      await AsyncStorage.setItem(AADHAAR_DATA_KEY, JSON.stringify(cacheObject));
    } catch (error) {
      console.error("Error saving cached data:", error);
    }
  };

  // === TIMER FOR OTP ===
  useEffect(() => {
    let interval;
    if (showOtpModal && timer > 0) {
      interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [showOtpModal, timer]);

  // === ERROR HANDLING ===
  const setFieldError = (field, message) => {
    setErrors((prev) => ({ ...prev, [field]: message }));
  };

  const clearFieldError = (field) => {
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  };

  const renderError = (field) =>
    errors[field] ? (
      <Text style={styles.fieldError}>{errors[field]}</Text>
    ) : null;

  // === AADHAAR OTP GENERATION ===
  const handleGenerateAadhaarOTP = async () => {
    if (isVerifying) return;
    setErrors({});

    // Validate Aadhaar number
    if (!aadhaarNumber.match(/^\d{12}$/)) {
      return showAlert(
        "error",
        "Invalid Aadhaar",
        "Please enter a valid 12-digit Aadhaar number"
      );
    }

    setIsVerifying(true);

    try {
      const response = await axios.post(
        "https://api.quickekyc.com/api/v1/aadhaar-v2/generate-otp",
        {
          key: QUICKEKYC_API_KEY,
          id_number: aadhaarNumber,
        },
        {
          headers: { "Content-Type": "application/json" },
          timeout: 20000,
        }
      );

      if (response.data.status === "success" && response.data.data.otp_sent) {
        setAadhaarRequestId(response.data.request_id);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setShowOtpModal(true);
        setTimer(30);
        setOtp(["", "", "", "", "", ""]);

        // Show alert and navigate to company details
        showAlert(
          "success",
          "OTP Sent",
          "OTP sent successfully! Please verify otp for next step.",
          () => {
            setAlertVisible(false);
          }
        );
      } else {
        showAlert(
          "error",
          "OTP Failed",
          response.data.message || "Failed to send OTP. Please try again."
        );
      }
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        "Failed to send OTP. Please try again.";
      showAlert("error", "OTP Error", msg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsVerifying(false);
    }
  };

  // === AADHAAR OTP VERIFICATION ===
  const handleVerifyAadhaarOtp = async () => {
    if (isVerifying) return;

    const otpValue = otp.join("");
    if (otpValue.length !== 6) {
      return showAlert("error", "Invalid OTP", "Please enter a 6-digit OTP");
    }

    setIsVerifying(true);

    try {
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

        // Save to state
        setName(data.full_name);
        setDob(new Date(data.dob));
        setGender(data.gender);
        setAddress(data.address);

        if (data.profile_image) {
          setProfileImage(`data:image/jpeg;base64,${data.profile_image}`);
        }

        await saveCachedAadhaarData(data, data.profile_image);

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setShowOtpModal(false);
        setIsAadhaarVerified(true);
        setErrors({});

        showAlert(
          "success",
          "Aadhaar Verified",
          "Aadhaar verified successfully!"
        );
      } else {
        showAlert(
          "error",
          "OTP Verification Failed",
          response.data?.message || "Invalid OTP"
        );
      }
    } catch (error) {
      showAlert(
        "error",
        "Verification Error",
        error.response?.data?.message ||
          "Failed to verify Aadhaar. Please try again."
      );
    } finally {
      setIsVerifying(false);
    }
  };

  // === RESEND OTP ===
  const handleResendOtp = async () => {
    if (timer > 0 || isResending) return;
    setIsResending(true);
    setOtp(["", "", "", "", "", ""]);

    try {
      const response = await axios.post(
        "https://api.quickekyc.com/api/v1/aadhaar-v2/generate-otp",
        {
          key: QUICKEKYC_API_KEY,
          id_number: aadhaarNumber,
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
        showAlert(
          "success",
          "OTP Sent",
          "Aadhaar OTP has been resent successfully!"
        );
      } else {
        showAlert(
          "error",
          "Resend OTP Failed",
          response.data?.message || "Failed to resend OTP"
        );
      }
    } catch (error) {
      showAlert(
        "error",
        "Resend OTP Error",
        error.response?.data?.message ||
          "Failed to resend OTP. Please try again."
      );
    } finally {
      setIsResending(false);
    }
  };

  // === VERIFY DRIVING LICENSE ===
  const handleVerifyDL = async () => {
    if (!licenseNumber.trim()) {
      return showAlert(
        "error",
        "Invalid Input",
        "Enter driving license number"
      );
    }
    if (!dob) {
      return showAlert("error", "Invalid Input", "Date of birth required");
    }

    const BYPASS = false; // toggle for bypass mode
    const Dldata = {
      data: {
        license_number: "XXXXXXXXXX29000",
        state: "Maharashtra",
        name: "ANISH",
        permanent_address: "211, Matrix Park, Mumbai Pin-400001",
        permanent_zip: "400001",
        profile_image: "",
      },
      status: "success",
    };

    if (BYPASS) {
      const dlInfo = Dldata.data;
      setDlData(dlInfo);

      const aadhaarName = name.toLowerCase().trim();
      const dlName = dlInfo.name.toLowerCase().trim();

      if (aadhaarName !== dlName) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return showAlert(
          "error",
          "Name Mismatch",
          `Aadhaar name "${name}" does not match DL name "${dlInfo.name}"`
        );
      }

      if (dlInfo.permanent_address) {
        setAddress((prev) => ({
          ...prev,
          dl_address: dlInfo.permanent_address,
          dl_zip: dlInfo.permanent_zip,
        }));
      }

      setIsDLVerified(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return showAlert(
        "success",
        "DL Verified",
        "Driving License verified successfully! (BYPASS)"
      );
    }

    setIsVerifying(true);

    try {
      const response = await axios.post(
        "https://api.quickekyc.com/api/v1/driving-license/driving-license",
        {
          key: QUICKEKYC_API_KEY,
          id_number: licenseNumber,
          dob: dob.toISOString().split("T")[0],
        },
        {
          headers: { "Content-Type": "application/json" },
          timeout: 20000,
        }
      );

      if (response.data.status === "success") {
        const dlInfo = response.data.data;
        setDlData(dlInfo);

        const aadhaarName = name.toLowerCase().trim();
        const dlName = dlInfo.name.toLowerCase().trim();

        if (aadhaarName !== dlName) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          return showAlert(
            "error",
            "Name Mismatch",
            `Aadhaar name "${name}" does not match DL name "${dlInfo.name}"`
          );
        }

        if (dlInfo.permanent_address) {
          setAddress((prev) => ({
            ...prev,
            dl_address: dlInfo.permanent_address,
            dl_zip: dlInfo.permanent_zip,
          }));
        }

        setIsDLVerified(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showAlert(
          "success",
          "DL Verified",
          "Driving License verified successfully!"
        );
      } else {
        showAlert(
          "error",
          "Verification Failed",
          response.data?.message || "Failed to verify Driving License"
        );
      }
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showAlert(
        "error",
        "Verification Error",
        error.response?.data?.message ||
          "Failed to verify Driving License. Please try again."
      );
    } finally {
      setIsVerifying(false);
    }
  };

  // === SELFIE - CAMERA FOR PROFILE ===
  const changeProfilePicture = async () => {
    Alert.alert("Change Profile Picture", "Choose source", [
      {
        text: "Camera",
        onPress: async () => {
          if (!permission?.granted) {
            const { granted } = await requestPermission();
            if (!granted) {
              Alert.alert("Permission Required", "Camera access is needed.");
              return;
            }
          }
          Haptics.selectionAsync();
          setCameraMode("selfie");
          setCameraOpen(true);
        },
      },

      { text: "Cancel", style: "cancel" },
    ]);
  };
  // === DOCUMENT HANDLERS ===
  const openDocCamera = async (mode) => {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert("Permission Required", "Camera access is needed.");
        return;
      }
    }
    Haptics.selectionAsync();
    setCameraMode(mode);
    setCameraOpen(true);
  };

  const pickDocFromGallery = async (type) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled) {
      const asset = result.assets[0];
      const doc = {
        uri: asset.uri,
        name: `${type}.jpg`,
        mimeType: "image/jpeg",
      };
      saveDoc(doc, type);
    }
  };

  const pickDocFile = async (type) => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["image/*", "application/pdf"],
      copyToCacheDirectory: true,
    });
    if (!result.canceled) {
      saveDoc(result.assets[0], type);
    }
  };

  const saveDoc = (doc, type) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    switch (type) {
      case "aadhaar_front":
        setAadhaarFrontDoc(doc);
        break;
      case "aadhaar_back":
        setAadhaarBackDoc(doc);
        break;
      case "pan":
        setPanDoc(doc);
        break;
      case "license_front":
        setLicenseFrontDoc(doc);
        break;
      case "license_back":
        setLicenseBackDoc(doc);
        break;
    }
  };

  const pickDocument = (type) => {
    Alert.alert(
      `Upload ${
        type === "aadhaar_front"
          ? "Aadhaar Front"
          : type === "aadhaar_back"
          ? "Aadhaar Back"
          : type === "pan"
          ? "PAN"
          : type === "license_front"
          ? "License Front"
          : "License Back"
      }`,
      "Choose source",
      [
        { text: "Camera", onPress: () => openDocCamera(type) },
        { text: "Gallery", onPress: () => pickDocFromGallery(type) },
        { text: "Files (PDF)", onPress: () => pickDocFile(type) },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });

      if (cameraMode === "selfie") {
        setProfileImage(photo.uri);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        const doc = {
          uri: photo.uri,
          name: `${cameraMode}.jpg`,
          mimeType: "image/jpeg",
        };
        saveDoc(doc, cameraMode);
      }

      setCameraOpen(false);
      setCameraMode(null);
    }
  };

  // === STEP 1 SUBMIT ===
  const handleStep1Submit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setErrors({});

    if (!isAadhaarVerified) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return showAlert(
        "error",
        "Aadhaar Verification",
        "Please verify Aadhaar first"
      );
    }
    if (!aadhaarFrontDoc) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return showAlert("error", "Upload Required", "Upload Aadhaar front side");
    }
    if (!aadhaarBackDoc) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return showAlert("error", "Upload Required", "Upload Aadhaar back side");
    }

    setCurrentStep(2);
  };

  // === FINAL SUBMIT ===
  const handleStep2Submit = async () => {
    if (!isDLVerified) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return showAlert(
        "error",
        "DL Verification",
        "Verify Driving License first"
      );
    }
    if (!panDoc) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return showAlert("error", "Upload Required", "Upload PAN");
    }
    if (!licenseFrontDoc) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return showAlert("error", "Upload Required", "Upload License Front");
    }
    if (!licenseBackDoc) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return showAlert("error", "Upload Required", "Upload License Back");
    }

    setIsSubmitting(true);
    try {
      const fcmToken = (await getFCMToken()) || "";
      const deviceId = Application.getAndroidId();

      const formData = new FormData();
      formData.append("name", name);
      formData.append("dob", dob.toISOString().split("T")[0]);
      formData.append("mobile", mobile);
      formData.append("email", email);
      formData.append("gender", gender);
      formData.append("aadhaarNumber", aadhaarNumber);
      formData.append("dlNumber", licenseNumber);
      formData.append("address", JSON.stringify(address));
      if (fcmToken) formData.append("fcmToken", fcmToken);
      if (deviceId) formData.append("deviceId", deviceId);
      if (referralId) formData.append("referralId", referralId);

      if (profileImage && profileImage.startsWith("data:")) {
        formData.append("profilePicture", {
          uri: profileImage,
          type: "image/jpeg",
          name: "profile.jpg",
        });
      }

      if (aadhaarFrontDoc) {
        formData.append("aadhaarFrontDocument", {
          uri: aadhaarFrontDoc.uri,
          type: aadhaarFrontDoc.mimeType || "image/jpeg",
          name: aadhaarFrontDoc.name || "aadhaar_front.jpg",
        });
      }

      if (aadhaarBackDoc) {
        formData.append("aadhaarBackDocument", {
          uri: aadhaarBackDoc.uri,
          type: aadhaarBackDoc.mimeType || "image/jpeg",
          name: aadhaarBackDoc.name || "aadhaar_back.jpg",
        });
      }

      if (panDoc) {
        formData.append("panDocument", {
          uri: panDoc.uri,
          type: panDoc.mimeType || "application/pdf",
          name: panDoc.name || "pan.pdf",
        });
      }

      if (licenseFrontDoc) {
        formData.append("licenseFrontDocument", {
          uri: licenseFrontDoc.uri,
          type: licenseFrontDoc.mimeType || "image/jpeg",
          name: licenseFrontDoc.name || "license_front.jpg",
        });
      }

      if (licenseBackDoc) {
        formData.append("licenseBackDocument", {
          uri: licenseBackDoc.uri,
          type: licenseBackDoc.mimeType || "image/jpeg",
          name: licenseBackDoc.name || "license_back.jpg",
        });
      }

      const response = await axios.post(
        `${API_URL_APP}/api/v1/register-driver`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          timeout: 30000,
        }
      );

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const driverId = response?.data?.data?.driver_id;

      showAlert(
        "success",
        "Registration Completed",
        response.data.message || "Registration completed successfully!",
        () => navigation.navigate("addVehcile", { driverId })
      );
    } catch (error) {
      const msg = error.response?.data?.message || "Registration failed";
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showAlert("error", "Submission Failed", msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderProgressBar = () => (
    <View style={styles.progressContainer}>
      <View
        style={[
          styles.progressStep,
          currentStep >= 1 && styles.progressStepActive,
        ]}
      />
      <View
        style={[
          styles.progressStep,
          currentStep >= 2 && styles.progressStepActive,
        ]}
      />
      <View style={styles.progressStep} />
      <View style={styles.progressStep} />
    </View>
  );

  const renderOtpModal = () => (
    <Modal
      visible={showOtpModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowOtpModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Verify Aadhaar</Text>
          <Text style={styles.modalSubtitle}>
            Enter 6-digit OTP sent to your registered mobile
          </Text>

          <View style={styles.otpContainer}>
            {otp.map((d, i) => (
              <TextInput
                key={i}
                ref={otpRefs[i]}
                style={styles.otpInput}
                value={d}
                onChangeText={(v) => {
                  if (v.length > 1) return;
                  const newOtp = [...otp];
                  newOtp[i] = v;
                  setOtp(newOtp);
                  if (v && i < 5) otpRefs[i + 1].current?.focus();
                }}
                onKeyPress={(e) => {
                  if (e.nativeEvent.key === "Backspace" && !otp[i] && i > 0) {
                    otpRefs[i - 1].current?.focus();
                  }
                }}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
              />
            ))}
          </View>
          {renderError("otp")}

          <TouchableOpacity
            style={[styles.verifyButton, isVerifying && { opacity: 0.7 }]}
            onPress={handleVerifyAadhaarOtp}
            disabled={isVerifying}
          >
            {isVerifying ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.verifyButtonText}>Verify OTP</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resendContainer}
            onPress={handleResendOtp}
            disabled={timer > 0 || isResending}
          >
            <Text
              style={[
                styles.resendText,
                (timer > 0 || isResending) && styles.resendTextDisabled,
              ]}
            >
              {isResending
                ? "Sending..."
                : timer > 0
                ? `Resend in 00:${timer.toString().padStart(2, "0")}`
                : "Resend OTP"}
            </Text>
          </TouchableOpacity>
          {renderError("resend")}
        </View>
      </View>
    </Modal>
  );

  if (cameraOpen) {
    return (
      <View style={styles.fullScreen}>
        <CameraView
          ref={cameraRef}
          style={styles.fullScreen}
          facing={cameraMode === "selfie" ? "front" : "back"}
        >
          <View style={styles.cameraOverlay}>
            <TouchableOpacity
              style={styles.closeCamera}
              onPress={() => {
                setCameraOpen(false);
                setCameraMode(null);
              }}
            >
              <Ionicons name="close" size={32} color={Colors.white} />
            </TouchableOpacity>
            <Text style={styles.cameraInstruction}>
              {cameraMode === "selfie"
                ? "Position your face in the frame"
                : `Capture ${
                    cameraMode === "aadhaar_front"
                      ? "Aadhaar Front"
                      : cameraMode === "aadhaar_back"
                      ? "Aadhaar Back"
                      : cameraMode === "license_front"
                      ? "License Front"
                      : "License Back"
                  }`}
            </Text>
            <TouchableOpacity style={styles.captureBtn} onPress={takePicture}>
              <View style={styles.captureInner} />
            </TouchableOpacity>
          </View>
        </CameraView>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <BackWithLogo />
        {renderProgressBar()}

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {currentStep === 1 ? (
            <>
              <Text style={styles.title}>Verify Aadhaar</Text>
              <Text style={styles.subtitle}>
                Enter your Aadhaar number to begin
              </Text>

              {profileImage && (
                <TouchableOpacity
                  style={styles.avatarContainer}
                  onPress={changeProfilePicture}
                >
                  <Image source={{ uri: profileImage }} style={styles.avatar} />
                  <View style={styles.cameraBadge}>
                    <Ionicons name="camera" size={16} color={Colors.white} />
                  </View>
                </TouchableOpacity>
              )}

              <View style={styles.form}>
                <Text style={styles.label}>Aadhaar Number</Text>
                <View style={styles.inputWithButton}>
                  <TextInput
                    placeholder="Enter 12-digit Aadhaar"
                    value={aadhaarNumber}
                    onChangeText={(v) => {
                      setAadhaarNumber(v);
                      clearFieldError("aadhaarNumber");
                    }}
                    keyboardType="number-pad"
                    maxLength={12}
                    editable={!isAadhaarVerified}
                    style={[
                      styles.input,
                      styles.inputFlex,
                      isAadhaarVerified && { backgroundColor: "#f0f0f0" },
                    ]}
                  />
                  <TouchableOpacity
                    style={[
                      styles.verifyBtn,
                      isAadhaarVerified
                        ? styles.verifyBtnSuccess
                        : styles.verifyBtnNormal,
                      isVerifying && { opacity: 0.7 },
                    ]}
                    onPress={handleGenerateAadhaarOTP}
                    disabled={isAadhaarVerified || isVerifying}
                  >
                    {isVerifying ? (
                      <ActivityIndicator
                        size="small"
                        color={isAadhaarVerified ? "#fff" : Colors.primary}
                      />
                    ) : (
                      <Text
                        style={[
                          styles.verifyBtnText,
                          isAadhaarVerified && { color: "#fff" },
                        ]}
                      >
                        {isAadhaarVerified ? "Verified" : "Send OTP"}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
                {renderError("aadhaarNumber")}

                {isAadhaarVerified && (
                  <>
                    <Text style={styles.label}>Name (from Aadhaar)</Text>
                    <TextInput
                      value={name}
                      editable={false}
                      style={[styles.input, { backgroundColor: "#f0f0f0" }]}
                    />

                    <Text style={styles.label}>Date of Birth</Text>
                    <TextInput
                      value={dob ? dob.toLocaleDateString("en-GB") : ""}
                      editable={false}
                      style={[styles.input, { backgroundColor: "#f0f0f0" }]}
                    />

                    <Text style={styles.label}>Mobile</Text>
                    <TextInput
                      placeholder="Enter mobile number"
                      value={mobile}
                      onChangeText={setMobile}
                      keyboardType="phone-pad"
                      maxLength={10}
                      style={styles.input}
                    />

                    <Text style={styles.label}>Email</Text>
                    <TextInput
                      placeholder="email@domain.com"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      style={styles.input}
                    />

                    <Text style={styles.label}>Referral ID (Optional)</Text>
                    <TextInput
                      placeholder="Enter referral ID"
                      value={referralId}
                      onChangeText={setReferralId}
                      style={styles.input}
                    />

                    <Text style={styles.label}>Upload Aadhaar Card</Text>
                    <View style={styles.documentRow}>
                      <TouchableOpacity
                        style={[styles.uploadBoxHalf, styles.uploadBoxLeft]}
                        onPress={() => pickDocument("aadhaar_front")}
                      >
                        {aadhaarFrontDoc ? (
                          <Image
                            source={{ uri: aadhaarFrontDoc.uri }}
                            style={styles.docPreview}
                          />
                        ) : (
                          <>
                            <Ionicons
                              name="cloud-upload-outline"
                              size={24}
                              color={Colors.textSecondary}
                            />
                            <Text style={styles.uploadTextSmall}>
                              Front Side
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.uploadBoxHalf, styles.uploadBoxRight]}
                        onPress={() => pickDocument("aadhaar_back")}
                      >
                        {aadhaarBackDoc ? (
                          <Image
                            source={{ uri: aadhaarBackDoc.uri }}
                            style={styles.docPreview}
                          />
                        ) : (
                          <>
                            <Ionicons
                              name="cloud-upload-outline"
                              size={24}
                              color={Colors.textSecondary}
                            />
                            <Text style={styles.uploadTextSmall}>
                              Back Side
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                    {renderError("aadhaarFront")}
                    {renderError("aadhaarBack")}
                  </>
                )}

                {renderError("submit")}

                <TouchableOpacity
                  style={[
                    styles.nextButton,
                    !isAadhaarVerified && { backgroundColor: "#ccc" },
                  ]}
                  onPress={handleStep1Submit}
                  disabled={!isAadhaarVerified}
                >
                  <Text style={styles.nextText}>Next</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.title}>Upload Documents</Text>
              <Text style={styles.subtitle}>Complete your registration</Text>

              <View style={styles.form}>
                <Text style={styles.label}>PAN Card</Text>
                <TouchableOpacity
                  style={styles.uploadBox}
                  onPress={() => pickDocument("pan")}
                >
                  {panDoc ? (
                    <Image
                      source={{ uri: panDoc.uri }}
                      style={styles.docPreviewFull}
                    />
                  ) : (
                    <>
                      <Ionicons
                        name="cloud-upload-outline"
                        size={24}
                        color={Colors.textSecondary}
                      />
                      <Text style={styles.uploadText}>Upload PAN Card</Text>
                    </>
                  )}
                </TouchableOpacity>
                {renderError("pan")}

                <Text style={styles.label}>Driving Licence Number</Text>
                <View style={styles.inputWithButton}>
                  <TextInput
                    placeholder="Enter DL Number"
                    value={licenseNumber}
                    onChangeText={(v) => {
                      setLicenseNumber(v.toUpperCase());
                      clearFieldError("licenseNumber");
                    }}
                    autoCapitalize="characters"
                    editable={!isDLVerified}
                    style={[
                      styles.input,
                      styles.inputFlex,
                      isDLVerified && { backgroundColor: "#f0f0f0" },
                    ]}
                  />
                  <TouchableOpacity
                    style={[
                      styles.verifyBtn,
                      isDLVerified
                        ? styles.verifyBtnSuccess
                        : styles.verifyBtnNormal,
                      isVerifying && { opacity: 0.7 },
                    ]}
                    onPress={handleVerifyDL}
                    disabled={isDLVerified || isVerifying}
                  >
                    {isVerifying ? (
                      <ActivityIndicator
                        size="small"
                        color={isDLVerified ? "#fff" : Colors.primary}
                      />
                    ) : (
                      <Text
                        style={[
                          styles.verifyBtnText,
                          isDLVerified && { color: "#fff" },
                        ]}
                      >
                        {isDLVerified ? "Verified" : "Verify"}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
                {renderError("licenseNumber")}

                {isDLVerified && dlData && (
                  <>
                    <View style={styles.infoBox}>
                      <Text style={styles.infoLabel}>Name on DL:</Text>
                      <Text style={styles.infoValue}>{dlData.name}</Text>
                    </View>

                    {dlData.permanent_address && (
                      <View style={styles.infoBox}>
                        <Text style={styles.infoLabel}>Address:</Text>
                        <Text style={styles.infoValue}>
                          {dlData.permanent_address}
                        </Text>
                      </View>
                    )}

                    <Text style={styles.label}>Upload Driving Licence</Text>
                    <View style={styles.documentRow}>
                      <TouchableOpacity
                        style={[styles.uploadBoxHalf, styles.uploadBoxLeft]}
                        onPress={() => pickDocument("license_front")}
                      >
                        {licenseFrontDoc ? (
                          <Image
                            source={{ uri: licenseFrontDoc.uri }}
                            style={styles.docPreview}
                          />
                        ) : (
                          <>
                            <Ionicons
                              name="cloud-upload-outline"
                              size={24}
                              color={Colors.textSecondary}
                            />
                            <Text style={styles.uploadTextSmall}>
                              Front Side
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.uploadBoxHalf, styles.uploadBoxRight]}
                        onPress={() => pickDocument("license_back")}
                      >
                        {licenseBackDoc ? (
                          <Image
                            source={{ uri: licenseBackDoc.uri }}
                            style={styles.docPreview}
                          />
                        ) : (
                          <>
                            <Ionicons
                              name="cloud-upload-outline"
                              size={24}
                              color={Colors.textSecondary}
                            />
                            <Text style={styles.uploadTextSmall}>
                              Back Side
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                    {renderError("licenseFront")}
                    {renderError("licenseBack")}
                  </>
                )}

                {renderError("submit")}

                <TouchableOpacity
                  style={[
                    styles.nextButton,
                    (!isDLVerified || isSubmitting) && {
                      backgroundColor: "#ccc",
                    },
                  ]}
                  onPress={handleStep2Submit}
                  disabled={!isDLVerified || isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.nextText}>Submit Registration</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>

        {renderOtpModal()}
      </KeyboardAvoidingView>
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

// === STYLES ===
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { padding: 20 },
  progressContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 20,
  },
  progressStep: {
    flex: 1,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
  },
  progressStepActive: { backgroundColor: Colors.textPrimary },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: { fontSize: 16, color: Colors.textSecondary, marginBottom: 30 },
  avatarContainer: {
    alignSelf: "center",
    marginBottom: 20,
    position: "relative",
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  cameraBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: Colors.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: Colors.white,
  },
  form: { width: "100%" },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.textPrimary,
    marginBottom: 8,
    marginTop: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: Colors.white,
    marginBottom: 6,
  },
  inputWithButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 6,
  },
  inputFlex: { flex: 1, marginBottom: 0 },
  verifyBtn: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: "center",
    minWidth: 90,
  },
  verifyBtnNormal: {
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  verifyBtnSuccess: {
    backgroundColor: "#4CAF50",
    borderColor: "#4CAF50",
  },
  verifyBtnText: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    color: Colors.primary,
  },
  infoBox: {
    backgroundColor: "#f0f9ff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#bee3f8",
  },
  infoLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 4,
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 15,
    color: Colors.textPrimary,
    fontWeight: "600",
  },
  documentRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 6,
  },
  uploadBox: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    borderStyle: "dashed",
    padding: 20,
    alignItems: "center",
    backgroundColor: Colors.white,
    marginBottom: 6,
    height: 100,
    justifyContent: "center",
  },
  uploadBoxHalf: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    borderStyle: "dashed",
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.white,
    height: 120,
  },
  uploadBoxLeft: {
    marginRight: 5,
  },
  uploadBoxRight: {
    marginLeft: 5,
  },
  uploadText: {
    marginTop: 8,
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: "center",
  },
  uploadTextSmall: {
    marginTop: 6,
    color: Colors.textSecondary,
    fontSize: 13,
    textAlign: "center",
    fontWeight: "500",
  },
  docPreview: {
    width: "100%",
    height: 100,
    borderRadius: 8,
    resizeMode: "cover",
  },
  docPreviewFull: {
    width: "100%",
    height: 80,
    borderRadius: 8,
    resizeMode: "contain",
  },
  nextButton: {
    backgroundColor: Colors.primary,
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 20,
  },
  nextText: { color: Colors.white, fontSize: 18, fontWeight: "bold" },
  fieldError: {
    color: Colors.error,
    fontSize: 13,
    marginBottom: 8,
    marginLeft: 4,
  },
  fullScreen: { flex: 1 },
  cameraOverlay: {
    flex: 1,
    justifyContent: "space-between",
    paddingTop: 50,
    paddingBottom: 60,
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  closeCamera: {
    alignSelf: "flex-start",
    marginLeft: 20,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 20,
    padding: 8,
  },
  cameraInstruction: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "600",
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    textAlign: "center",
  },
  captureBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.white,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 6,
    borderColor: "rgba(255,255,255,0.4)",
  },
  captureInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.white,
    borderWidth: 4,
    borderColor: Colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 20,
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    gap: 10,
  },
  otpInput: {
    flex: 1,
    height: 56,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    fontSize: 20,
    textAlign: "center",
    backgroundColor: Colors.white,
    fontWeight: "600",
  },
  verifyButton: {
    backgroundColor: Colors.primary,
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 10,
    marginTop: 10,
  },
  verifyButtonText: { color: Colors.white, fontSize: 18, fontWeight: "bold" },
  resendContainer: { alignItems: "center", marginTop: 10 },
  resendText: { color: Colors.textPrimary, fontSize: 15, fontWeight: "500" },
  resendTextDisabled: { color: Colors.textSecondary },
});
