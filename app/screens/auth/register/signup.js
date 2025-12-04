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
import { CommonActions, useRoute } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { UniversalAlert } from "../../common/UniversalAlert";
import useSettings from "../../../hooks/Settings";

const AADHAAR_DATA_KEY = "aadhaar_verified_data";
const AADHAAR_EXPIRY_HOURS = 10;

export default function RegisterScreen({ navigation }) {
  const route = useRoute();
  const { step: routeStep, driver } = route.params || {};
  const [alertVisible, setAlertVisible] = useState(false);
  const { data, fetchSettings } = useSettings({ autoFetch: true });
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

  const [mobileVerified, setMobileVerified] = useState(false);
  const [showMobileOtpModal, setShowMobileOtpModal] = useState(false);
  const [mobileOtp, setMobileOtp] = useState(["", "", "", "", "", ""]);
  const [mobileTimer, setMobileTimer] = useState(0);
  const [isSendingMobileOtp, setIsSendingMobileOtp] = useState(false);
  const [isVerifyingMobileOtp, setIsVerifyingMobileOtp] = useState(false);

  const mobileOtpRefs = Array(6)
    .fill()
    .map(() => useRef(null));

  // === STATES ===
  const [currentStep, setCurrentStep] = useState(1);
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [mobile, setMobile] = useState("");
  const [name, setName] = useState("");
  const [dob, setDob] = useState(null);
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState("");
  const [address, setAddress] = useState({});
  const [profileImage, setProfileImage] = useState(null);
  const [referralId, setReferralId] = useState("");

  // Aadhaar Verification
  const [isAadhaarVerified, setIsAadhaarVerified] = useState(false);
  const [aadhaarRequestId, setAadhaarRequestId] = useState(null);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(30);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  // Documents & DL
  const [aadhaarFrontDoc, setAadhaarFrontDoc] = useState(null);
  const [aadhaarBackDoc, setAadhaarBackDoc] = useState(null);
  const [panDoc, setPanDoc] = useState(null);
  const [licenseFrontDoc, setLicenseFrontDoc] = useState(null);
  const [licenseBackDoc, setLicenseBackDoc] = useState(null);
  const [licenseNumber, setLicenseNumber] = useState("");
  const [isDLVerified, setIsDLVerified] = useState(false);
  const [dlData, setDlData] = useState(null);

  // UI & Camera
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraMode, setCameraMode] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const otpRefs = Array(6)
    .fill()
    .map(() => useRef(null));
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);

  const isByPass =
    data?.data?.ByPassApi === true || data?.ByPassApi === true ? true : false;

  useEffect(() => {
    const step = route?.params?.step; // safely get step from route.params
    fetchSettings();
    if (step === "step-1") {
      setIsAadhaarVerified(true);
      setCurrentStep(step);
    } else if (step) {
      setCurrentStep(step);
      setIsAadhaarVerified(false);
    }
  }, [route?.params]);

  // === TIMER ===
  useEffect(() => {
    let interval;
    if (showOtpModal && timer > 0) {
      interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [showOtpModal, timer]);

  // === ERROR HELPERS ===
  const setFieldError = (field, message) =>
    setErrors((prev) => ({ ...prev, [field]: message }));
  const clearFieldError = (field) =>
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  const renderError = (field) =>
    errors[field] ? (
      <Text style={styles.fieldError}>{errors[field]}</Text>
    ) : null;

  // === REDIRECT HANDLER ===
  const handleRedirect = (redirect, message, driver) => {
    console.log("redirect", redirect);
    let routeName = "";
    let params = {};
    console.log("redirect", redirect);
    switch (redirect) {
      case "step-1":
        routeName = "Signup";
        params = { step: 1, driver };

        // Pre-fill fields
        setName(driver.full_name || "");
        setDob(driver.dob ? new Date(driver.dob) : null);
        setGender(driver.gender || "");
        setAddress(driver.address || {});

        if (driver.profile_image) {
          setProfileImage(`data:image/jpeg;base64,${driver.profile_image}`);
        }

        setIsAadhaarVerified(true);

        // ❌ Do NOT redirect on step-1
        return;

      case "step-2":
        routeName = "Signup";
        params = { step: 2, driver };
        break;

      case "step-3":
        routeName = "addVehcile";
        params = { step: 3, driverId: driver?._id };
        break;

      case "step-4":
        routeName = "bankAdd";
        params = { step: 5, driverId: driver?._id };
        break;

      case "step-5":
        routeName = "wait_screen";
        params = { driverId: driver?._id };
        break;

      default:
        return;
    }

    // ✅ Redirect for all steps except step-1
    navigation.replace(routeName, params);
  };

  // === AADHAAR OTP GENERATE ===
  const handleGenerateAadhaarOTP = async () => {
    if (isVerifying) return;
    setErrors({});

    console.log("👉 handleGenerateAadhaarOTP() called");
    console.log("🔢 Aadhaar:", aadhaarNumber);
    console.log("📱 Mobile:", mobile);

    if (!/^\d{12}$/.test(aadhaarNumber)) {
      return showAlert(
        "error",
        "Invalid Aadhaar",
        "Enter a valid 12-digit Aadhaar number"
      );
    }
    if (!/^\d{10}$/.test(mobile)) {
      return showAlert(
        "error",
        "Invalid Mobile",
        "Enter a valid 10-digit mobile number"
      );
    }

    setIsVerifying(true);
    const deviceId = await Application.getAndroidId();

    try {
      const payload = {
        aadhaarNumber: aadhaarNumber.trim(),
        mobileNumber: mobile.trim(),
        device_id: deviceId,
        isByPass: data?.ByPassApi || false,
      };

      console.log("📤 Sending OTP Request Payload:", payload);

      const response = await axios.post(
        `${API_URL_APP}/api/v1/send-otp-on-aadhar`,
        payload,
        { headers: { "Content-Type": "application/json" }, timeout: 20000 }
      );

      console.log("📥 Full API Response:", response);
      const resData = response.data;

      console.log("📥 Response Data:", resData);

      if (resData.success && resData.request_id) {
        console.log(
          "✅ OTP sent successfully. Request ID:",
          resData.request_id
        );

        setAadhaarRequestId(resData.request_id);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setShowOtpModal(true);
        setTimer(30);
        setOtp(["", "", "", "", "", ""]);

        showAlert(
          "success",
          "OTP Sent",
          resData.message || "OTP sent successfully!"
        );
      } else {
        console.log("❌ OTP send failed. Server response:", resData);

        showAlert(
          resData.success ? "success" : "error",
          "OTP Failed",
          resData.message || "Failed to send OTP. Please try again."
        );

        const redirect = resData?.aadhaarData?.redirect || resData.redirect;
        const message = resData?.aadhaarData?.message || resData.message;
        const driver = resData?.aadhaarData || resData.driver;

        console.log("🔁 Redirecting:", { redirect, message, driver });

        handleRedirect(redirect, message, driver);
      }
    } catch (error) {
      console.log("🔥 ERROR in Aadhaar OTP API:", error);
      console.log("🔥 Error Response:", error.response?.data);

      const msg =
        error.response?.data?.message ||
        "Failed to send OTP. Please try again.";

      const errData = error.response?.data || {};

      // Extract redirect info if error contains redirect & driver
      const redirect =
        errData.redirect || errData?.aadhaarData?.redirect || null;

      const message =
        errData.message ||
        errData?.aadhaarData?.message ||
        "Failed to send OTP.";

      const driver = errData.driver || errData?.aadhaarData || null;

      console.log("⚠️ Extracted From Error:", { redirect, message, driver });
      if (redirect) {
        console.log("🔁 Redirecting from catch block");
        handleRedirect(redirect, message, driver);
        return; // stop further alerts
      }
      showAlert("warning", "Error", msg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      console.log("🔚 Verification process ended");
      setIsVerifying(false);
    }
  };

  // === VERIFY AADHAAR OTP ===
  const handleVerifyAadhaarOtp = async () => {
    if (isVerifying) return;
    const otpValue = otp.join("");
    if (otpValue.length !== 6)
      return showAlert("error", "Invalid OTP", "Enter 6-digit OTP");

    setIsVerifying(true);
    const deviceId = await Application.getAndroidId();

    try {
      const response = await axios.post(
        `${API_URL_APP}/api/v1/verify-otp-on-aadhar`,
        {
          request_id: aadhaarRequestId,
          otp: otpValue,
          deviceId,
          aadhaarNumber,
          mobile,
          isByPass,
        },
        { timeout: 20000 }
      );

      if (response.data.success) {
        const { aadhaarData, isNewDriver, message, driver } = response.data;

        setName(aadhaarData.full_name || "");
        setDob(aadhaarData.dob ? new Date(aadhaarData.dob) : null);
        setGender(aadhaarData.gender || "");
        setAddress(aadhaarData.address || {});
        if (aadhaarData.profile_image) {
          setProfileImage(
            `data:image/jpeg;base64,${aadhaarData.profile_image}`
          );
        }

        await AsyncStorage.setItem(
          AADHAAR_DATA_KEY,
          JSON.stringify({
            data: aadhaarData,
            profileImageBase64: aadhaarData.profile_image,
            timestamp: Date.now(),
          })
        );

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setShowOtpModal(false);
        setIsAadhaarVerified(true);

        if (!isNewDriver) {
          navigation.navigate("DriverHome", { driver });
        } else {
          setCurrentStep(1);
        }
        showAlert(
          "success",
          "Verified",
          message || "Aadhaar verified successfully!"
        );
      } else {
        showAlert(
          "error",
          "Invalid OTP",
          response.data.message || "Please try again"
        );
      }
    } catch (error) {
      showAlert(
        "error",
        "Error",
        error.response?.data?.message || "Verification failed"
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
    await handleGenerateAadhaarOTP();
    setIsResending(false);
  };

  // === VERIFY DRIVING LICENSE ===
  const handleVerifyDL = async () => {
    if (!licenseNumber.trim())
      return showAlert("error", "Required", "Enter DL number");
    if (!dob) return showAlert("error", "Required", "DOB is required");

    setIsVerifying(true);
    const deviceId = await Application.getAndroidId();

    try {
      const response = await axios.post(
        `${API_URL_APP}/api/v1/verify-dl`,
        {
          licenseNumber: licenseNumber.trim(),
          dob,
          aadhaarName: name.trim(),
          deviceId,
          aadhaarNumber,
          isByPass,
        },
        { timeout: 20000 }
      );

      if (response.data.success) {
        const { dlData, address } = response.data;
        setDlData(dlData);
        setIsDLVerified(true);
        if (dlData.permanent_address) {
          setAddress((prev) => ({
            ...prev,
            dl_address: dlData.permanent_address,
            dl_zip: dlData.permanent_zip,
          }));
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showAlert(
          "success",
          "DL Verified",
          "Driving license verified successfully"
        );
      } else {
        showAlert(
          "error",
          "Failed",
          response.data.message || "Invalid DL details"
        );
      }
    } catch (error) {
      showAlert(
        "error",
        "Error",
        error.response?.data?.message || "DL verification failed"
      );
    } finally {
      setIsVerifying(false);
    }
  };

  // === CAMERA & DOCUMENT PICKER ===
  const openDocCamera = async (mode) => {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted)
        return Alert.alert("Permission Needed", "Camera access required");
    }
    setCameraMode(mode);
    setCameraOpen(true);
  };

  // Send Mobile OTP
  const handleSendMobileOtp = async () => {
    if (!/^\d{10}$/.test(mobile)) {
      return showAlert(
        "error",
        "Invalid Mobile",
        "Enter valid 10-digit number"
      );
    }

    const deviceId = await Application.getAndroidId();

    setIsSendingMobileOtp(true);
    try {
      const res = await axios.post(`${API_URL_APP}/api/v1/send-mobile-otp`, {
        number: mobile.trim(),
        device_id: deviceId,
      });

      // अब success: true हो सकता है redirect के साथ भी!
      if (res.data.success) {
        // 1. Direct home login
        if (res.data.alreadyVerified || res.data.redirect === "home") {
          showAlert(
            "success",
            "Welcome Back! Number already registered",
            "Please Login ",
            () => {
              navigation.replace("AuthLogin", { driver: res.data.driver });
            }
          );
          return;
        }

        // 2. Redirect to any step
        if (res.data.redirect) {
          const redirect = res.data.redirect;
          const driver = res.data.driver;
          const message = res.data.message;

          showAlert("info", "Action Required", message, () => {
            handleRedirect(redirect, message, driver);
          });
          return;
        }

        // 3. OTP sent (first time)
        if (res.data.message?.includes("OTP")) {
          setShowMobileOtpModal(true);
          setMobileTimer(30);
          setMobileOtp(["", "", "", "", "", ""]);
          showAlert("success", "OTP Sent", "Check your SMS");
        }
      }
    } catch (error) {
      console.log("API Error:", error.response?.data);

      const errData = error.response?.data || {};

      // अब catch में सिर्फ real error आएगा
      if (errData.redirect) {
        showAlert(
          "info",
          "Continue Registration",
          errData.message || "Please complete your profile",
          () => {
            handleRedirect(errData.redirect, errData.message, errData.driver);
          }
        );
      } else {
        showAlert(
          "error",
          "Error",
          errData.message || "Network error. Try again."
        );
      }
    } finally {
      setIsSendingMobileOtp(false);
    }
  };

  useEffect(() => {
    let interval;
    if (showMobileOtpModal && mobileTimer > 0) {
      interval = setInterval(() => setMobileTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [showMobileOtpModal, mobileTimer]);
  // Verify Mobile OTP
  const handleVerifyMobileOtp = async () => {
    const otp = mobileOtp.join("");
    if (otp.length !== 6)
      return showAlert("error", "Invalid", "Enter 6-digit OTP");

    setIsVerifyingMobileOtp(true);
    try {
      const res = await axios.post(`${API_URL_APP}/api/v1/verify-mobile-otp`, {
        mobileNumber: mobile.trim(),
        otp,
      });

      if (res.data.success) {
        setMobileVerified(true);
        setShowMobileOtpModal(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showAlert(
          "success",
          "Verified!",
          "Mobile number verified successfully"
        );
      } else {
        showAlert("error", "Invalid OTP", res.data.message || "Try again");
      }
    } catch (error) {
      console.log("error.response?.data", error.response?.data);
      const errData = error.response?.data || {};

      // Extract redirect info if error contains redirect & driver
      const redirect =
        errData.redirect || errData?.aadhaarData?.redirect || null;
      if (redirect) {
        console.log("🔁 Redirecting from catch block");
        handleRedirect(redirect, message, driver);
        return; // stop further alerts
      }
      showAlert("error", "Error", error.response?.data?.message || "Failed");
    } finally {
      setIsVerifyingMobileOtp(false);
    }
  };

  const pickDocFromGallery = async (type) => {
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
    if (!result.canceled) {
      const asset = result.assets[0];
      saveDoc(
        { uri: asset.uri, name: `${type}.jpg`, mimeType: "image/jpeg" },
        type
      );
    }
  };

  const pickDocFile = async (type) => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["image/*", "application/pdf"],
    });
    if (!result.canceled) saveDoc(result.assets[0], type);
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
    const labels = {
      aadhaar_front: "Aadhaar Front",
      aadhaar_back: "Aadhaar Back",
      pan: "PAN",
      license_front: "License Front",
      license_back: "License Back",
    };
    Alert.alert(`Upload ${labels[type]}`, "Choose source", [
      { text: "Camera", onPress: () => openDocCamera(type) },
      { text: "Gallery", onPress: () => pickDocFromGallery(type) },
      { text: "Files (PDF)", onPress: () => pickDocFile(type) },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const takePicture = async () => {
    if (!cameraRef.current) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });

    if (cameraMode === "selfie") {
      setProfileImage(photo.uri);
    } else {
      saveDoc(
        { uri: photo.uri, name: `${cameraMode}.jpg`, mimeType: "image/jpeg" },
        cameraMode
      );
    }
    setCameraOpen(false);
    setCameraMode(null);
  };

  // === SUBMIT STEPS ===
  const handleStep1Submit = () => {
    if (!isAadhaarVerified)
      return showAlert("error", "Required", "Verify Aadhaar first");
    if (!aadhaarFrontDoc || !aadhaarBackDoc)
      return showAlert("error", "Required", "Upload both sides of Aadhaar");
    setCurrentStep(2);
  };

  const handleStep2Submit = async () => {
    if (!isDLVerified)
      return showAlert("error", "Required", "Verify Driving License");
    if (!panDoc || !licenseFrontDoc || !licenseBackDoc)
      return showAlert("error", "Required", "Upload all documents");

    setIsSubmitting(true);
    const fcmToken = (await getFCMToken()) || "";
    const deviceId = await Application.getAndroidId();

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
    if (
      profileImage?.startsWith("data:") ||
      profileImage?.includes("file://")
    ) {
      formData.append("profilePicture", {
        uri: profileImage,
        type: "image/jpeg",
        name: "profile.jpg",
      });
    }

    [
      "aadhaarFrontDocument",
      "aadhaarBackDocument",
      "panDocument",
      "licenseFrontDocument",
      "licenseBackDocument",
    ].forEach((key) => {
      const doc = {
        aadhaarFrontDocument: aadhaarFrontDoc,
        aadhaarBackDocument: aadhaarBackDoc,
        panDocument: panDoc,
        licenseFrontDocument: licenseFrontDoc,
        licenseBackDocument: licenseBackDoc,
      }[key];
      if (doc) {
        formData.append(key, {
          uri: doc.uri,
          type: doc.mimeType || "image/jpeg",
          name: doc.name || `${key}.jpg`,
        });
      }
    });

    try {
      const response = await axios.post(
        `${API_URL_APP}/api/v1/register-driver`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          timeout: 30000,
        }
      );

      const driverId = response.data?.data?.driver_id;
      showAlert(
        "success",
        "Success",
        response.data.message || "Registration successful!",
        () => navigation.navigate("addVehcile", { driverId })
      );
    } catch (error) {
      showAlert(
        "error",
        "Failed",
        error.response?.data?.message || "Registration failed"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // === RENDER PROGRESS ===
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

  // === OTP MODAL ===
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
          <Text style={styles.modalTitle}>Enter OTP</Text>
          <Text style={styles.modalSubtitle}>
            6-digit OTP sent to your mobile
          </Text>
          <View style={styles.otpContainer}>
            {otp.map((digit, i) => (
              <TextInput
                key={i}
                ref={otpRefs[i]}
                style={styles.otpInput}
                value={digit}
                onChangeText={(v) => {
                  if (v.length > 1) return;
                  const newOtp = [...otp];
                  newOtp[i] = v;
                  setOtp(newOtp);
                  if (v && i < 5) otpRefs[i + 1].current?.focus();
                }}
                onKeyPress={(e) =>
                  e.nativeEvent.key === "Backspace" &&
                  !otp[i] &&
                  i > 0 &&
                  otpRefs[i - 1].current?.focus()
                }
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
              />
            ))}
          </View>
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
                ? "Take Selfie"
                : `Capture ${cameraMode.replace(/_/g, " ")}`}
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
          {/* ==================== STEP 1: MOBILE VERIFICATION ==================== */}
          {!mobileVerified ? (
            <>
              <Text style={styles.title}>Welcome! Let's get started</Text>
              <Text style={styles.subtitle}>
                Enter your mobile number to continue
              </Text>

              <View style={styles.form}>
                <Text style={styles.label}>Mobile Number *</Text>
                <TextInput
                  placeholder="Enter 10-digit mobile"
                  value={mobile}
                  onChangeText={setMobile}
                  keyboardType="phone-pad"
                  maxLength={10}
                  style={styles.input}
                />

                <TouchableOpacity
                  style={[
                    styles.nextButton,
                    (!mobile || mobile.length !== 10 || isSendingMobileOtp) && {
                      backgroundColor: "#ccc",
                    },
                  ]}
                  onPress={handleSendMobileOtp}
                  disabled={
                    !mobile || mobile.length !== 10 || isSendingMobileOtp
                  }
                >
                  {isSendingMobileOtp ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.nextText}>Send OTP</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          ) : !isAadhaarVerified ? (
            /* ==================== STEP 2: AADHAAR VERIFICATION ==================== */
            <>
              <Text style={styles.title}>Verify Aadhaar</Text>
              <Text style={styles.subtitle}>
                Your mobile is verified. Now enter Aadhaar details
              </Text>

              <View style={styles.form}>
                <Text style={styles.label}>Aadhaar Number *</Text>
                <TextInput
                  placeholder="12-digit Aadhaar number"
                  value={aadhaarNumber}
                  onChangeText={setAadhaarNumber}
                  keyboardType="number-pad"
                  maxLength={12}
                  style={styles.input}
                />

                <TouchableOpacity
                  style={[
                    styles.nextButton,
                    (!aadhaarNumber ||
                      aadhaarNumber.length !== 12 ||
                      isVerifying) && {
                      backgroundColor: "#ccc",
                    },
                  ]}
                  onPress={handleGenerateAadhaarOTP}
                  disabled={
                    !aadhaarNumber || aadhaarNumber.length !== 12 || isVerifying
                  }
                >
                  {isVerifying ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.nextText}>Send Aadhaar OTP</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          ) : currentStep === 1 ? (
            /* ==================== STEP 3: AADHAAR VERIFIED + DOCUMENTS ==================== */
            <>
              {/* Profile Picture */}
              {profileImage && (
                <TouchableOpacity
                  style={styles.avatarContainer}
                  onPress={() => {
                    setCameraMode("selfie");
                    setCameraOpen(true);
                  }}
                >
                  <Image source={{ uri: profileImage }} style={styles.avatar} />
                  <View style={styles.cameraBadge}>
                    <Ionicons name="camera" size={16} color={Colors.white} />
                  </View>
                </TouchableOpacity>
              )}

              <Text style={styles.label}>Name</Text>
              <TextInput
                value={name}
                editable={false}
                style={[styles.input, { backgroundColor: "#f0f0f0" }]}
              />

              <Text style={styles.label}>Date of Birth</Text>
              <TextInput
                value={dob?.toLocaleDateString("en-GB") || ""}
                editable={false}
                style={[styles.input, { backgroundColor: "#f0f0f0" }]}
              />

              <Text style={styles.label}>Email (Optional)</Text>
              <TextInput
                placeholder="email@domain.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                style={styles.input}
              />

              <Text style={styles.label}>Referral ID (Optional)</Text>
              <TextInput
                placeholder="Enter referral code"
                value={referralId}
                onChangeText={setReferralId}
                style={styles.input}
              />

              {/* Aadhaar Upload */}
              <Text style={styles.label}>Upload Aadhaar *</Text>
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
                      <Text style={styles.uploadTextSmall}>Front</Text>
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
                      <Text style={styles.uploadTextSmall}>Back</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.nextButton}
                onPress={handleStep1Submit}
              >
                <Text style={styles.nextText}>Next</Text>
              </TouchableOpacity>
            </>
          ) : (
            /* ==================== STEP 4: FINAL DOCUMENTS & DL ==================== */
            <>
              <Text style={styles.title}>Upload Documents</Text>
              <Text style={styles.subtitle}>Complete your registration</Text>

              {/* PAN */}
              <Text style={styles.label}>PAN Card *</Text>
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
                    <Text style={styles.uploadText}>Upload PAN</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* DL Verification */}
              <Text style={styles.label}>Driving License Number *</Text>
              <View style={styles.inputWithButton}>
                <TextInput
                  placeholder="Enter DL Number"
                  value={licenseNumber}
                  onChangeText={(v) => setLicenseNumber(v.toUpperCase())}
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

              {/* DL Details */}
              {isDLVerified && dlData && (
                <>
                  <View style={styles.infoBox}>
                    <Text style={styles.infoLabel}>Name:</Text>
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
                </>
              )}

              {/* DL Upload */}
              {isDLVerified && (
                <>
                  <Text style={styles.label}>Upload Driving License *</Text>
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
                          <Text style={styles.uploadTextSmall}>Front</Text>
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
                          <Text style={styles.uploadTextSmall}>Back</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              )}

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
            </>
          )}
        </ScrollView>

        {/* Mobile OTP Modal */}
        <Modal visible={showMobileOtpModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Verify Mobile Number</Text>
              <Text style={styles.modalSubtitle}>
                Enter 6-digit OTP sent to +91 {mobile}
              </Text>

              <View style={styles.otpContainer}>
                {mobileOtp.map((digit, i) => (
                  <TextInput
                    key={i}
                    ref={mobileOtpRefs[i]}
                    style={styles.otpInput}
                    value={digit}
                    onChangeText={(v) => {
                      if (v.length > 1) return;
                      const newOtp = [...mobileOtp];
                      newOtp[i] = v;
                      setMobileOtp(newOtp);
                      if (v && i < 5) mobileOtpRefs[i + 1].current?.focus();
                    }}
                    onKeyPress={(e) =>
                      e.nativeEvent.key === "Backspace" &&
                      !mobileOtp[i] &&
                      i > 0 &&
                      mobileOtpRefs[i - 1].current?.focus()
                    }
                    keyboardType="number-pad"
                    maxLength={1}
                  />
                ))}
              </View>

              <TouchableOpacity
                style={[
                  styles.verifyButton,
                  isVerifyingMobileOtp && { opacity: 0.7 },
                ]}
                onPress={handleVerifyMobileOtp}
              >
                {isVerifyingMobileOtp ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.verifyButtonText}>Verify & Continue</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.resendContainer}
                onPress={handleSendMobileOtp}
                disabled={mobileTimer > 0}
              >
                <Text
                  style={[
                    styles.resendText,
                    mobileTimer > 0 && styles.resendTextDisabled,
                  ]}
                >
                  {mobileTimer > 0
                    ? `Resend in 00:${mobileTimer.toString().padStart(2, "0")}`
                    : "Resend OTP"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Aadhaar OTP Modal (पुराना वाला) */}
        {renderOtpModal()}

        {/* Camera View */}
        {cameraOpen && (
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
                    ? "Take Selfie"
                    : `Capture ${cameraMode.replace(/_/g, " ")}`}
                </Text>
                <TouchableOpacity
                  style={styles.captureBtn}
                  onPress={takePicture}
                >
                  <View style={styles.captureInner} />
                </TouchableOpacity>
              </View>
            </CameraView>
          </View>
        )}

        <UniversalAlert
          visible={alertVisible}
          type={alertConfig.type}
          title={alertConfig.title}
          message={alertConfig.message}
          primaryButton={alertConfig.primaryButton}
          onPrimaryPress={alertConfig.onPrimaryPress}
          onClose={() => setAlertVisible(false)}
        />
      </KeyboardAvoidingView>
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
    justifyContent: "center", // ← center में
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxWidth: 380,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
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
