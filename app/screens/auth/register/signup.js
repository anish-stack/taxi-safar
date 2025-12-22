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
import DateTimePicker from "@react-native-community/datetimepicker";
import { moderateScale, scale, verticalScale } from "react-native-size-matters";

const AADHAAR_DATA_KEY = "aadhaar_verified_data";
const REGISTRATION_STATE_KEY = "registration_progress_state";

// DL Verification Status
const DL_STATUS = {
  NOT_VERIFIED: "NOT_VERIFIED",
  VERIFIED: "VERIFIED",
  PENDING_VERIFICATION: "PENDING_VERIFICATION",
  FAILED: "FAILED",
};

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

  // Mobile Verification States
  const [mobileVerified, setMobileVerified] = useState(false);
  const [showMobileOtpModal, setShowMobileOtpModal] = useState(false);
  const [mobileOtp, setMobileOtp] = useState("");
  const [mobileTimer, setMobileTimer] = useState(0);
  const [isSendingMobileOtp, setIsSendingMobileOtp] = useState(false);
  const [isVerifyingMobileOtp, setIsVerifyingMobileOtp] = useState(false);

  const mobileOtpRefs = Array(6)
    .fill()
    .map(() => useRef(null));

  // Registration States
  const [currentStep, setCurrentStep] = useState(0); // 0=mobile, 1=aadhaar, 2=docs, 3=dl
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [mobile, setMobile] = useState("");
  const [name, setName] = useState("");
  const [dob, setDob] = useState(null);
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState("");
  const [address, setAddress] = useState("");
  const [profileImage, setProfileImage] = useState(null);
  const [referralId, setReferralId] = useState("");
  const [aadharData, setAadharData] = useState(null);
  // Aadhaar Verification
  const [isAadhaarVerified, setIsAadhaarVerified] = useState(false);
  const [aadhaarRequestId, setAadhaarRequestId] = useState(null);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otp, setOtp] = useState("");
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
  const [dobLicence, setDobLicence] = useState(null);

  const [showDatePicker, setShowDatePicker] = useState(false);

  const [dlVerificationStatus, setDlVerificationStatus] = useState(
    DL_STATUS.NOT_VERIFIED
  );
  const [dlData, setDlData] = useState(null);
  const [showDLInfoModal, setShowDLInfoModal] = useState(false);

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

  const isByPass = data?.data?.ByPassApi === true || data?.ByPassApi === true;

  // ✅ SAVE REGISTRATION STATE TO STORAGE
  const saveRegistrationState = async () => {
    try {
      const state = {
        currentStep,
        mobileVerified,
        isAadhaarVerified,
        mobile,
        aadhaarNumber,
        name,
        dob: dob?.toISOString(),
        email,
        gender,
        address,
        profileImage,
        licenseNumber,
        dlVerificationStatus,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(REGISTRATION_STATE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error("Failed to save registration state:", error);
    }
  };

  // ✅ LOAD REGISTRATION STATE FROM STORAGE
  const loadRegistrationState = async () => {
    try {
      const saved = await AsyncStorage.getItem(REGISTRATION_STATE_KEY);
      if (saved) {
        const state = JSON.parse(saved);
        // Only restore if less than 24 hours old
        if (Date.now() - state.timestamp < 24 * 60 * 60 * 1000) {
          setCurrentStep(state.currentStep || 0);
          setMobileVerified(state.mobileVerified || false);
          setIsAadhaarVerified(state.isAadhaarVerified || false);
          setMobile(state.mobile || "");
          setAadhaarNumber(state.aadhaarNumber || "");
          setName(state.name || "");
          setDob(state.dob ? new Date(state.dob) : null);
          setEmail(state.email || "");
          setGender(state.gender || "");
          setAddress(state.address || "");
          setProfileImage(state.profileImage || null);
          setLicenseNumber(state.licenseNumber || "");
          setDlVerificationStatus(
            state.dlVerificationStatus || DL_STATUS.NOT_VERIFIED
          );
        }
      }
    } catch (error) {
      console.error("Failed to load registration state:", error);
    }
  };

  // ✅ CLEAR REGISTRATION STATE
  const clearRegistrationState = async (screen) => {
    try {
      await AsyncStorage.removeItem(REGISTRATION_STATE_KEY);
      navigation.replace(screen);
    } catch (error) {
      console.error("Failed to clear registration state:", error);
    }
  };

  // ✅ AUTO-SAVE STATE ON CHANGES
  useEffect(() => {
    if (mobileVerified || isAadhaarVerified) {
      saveRegistrationState();
    }
  }, [
    currentStep,
    mobileVerified,
    isAadhaarVerified,
    mobile,
    aadhaarNumber,
    name,
    dob,
    email,
    gender,
    address,
    licenseNumber,
    dlVerificationStatus,
  ]);

  // ✅ LOAD STATE ON MOUNT
  useEffect(() => {
    loadRegistrationState();
    fetchSettings();

    const step = route?.params?.step;
    if (step === "step-1") {
      setIsAadhaarVerified(true);
      setCurrentStep(2);
    } else if (step) {
      setCurrentStep(parseInt(step) || 0);
    }
  }, []);

  // Timer for Aadhaar OTP
  useEffect(() => {
    let interval;
    if (showOtpModal && timer > 0) {
      interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [showOtpModal, timer]);

  // Timer for Mobile OTP
  useEffect(() => {
    let interval;
    if (showMobileOtpModal && mobileTimer > 0) {
      interval = setInterval(() => setMobileTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [showMobileOtpModal, mobileTimer]);

  const formatDate = (date) => {
    return date.toISOString().split("T")[0]; // YYYY-MM-DD
  };
  // === REDIRECT HANDLER ===
  const handleRedirect = (redirect, message, driver) => {
    let routeName = "";
    let params = {};

    switch (redirect) {
      case "step-1":
        setName(driver.full_name || "");
        setDob(driver.dob ? new Date(driver.dob) : null);
        setGender(driver.gender || "");
        const addr = driver.address
          ? [
              driver.address.house,
              driver.address.loc,
              driver.address.vtc,
              driver.address.subdist,
              driver.address.dist,
              driver.address.state,
              driver.address.country,
            ]
              .filter(Boolean)
              .join(", ")
          : "";
        setAddress(addr);
        if (driver.profile_image) {
          setProfileImage(`data:image/jpeg;base64,${driver.profile_image}`);
        }
        setIsAadhaarVerified(true);
        setMobileVerified(true);
        setCurrentStep(2);
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

    navigation.replace(routeName, params);
  };

  // === SEND MOBILE OTP ===
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

      if (res.data.success) {
        if (res.data.alreadyVerified || res.data.redirect === "home") {
          showAlert(
            "success",
            "Welcome Back!",
            "Number already registered. Please Login",
            () => {
              navigation.replace("AuthLogin", { driver: res.data.driver });
            }
          );
          return;
        }

        if (res.data.redirect) {
          showAlert("info", "Action Required", res.data.message, () => {
            handleRedirect(
              res.data.redirect,
              res.data.message,
              res.data.driver
            );
          });
          return;
        }

        if (res.data.message?.includes("OTP")) {
          setShowMobileOtpModal(true);
          setMobileTimer(30);
          setMobileOtp("");
        }
      }
    } catch (error) {
      const errData = error.response?.data || {};
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

  // === VERIFY MOBILE OTP ===
  const handleVerifyMobileOtp = async () => {
    if (mobileOtp.length !== 6) {
      return showAlert("error", "Invalid", "Enter 6-digit OTP");
    }

    setIsVerifyingMobileOtp(true);
    try {
      const res = await axios.post(`${API_URL_APP}/api/v1/verify-mobile-otp`, {
        mobileNumber: mobile.trim(),
        otp: mobileOtp,
      });

      if (res.data.success) {
        setMobileVerified(true);
        setShowMobileOtpModal(false);
        setCurrentStep(1);
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
      const errData = error.response?.data || {};
      if (errData.redirect) {
        handleRedirect(errData.redirect, errData.message, errData.driver);
        return;
      }
      showAlert("error", "Error", errData.message || "Failed");
    } finally {
      setIsVerifyingMobileOtp(false);
    }
  };

  // === GENERATE AADHAAR OTP ===
  const handleGenerateAadhaarOTP = async () => {
    if (isVerifying) return;
    setErrors({});

    if (!/^\d{12}$/.test(aadhaarNumber)) {
      return showAlert(
        "error",
        "Invalid Aadhaar",
        "Enter a valid 12-digit Aadhaar number"
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

      const response = await axios.post(
        `${API_URL_APP}/api/v1/send-otp-on-aadhar`,
        payload,
        {
          headers: { "Content-Type": "application/json" },
          timeout: 20000,
        }
      );

      const resData = response.data;

      if (resData.success && resData.request_id) {
        setAadhaarRequestId(resData.request_id);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setShowOtpModal(true);
        setTimer(30);
        setOtp("");
        showAlert(
          "success",
          "OTP Sent",
          resData.message || "OTP sent successfully!"
        );
      } else {
        showAlert(
          resData.success ? "success" : "error",
          "OTP Failed",
          resData.message || "Failed to send OTP"
        );
        const redirect = resData?.aadhaarData?.redirect || resData.redirect;
        const message = resData?.aadhaarData?.message || resData.message;
        const driver = resData?.aadhaarData || resData.driver;
        handleRedirect(redirect, message, driver);
      }
    } catch (error) {
      const errData = error.response?.data || {};
      const redirect =
        errData.redirect || errData?.aadhaarData?.redirect || null;
      const message =
        errData.message ||
        errData?.aadhaarData?.message ||
        "Failed to send OTP.";
      const driver = errData.driver || errData?.aadhaarData || null;

      if (redirect) {
        handleRedirect(redirect, message, driver);
        return;
      }
      showAlert("warning", "Error", message);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsVerifying(false);
    }
  };

  // === VERIFY AADHAAR OTP ===
  const handleVerifyAadhaarOtp = async () => {
    if (isVerifying) return;
    if (otp.length !== 6) {
      return showAlert("error", "Invalid OTP", "Enter 6-digit OTP");
    }

    setIsVerifying(true);
    const deviceId = Application.getAndroidId();

    try {
      const response = await axios.post(
        `${API_URL_APP}/api/v1/verify-otp-on-aadhar`,
        {
          request_id: aadhaarRequestId,
          otp,
          deviceId,
          aadhaarNumber,
          mobile,
          isByPass,
        },
        { timeout: 20000 }
      );

      if (response.data.success) {
        const { aadhaarData, isNewDriver, message, driver } = response.data;
        setAadharData(aadhaarData);
        setName(aadhaarData.full_name || "");
        setDob(aadhaarData.dob ? new Date(aadhaarData.dob) : null);
        setGender(aadhaarData.gender || "");

        const addr = aadhaarData.address
          ? [
              aadhaarData.address.house,
              aadhaarData.address.loc,
              aadhaarData.address.vtc,
              aadhaarData.address.subdist,
              aadhaarData.address.dist,
              aadhaarData.address.state,
              aadhaarData.address.country,
            ]
              .filter(Boolean)
              .join(", ")
          : "";

        setAddress(addr);

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
        setCurrentStep(2);

        if (!isNewDriver) {
          navigation.navigate("DriverHome", { driver });
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

  // === RESEND AADHAAR OTP ===
  const handleResendOtp = async () => {
    if (timer > 0 || isResending) return;
    setIsResending(true);
    setOtp("");
    await handleGenerateAadhaarOTP();
    setIsResending(false);
  };

  // === VERIFY DRIVING LICENSE (UPDATED) ===
  const handleVerifyDL = async () => {
    if (!licenseNumber.trim()) {
      return showAlert("error", "Required", "Enter DL number");
    }
    if (!dob) {
      return showAlert("error", "Required", "DOB is required");
    }

    setIsVerifying(true);
    const deviceId = Application.getAndroidId();

    try {
      const response = await axios.post(
        `${API_URL_APP}/api/v1/verify-dl`,
        {
          licenseNumber: licenseNumber.trim(),
          dob: dobLicence,
          aadhaarName: name.trim(),
          deviceId,
          aadhaarNumber,
          isByPass,
        },
        { timeout: 20000 }
      );

      if (response.data.success) {
        const { dlData, manualVerification } = response.data;

        setDlData(dlData);

        // 🔹 CASE 1: Instant Verification Success
        if (!manualVerification) {
          setDlVerificationStatus(DL_STATUS.VERIFIED);
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
        }
        // 🔹 CASE 2: Manual Verification (Fallback)
        else {
          setDlVerificationStatus(DL_STATUS.PENDING_VERIFICATION);
          setShowDLInfoModal(true);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
      } else {
        // 🔹 CASE 3: Hard Failure
        setDlVerificationStatus(DL_STATUS.FAILED);
        showAlert(
          "error",
          "Failed",
          response.data.message || "Invalid DL details"
        );
      }
    } catch (error) {
      setDlVerificationStatus(DL_STATUS.FAILED);
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
      if (!granted) {
        return Alert.alert("Permission Needed", "Camera access required");
      }
    }
    setCameraMode(mode);
    setCameraOpen(true);
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
    if (!isAadhaarVerified) {
      return showAlert("error", "Required", "Verify Aadhaar first");
    }
    if (!aadhaarFrontDoc || !aadhaarBackDoc) {
      return showAlert("error", "Required", "Upload both sides of Aadhaar");
    }
    handlesendTempData();
    setCurrentStep(3);
  };

  const handlesendTempData = async () => {
    try {
      const fcmToken = (await getFCMToken()) || "";
      const deviceId = Application.getAndroidId();
      const payload = {
        name,
        dob: dob?.toISOString()?.split("T")[0],
        mobile,
        email,
        aadharData,
        gender,
        aadhaarNumber,
        address,

        fcmToken,
        deviceId,
        referralId,
        // 👇 helpful metadata
        source: "mobile_app",
        createdAt: new Date(),
      };
      const response = await axios.post(
        `${API_URL_APP}/api/v1/temp-data`,
        payload
      );
      console.log("Temp data saved:", response.data);
      return response.data;
    } catch (error) {
      console.error(
        "Send temp data error:",
        error?.response?.data || error.message
      );
      throw error;
    }
  };
  const handleStep2Submit = async () => {
    if (
      dlVerificationStatus === DL_STATUS.NOT_VERIFIED ||
      dlVerificationStatus === DL_STATUS.FAILED
    ) {
      return showAlert("error", "Required", "Verify Driving License");
    }
    if (!panDoc || !licenseFrontDoc || !licenseBackDoc) {
      return showAlert("error", "Required", "Upload all documents");
    }

    setIsSubmitting(true);
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
    formData.append("dlVerificationStatus", dlVerificationStatus);
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
        () => {
          navigation.navigate("addVehcile", { driverId });
        }
      );
      await clearRegistrationState("addVehcile");
    } catch (error) {
      const apiMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        (Array.isArray(error?.response?.data?.errors)
          ? error.response.data.errors[0]
          : null) ||
        error?.message ||
        "Registration failed";

      showAlert("error", "Failed", apiMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // === RENDER DL STATUS BADGE ===
  const renderDLStatusBadge = () => {
    const statusConfig = {
      [DL_STATUS.VERIFIED]: {
        color: "#4CAF50",
        icon: "checkmark-circle",
        text: "Verified",
      },
      [DL_STATUS.PENDING_VERIFICATION]: {
        color: "#FF9800",
        icon: "time",
        text: "Pending Verification",
      },
      [DL_STATUS.FAILED]: {
        color: "#F44336",
        icon: "close-circle",
        text: "Failed",
      },
    };

    const config = statusConfig[dlVerificationStatus];
    if (!config) return null;

    return (
      <View
        style={[
          styles.dlStatusBadge,
          { backgroundColor: config.color + "20", borderColor: config.color },
        ]}
      >
        <Ionicons name={config.icon} size={18} color={config.color} />
        <Text style={[styles.dlStatusText, { color: config.color }]}>
          {config.text}
        </Text>
      </View>
    );
  };

  // === RENDER PROGRESS BAR ===
  const renderProgressBar = () => (
    <View style={styles.progressContainer}>
      <View
        style={[
          styles.progressStep,
          currentStep >= 0 && styles.progressStepActive,
        ]}
      />
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
      <View
        style={[
          styles.progressStep,
          currentStep >= 3 && styles.progressStepActive,
        ]}
      />
    </View>
  );

  // === RENDER AADHAAR OTP MODAL ===
  const renderOtpModal = () => (
    <Modal
      visible={showOtpModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowOtpModal(false)}
    >
      <View style={styles.modalOverlay}>
        <ScrollView
          contentContainerStyle={styles.modalContentScroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowOtpModal(false)}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
            <View style={styles.modalHandle} />
            {timer > 0 && (
              <View style={styles.successBox}>
                <Text style={styles.successMessage}>OTP sent successfully</Text>
              </View>
            )}
            <Text style={styles.modalTitle}>Enter OTP</Text>
            <Text style={styles.modalSubtitle}>
              6-digit OTP sent to your mobile
            </Text>
            <View style={styles.otpContainer}>
              <TextInput
                style={styles.otpInput}
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                maxLength={6}
                returnKeyType="done"
                blurOnSubmit={true}
                onSubmitEditing={() => {
                  if (otp.length === 6 && !isVerifying) {
                    handleVerifyAadhaarOtp();
                  }
                }}
              />
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
        </ScrollView>
      </View>
    </Modal>
  );

  // === RENDER MOBILE OTP MODAL ===
  const renderMobileOtpModal = () => (
    <Modal visible={showMobileOtpModal} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { width: "90%" }]}>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setShowMobileOtpModal(false)}
          >
            <Text style={styles.modalCloseText}>✕</Text>
          </TouchableOpacity>
          <View style={styles.modalHandle} />
          {mobileTimer > 0 && (
            <View style={styles.successBox}>
              <Text style={styles.successMessage}>
                OTP sent successfully on {mobile}
              </Text>
            </View>
          )}
          <Text style={styles.modalTitle}>Verify Mobile Number</Text>
          <Text style={styles.modalSubtitle}>Enter 6-digit OTP</Text>
          <View style={styles.otpContainer}>
            <TextInput
              style={styles.otpInput}
              value={mobileOtp}
              onChangeText={setMobileOtp}
              keyboardType="number-pad"
              maxLength={6}
              returnKeyType="done"
              blurOnSubmit={true}
              onSubmitEditing={() => {
                if (mobileOtp.length === 6 && !isVerifyingMobileOtp) {
                  handleVerifyMobileOtp();
                }
              }}
            />
          </View>
          <TouchableOpacity
            style={[
              styles.verifyButton,
              isVerifyingMobileOtp && { opacity: 0.7 },
            ]}
            onPress={handleVerifyMobileOtp}
            disabled={isVerifyingMobileOtp}
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
  );

  // === RENDER DL INFO MODAL (Manual Verification) ===
  const renderDLInfoModal = () => (
    <Modal visible={showDLInfoModal} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { width: "90%" }]}>
          <Ionicons
            name="information-circle"
            size={60}
            color="#FF9800"
            style={{ alignSelf: "center", marginBottom: 16 }}
          />
          <Text style={styles.modalTitle}>Manual Verification Required</Text>
          <Text style={styles.dlInfoText}>
            We couldn't verify your Driving License automatically at this
            moment. Don't worry - you can continue with registration.
          </Text>
          <Text
            style={[styles.dlInfoText, { fontWeight: "600", marginTop: 12 }]}
          >
            Our team will verify your DL within 24 hours.
          </Text>
          <Text style={[styles.dlInfoText, { marginTop: 12, fontSize: 14 }]}>
            Please proceed to upload your Driving License documents.
          </Text>
          <TouchableOpacity
            style={[styles.verifyButton, { marginTop: 20 }]}
            onPress={() => {
              setShowDLInfoModal(false);
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success
              );
            }}
          >
            <Text style={styles.verifyButtonText}>Continue</Text>
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
          {/* STEP 0: MOBILE VERIFICATION */}
          {currentStep === 0 && (
            <>
              <Text style={styles.title}>Welcome! Let's get started</Text>
              <Text style={styles.subtitle}>
                Enter your mobile number to continue
              </Text>
              <View style={styles.form}>
                <Text style={styles.label}>Mobile Number</Text>
                <TextInput
                  placeholder="Enter 10-digit mobile"
                  value={mobile}
                  onChangeText={setMobile}
                  keyboardType="phone-pad"
                  maxLength={10}
                  returnKeyType="done"
                  blurOnSubmit={true}
                  onSubmitEditing={() => {
                    if (mobile && mobile.length === 10 && !isSendingMobileOtp) {
                      handleSendMobileOtp();
                    }
                  }}
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
          )}

          {/* STEP 1: AADHAAR VERIFICATION */}
          {currentStep === 1 && (
            <>
              <Text style={styles.title}>Verify Aadhaar</Text>
              <Text style={styles.subtitle}>
                Your mobile is verified. Now enter Aadhaar details
              </Text>
              <View style={styles.form}>
                <Text style={styles.label}>Aadhaar Number</Text>
                <TextInput
                  placeholder="12-digit Aadhaar number"
                  value={aadhaarNumber}
                  onChangeText={setAadhaarNumber}
                  keyboardType="number-pad"
                  maxLength={12}
                  style={styles.input}
                  returnKeyType="done"
                  blurOnSubmit={true}
                  onSubmitEditing={() => {
                    if (
                      aadhaarNumber &&
                      aadhaarNumber.length === 12 &&
                      !isVerifying
                    ) {
                      handleGenerateAadhaarOTP();
                    }
                  }}
                />
                <TouchableOpacity
                  style={[
                    styles.nextButton,
                    (!aadhaarNumber ||
                      aadhaarNumber.length !== 12 ||
                      isVerifying) && { backgroundColor: "#ccc" },
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
          )}

          {/* STEP 2: AADHAAR VERIFIED + BASIC INFO */}
          {currentStep === 2 && (
            <>
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
              <Text style={styles.label}>Address</Text>
              <TextInput
                placeholder="Enter Your Address"
                value={address}
                multiline={true}
                onChangeText={setAddress}
                style={styles.input}
              />
              <Text style={styles.label}>Email (Optional)</Text>
              <TextInput
                placeholder="email@domain.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                style={styles.input}
              />
              <Text style={styles.label}>Upload Aadhaar</Text>
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
              <View style={{ flexDirection: "row", gap: 12 }}>
                <TouchableOpacity
                  onPress={() => clearRegistrationState("Signup")}
                  style={{
                    flex: 1,
                    backgroundColor: "#000",
                    paddingVertical: 14,
                    borderRadius: 8,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}
                  >
                    Back
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleStep1Submit}
                  style={{
                    flex: 1,
                    backgroundColor: "#E53935",
                    paddingVertical: 14,
                    borderRadius: 8,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}
                  >
                    Next
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* STEP 3: DL VERIFICATION & FINAL DOCS */}
          {currentStep === 3 && (
            <>
              <Text style={styles.title}>Upload Documents</Text>
              <Text style={styles.subtitle}>Complete your registration</Text>
              <Text style={styles.label}>Driving License Number</Text>
              <View style={styles.inputWithButton}>
                <TextInput
                  placeholder="Enter DL Number"
                  value={licenseNumber}
                  onChangeText={(v) => {
                    setLicenseNumber(v.toUpperCase());

                    // 🔁 RESET verification state when input changes
                    if (dlVerificationStatus !== DL_STATUS.NOT_VERIFIED) {
                      setDlVerificationStatus(DL_STATUS.NOT_VERIFIED);
                    }
                  }}
                  autoCapitalize="characters"
                  style={[
                    styles.input,
                    styles.inputFlex,
                    dlVerificationStatus !== DL_STATUS.NOT_VERIFIED && {
                      backgroundColor: "#f0f0f0",
                    },
                  ]}
                />

                
              </View>

              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Text
                  style={!dobLicence ? styles.placeholderText : styles.dateText}
                >
                  {dobLicence
                    ? formatDate(new Date(dobLicence)) // YYYY-MM-DD
                    : "Select Dob On  Licence"}
                </Text>

                <Ionicons
                  name="calendar-outline"
                  size={moderateScale(22)}
                  color={Colors.primary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                  style={[
                    styles.verifyBtn,
                    dlVerificationStatus === DL_STATUS.VERIFIED &&
                      styles.verifyBtnSuccess,
                    dlVerificationStatus === DL_STATUS.PENDING_VERIFICATION &&
                      styles.verifyBtnPending,
                    (dlVerificationStatus !== DL_STATUS.NOT_VERIFIED ||
                      isVerifying) && {
                      opacity: 0.7,
                    },
                  ]}
                  onPress={handleVerifyDL}
                  disabled={isVerifying}
                >
                  {isVerifying ? (
                    <ActivityIndicator
                      size="small"
                      color={
                        dlVerificationStatus === DL_STATUS.VERIFIED
                          ? "#fff"
                          : Colors.primary
                      }
                    />
                  ) : (
                    <Text
                      style={[
                        styles.verifyBtnText,
                        dlVerificationStatus === DL_STATUS.VERIFIED && {
                          color: "#fff",
                        },
                      ]}
                    >
                      {dlVerificationStatus === DL_STATUS.VERIFIED
                        ? "Verified"
                        : dlVerificationStatus ===
                          DL_STATUS.PENDING_VERIFICATION
                        ? "Pending"
                        : "Verify"}
                    </Text>
                  )}
                </TouchableOpacity>

              {renderDLStatusBadge()}

              {(dlVerificationStatus === DL_STATUS.VERIFIED ||
                dlVerificationStatus === DL_STATUS.PENDING_VERIFICATION) && (
                <>
                  <Text style={styles.label}>Upload Driving License</Text>
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
                        <Text style={styles.uploadText}>Upload PAN</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              )}

              <TouchableOpacity
                style={[
                  styles.nextButton,
                  (dlVerificationStatus === DL_STATUS.NOT_VERIFIED ||
                    dlVerificationStatus === DL_STATUS.FAILED ||
                    isSubmitting) && { backgroundColor: "#ccc" },
                ]}
                onPress={handleStep2Submit}
                disabled={
                  dlVerificationStatus === DL_STATUS.NOT_VERIFIED ||
                  dlVerificationStatus === DL_STATUS.FAILED ||
                  isSubmitting
                }
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

        {renderMobileOtpModal()}
        {renderOtpModal()}
        {renderDLInfoModal()}

        {showDatePicker && (
          <DateTimePicker
            value={dob || new Date(1990, 0, 1)}
            mode="date"
            display="spinner"
            maximumDate={new Date()}
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);

              if (event.type === "set" && selectedDate) {
                setDobLicence(formatDate(selectedDate));
              }
            }}
          />
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
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: "center",
    minWidth: 90,
  },
  verifyBtnNormal: {
    borderWidth: 1,
    color: Colors.white,
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
    color: "#fff",
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
    marginBottom: 200,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center", // ← center में
    alignItems: "center",
    paddingHorizontal: 10,
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 29,
    width: "100%",
    width: 280,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
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
    gap: 3,
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
  modalContentScroll: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCloseButton: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 10,
    padding: 8,
  },
  successBox: {
    width: "90%",
    backgroundColor: "#28a745", // success green
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginTop: 10,
    marginLeft: 20,
    // alignSelf: "stretch",
  },
  successMessage: {
    color: "#ffffff", // white text
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  modalCloseText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },

  // DL Status Badge
  dlStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    marginBottom: 16,
    marginTop: 8,
  },
  dlStatusText: {
    fontSize: 14,
    fontWeight: "600",
  },

  // DL Info Modal Content
  dlInfoText: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },

  // Verify Button Pending State
  verifyBtnPending: {
    backgroundColor: "#FF9800",
    borderColor: "#FF9800",
  },

  // Success Message Box
  successBox: {
    backgroundColor: "#28a745",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  successMessage: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },

  // Modal Close Button
  modalCloseButton: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 10,
    padding: 8,
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 20,
  },
  modalCloseText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },

  // Modal Handle (drag indicator)
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },

  // Modal Title & Subtitle
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

  // OTP Input Container
  otpContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 20,
  },
  otpInput: {
    width: "100%",
    height: 56,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    fontSize: 20,
    textAlign: "center",
    backgroundColor: Colors.white,
    fontWeight: "600",
    letterSpacing: 8,
  },

  // Verify Button
  verifyButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  verifyButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "700",
  },

  // Resend Container
  resendContainer: {
    alignItems: "center",
    paddingVertical: 8,
  },
  resendText: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: "600",
  },
  resendTextDisabled: {
    color: Colors.textSecondary,
  },

  // Progress Bar
  progressContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 24,
    marginTop: 8,
  },
  progressStep: {
    flex: 1,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
  },
  progressStepActive: {
    backgroundColor: Colors.primary,
  },

  // Input with Button
  inputWithButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  inputFlex: {
    flex: 1,
    marginBottom: 0,
  },

  verifyBtnPending: {
    backgroundColor: "#FF9800",
    borderColor: "#FF9800",
  },

  // Document Row
  documentRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  uploadBoxHalf: {
    flex: 1,
    borderWidth: 1.5,
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
  uploadBox: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    borderStyle: "dashed",
    padding: 20,
    alignItems: "center",
    backgroundColor: Colors.white,
    marginBottom: 12,
    height: 100,
    justifyContent: "center",
  },

  // Upload Text
  uploadText: {
    marginTop: 8,
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: "center",
    fontWeight: "500",
  },
  uploadTextSmall: {
    marginTop: 6,
    color: Colors.textSecondary,
    fontSize: 13,
    textAlign: "center",
    fontWeight: "600",
  },
  backButton: {
    backgroundColor: "#000",
  },

  backText: {
    color: "#fff",
  },

  // Document Preview
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
});
