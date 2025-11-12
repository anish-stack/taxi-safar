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
import DateTimePicker from "@react-native-community/datetimepicker";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker"; // <-- NEW
import { Colors } from "../../../constant/ui";
import { Ionicons } from "@expo/vector-icons";
import BackWithLogo from "../../common/back_with_logo";
import { API_URL_APP } from "../../../constant/api";
import axios from "axios";
import { getFCMToken } from "../../../utils/NotificationService";
import * as Application from "expo-application";
import { useRoute } from "@react-navigation/native";
import { saveData } from "../../../utils/storage";
export default function RegisterScreen({ navigation }) {
  const route = useRoute();
  const { step: routeStep, driver } = route.params || {};

  // === STEP & BASIC INFO (pre-filled if step === 2) ===
  const [currentStep, setCurrentStep] = useState(routeStep === 2 ? 2 : 1);
  const [name, setName] = useState(driver?.driver_name ?? "");
  const [dob, setDob] = useState(
    driver?.driver_dob ? new Date(driver.driver_dob) : null
  );
  const [mobile, setMobile] = useState(driver?.driver_contact_number ?? "");
  const [email, setEmail] = useState(driver?.driver_email ?? "");
  const [referralId, setReferralId] = useState(
    driver?.referral_id_applied ?? ""
  );
  const [imageUri, setImageUri] = useState(driver?.profile_photo?.url ?? null);

  // === STEP 2: DOCUMENTS & VERIFICATION ===
  const doc = driver?.document_id ?? {};

  const [aadhaarDoc, setAadhaarDoc] = useState(
    doc?.aadhar_card?.document?.url
      ? {
        uri: doc.aadhar_card.document.url,
        name: "aadhaar.jpg",
        mimeType: "image/jpeg",
      }
      : null
  );
  const [aadhaarNumber, setAadhaarNumber] = useState(
    doc?.aadhar_card?.document_number ?? ""
  );
  const [isAadhaarVerified, setIsAadhaarVerified] = useState(
    driver?.aadhar_verified ?? false
  );

  const [panDoc, setPanDoc] = useState(
    doc?.pan_card?.document?.url
      ? {
        uri: doc.pan_card.document.url,
        name: "pan.jpg",
        mimeType: "image/jpeg",
      }
      : null
  );

  const [licenseDoc, setLicenseDoc] = useState(
    doc?.driving_license?.document?.url
      ? {
        uri: doc.driving_license.document.url,
        name: "license.jpg",
        mimeType: "image/jpeg",
      }
      : null
  );
  const [licenseNumber, setLicenseNumber] = useState(
    doc?.driving_license?.document_number ?? ""
  );
  const [licenseExpiry, setLicenseExpiry] = useState(
    doc?.driving_license?.expiry_date
      ? new Date(doc.driving_license.expiry_date)
      : null
  );

  // === UI STATES ===
  const [showPicker, setShowPicker] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [showLicenseExpiry, setShowLicenseExpiry] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(30);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [tempDocType, setTempDocType] = useState(null);

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

  // === TIMER FOR OTP ===
  useEffect(() => {
    let interval;
    if (showOtpModal && timer > 0) {
      interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [showOtpModal, timer]);

  // === RESET STEP 2 WHEN GOING BACK TO STEP 1 ===
  useEffect(() => {
    if (currentStep === 1 && routeStep !== 2) {
      setAadhaarDoc(null);
      setAadhaarNumber("");
      setIsAadhaarVerified(false);
      setPanDoc(null);
      setLicenseDoc(null);
      setLicenseNumber("");
      setLicenseExpiry(null);
    }
  }, [currentStep, routeStep]);

  // === HELPER: VALIDATE AGE ===
  const validateAge = (date) => {
    const today = new Date();
    const age = today.getFullYear() - date.getFullYear();
    const m = today.getMonth() - date.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < date.getDate())) return age - 1;
    return age;
  };

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
    errors[field] ? <Text>{errors[field]}</Text> : null;

  // === PROFILE IMAGE PICKER ===
  const pickProfileImage = async () => {
    Alert.alert(
      "Select Profile Picture",
      "Choose an option",
      [
        { text: "Camera", onPress: openCamera },
        { text: "Gallery", onPress: pickFromGallery },
        { text: "Cancel", style: "cancel" },
      ],
      { cancelable: true }
    );
  };

  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Denied", "Gallery access is required.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const openCamera = async () => {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert("Permission Required", "Camera access is needed.");
        return;
      }
    }
    Haptics.selectionAsync();
    setCameraOpen(true);
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      setImageUri(photo.uri);
      setCameraOpen(false);
    }
  };

  // === DOCUMENT PICKER ===
  const pickDocument = async (type) => {
    Alert.alert(
      `Upload ${type === "aadhaar" ? "Aadhaar" : type === "pan" ? "PAN" : "License"
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

  const openDocCamera = async (type) => {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) return Alert.alert("Camera access required");
    }
    setCameraOpen(true);
    setTempDocType(type);
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
    if (type === "aadhaar") setAadhaarDoc(doc);
    if (type === "pan") setPanDoc(doc);
    if (type === "license") setLicenseDoc(doc);
  };

  // === HANDLE CAMERA CAPTURE FOR DOCS ===
  useEffect(() => {
    if (!cameraOpen && imageUri && tempDocType) {
      const doc = {
        uri: imageUri,
        name: `${tempDocType}.jpg`,
        mimeType: "image/jpeg",
      };
      saveDoc(doc, tempDocType);
      setTempDocType(null);
    }
  }, [cameraOpen, imageUri, tempDocType]);

  // === STEP 1 SUBMIT ===
  const handleStep1Submit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setErrors({});

    if (!name.trim()) return setFieldError("name", "Enter your name");
    if (!dob) return setFieldError("dob", "Select date of birth");
    if (validateAge(dob) < 18) return setFieldError("dob", "Must be 18+");
    if (!mobile.match(/^\d{10}$/))
      return setFieldError("mobile", "10-digit mobile");
    if (!email.includes("@"))
      return setFieldError("email", "Valid email required");
    if (!imageUri) return setFieldError("image", "Add profile picture");

    setCurrentStep(2);
  };

  // === AADHAAR OTP SEND ===
  const handleVerifyAadhaar = async () => {
    if (isAadhaarVerified || isVerifying) return;
    setErrors({});

    if (!aadhaarNumber.match(/^\d{12}$/)) {
      return setFieldError(
        "aadhaarNumber",
        "Please enter a valid 12-digit Aadhaar number"
      );
    }
    if (!aadhaarDoc) {
      return setFieldError("aadhaarDoc", "Please upload your Aadhaar document");
    }

    setIsVerifying(true);
    try {
      const fcmToken = (await getFCMToken()) || "";
      const deviceId = Application.getAndroidId();

      const formData = new FormData();
      if (name) formData.append("name", name);
      if (dob) formData.append("dob", dob.toISOString().split("T")[0]);
      if (mobile) formData.append("mobile", mobile);
      if (email) formData.append("email", email);
      if (fcmToken) formData.append("fcmToken", fcmToken);
      if (deviceId) formData.append("deviceId", deviceId);
      if (referralId) formData.append("referralId", referralId);
      formData.append("aadhaarNumber", aadhaarNumber);

      if (imageUri) {
        formData.append("profilePicture", {
          uri: imageUri,
          type: "image/jpeg",
          name: "profile.jpg",
        });
      }

      formData.append("aadhaarDocument", {
        uri: aadhaarDoc.uri,
        type: aadhaarDoc.mimeType || "image/jpeg",
        name: aadhaarDoc.name || "aadhaar.jpg",
      });

      const response = await axios.post(
        `${API_URL_APP}/api/v1/send-aadhar-verify-otp`,
        formData,
        {
          headers: {
            Accept: "application/json",
            "Content-Type": "multipart/form-data",
          },
          timeout: 20000,
        }
      );

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowOtpModal(true);
      setTimer(30);
      setOtp(["", "", "", "", "", ""]);
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        "Failed to send OTP. Please try again.";
      setFieldError("verify", msg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsVerifying(false);
    }
  };

  // === OTP VERIFY ===
  const handleVerifyOtp = async () => {
    if (isVerifying) return;
    const otpValue = otp.join("");
    if (otpValue.length !== 6) return setFieldError("otp", "Enter 6-digit OTP");

    setIsVerifying(true);
    try {
      const response = await axios.post(
        `${API_URL_APP}/api/v1/aadhar-verify`,
        { aadhaarNumber, otp: otpValue },
        { headers: { "Content-Type": "application/json" }, timeout: 20000 }
      );

      if (response.data?.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setShowOtpModal(false);
        setIsAadhaarVerified(true);
        setErrors({});
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

  // === RESEND OTP ===
  const handleResendOtp = async () => {
    if (timer > 0 || isResending) return;
    setIsResending(true);
    setOtp(["", "", "", "", "", ""]);
    try {
      const response = await axios.post(
        `${API_URL_APP}/api/v1/re-send-aadhar-verify-otp`,
        { aadhaarNumber },
        { headers: { "Content-Type": "application/json" }, timeout: 15000 }
      );
      if (response.data?.success) {
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

  // === FINAL SUBMIT ===
  const handleStep2Submit = async () => {
    if (!isAadhaarVerified)
      return setFieldError("submit", "Verify Aadhaar first");
    if (!panDoc) return setFieldError("pan", "Upload PAN");
    if (!licenseDoc) return setFieldError("license", "Upload License");
    if (!licenseNumber.trim())
      return setFieldError("licenseNumber", "Enter license number");
    if (!licenseExpiry)
      return setFieldError("licenseExpiry", "Select expiry date");

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("aadhaarNumber", aadhaarNumber);
      formData.append("dlNumber", licenseNumber);
      formData.append(
        "dlExpireDate",
        licenseExpiry.toISOString().split("T")[0]
      );

      [panDoc, licenseDoc].forEach((doc, i) => {
        if (doc) {
          const key = i === 0 ? "panDocument" : "licenseDocument";
          formData.append(key, {
            uri: doc.uri,
            type: doc.mimeType || "application/pdf",
            name: doc.name || `${key}.pdf`,
          });
        }
      });

      const response = await axios.post(
        `${API_URL_APP}/api/v1/register-driver`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          timeout: 30000,
        }
      );

      console.log("response", response.data);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // ✅ Extract driver_id from response
      const driverId = response?.data?.data?.driver_id;
      await saveData('driver', driverId)
      Alert.alert(
        "Success",
        response.data.message || "Documents uploaded successfully!",
        [
          {
            text: "OK",
            onPress: () => navigation.navigate("addVehcile", { driverId }),
          },
        ]
      );
    } catch (error) {
      const msg = error.response?.data?.message || "Registration failed";
      setFieldError("submit", msg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
          <Text style={styles.modalSubtitle}>Enter 6-digit OTP</Text>

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
            onPress={handleVerifyOtp}
            disabled={isVerifying}
          >
            {isVerifying ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.verifyButtonText}>Verify</Text>
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
                : `Resend in 00:${timer.toString().padStart(2, "0")}`}
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
        <CameraView ref={cameraRef} style={styles.fullScreen} facing="front">
          <View style={styles.cameraOverlay}>
            <TouchableOpacity
              style={styles.closeCamera}
              onPress={() => setCameraOpen(false)}
            >
              <Ionicons name="close" size={32} color={Colors.white} />
            </TouchableOpacity>
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
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>Join TaxiSafar today!</Text>

              <TouchableOpacity
                style={styles.avatarContainer}
                onPress={pickProfileImage}
              >
                {imageUri ? (
                  <Image source={{ uri: imageUri }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Ionicons name="person" size={40} color="#ccc" />
                    <Text style={styles.avatarText}>Add Photo</Text>
                  </View>
                )}
                <View style={styles.cameraBadge}>
                  <Ionicons name="camera" size={16} color={Colors.white} />
                </View>
              </TouchableOpacity>
              {renderError("image")}

              <View style={styles.form}>
                <Text style={styles.label}>Name</Text>
                <TextInput
                  placeholder="Aadhaar name"
                  value={name}
                  onChangeText={(v) => {
                    setName(v);
                    clearFieldError("name");
                  }}
                  style={styles.input}
                />
                {renderError("name")}

                <Text style={styles.label}>Date of Birth</Text>
                <TouchableOpacity
                  style={styles.input}
                  onPress={() => setShowPicker(true)}
                >
                  <Text
                    style={[
                      styles.dobText,
                      !dob && { color: Colors.placeholder },
                    ]}
                  >
                    {dob ? dob.toLocaleDateString("en-GB") : "dd-mm-yyyy"}
                  </Text>
                  <Ionicons
                    name="calendar-outline"
                    size={20}
                    color={Colors.primary}
                    style={styles.calendarIcon}
                  />
                </TouchableOpacity>
                {renderError("dob")}
                {showPicker && (
                  <DateTimePicker
                    mode="date"
                    value={dob || new Date()}
                    maximumDate={new Date()}
                    onChange={(e, d) => {
                      setShowPicker(false);
                      if (d) {
                        setDob(d);
                        clearFieldError("dob");
                      }
                    }}
                  />
                )}

                <Text style={styles.label}>Mobile</Text>
                <TextInput
                  placeholder="10 digits"
                  value={mobile}
                  onChangeText={(v) => {
                    setMobile(v);
                    clearFieldError("mobile");
                  }}
                  keyboardType="phone-pad"
                  maxLength={10}
                  style={styles.input}
                />
                {renderError("mobile")}

                <Text style={styles.label}>Email</Text>
                <TextInput
                  placeholder="email@domain.com"
                  value={email}
                  onChangeText={(v) => {
                    setEmail(v);
                    clearFieldError("email");
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={styles.input}
                />
                {renderError("email")}

                <Text style={styles.label}>Referral ID (Optional)</Text>
                <TextInput
                  placeholder="Enter ID"
                  value={referralId}
                  onChangeText={setReferralId}
                  style={styles.input}
                />

                <TouchableOpacity
                  style={styles.nextButton}
                  onPress={handleStep1Submit}
                >
                  <Text style={styles.nextText}>Next</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.title}>Verify Documents</Text>
              <Text style={styles.subtitle}>Upload clear images or PDFs</Text>

              <View style={styles.form}>
                <Text style={styles.label}>Aadhaar Card</Text>
                <TouchableOpacity
                  style={styles.uploadBox}
                  onPress={() => pickDocument("aadhaar")}
                >
                  <Ionicons
                    name="cloud-upload-outline"
                    size={24}
                    color={Colors.textSecondary}
                  />
                  <Text style={styles.uploadText}>
                    {aadhaarDoc ? aadhaarDoc.name : "Upload (Image/PDF)"}
                  </Text>
                </TouchableOpacity>
                {renderError("aadhaarDoc")}

                <Text style={styles.label}>Aadhaar Number</Text>
                <View style={styles.inputWithButton}>
                  <TextInput
                    placeholder="12 digits"
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
                    onPress={handleVerifyAadhaar}
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
                        {isAadhaarVerified ? "Verified" : "Verify"}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
                {renderError("aadhaarNumber")}
                {renderError("verify")}

                <Text style={styles.label}>PAN Card</Text>
                <TouchableOpacity
                  style={[
                    styles.uploadBox,
                    !isAadhaarVerified && styles.disabledUpload,
                  ]}
                  onPress={() => isAadhaarVerified && pickDocument("pan")}
                  disabled={!isAadhaarVerified}
                >
                  <Ionicons
                    name="cloud-upload-outline"
                    size={24}
                    color={isAadhaarVerified ? Colors.textSecondary : "#aaa"}
                  />
                  <Text
                    style={[
                      styles.uploadText,
                      !isAadhaarVerified && { color: "#aaa" },
                    ]}
                  >
                    {panDoc ? panDoc.name : "Upload PAN"}
                  </Text>
                </TouchableOpacity>
                {renderError("pan")}

                <Text style={styles.label}>Driving License</Text>
                <TouchableOpacity
                  style={[
                    styles.uploadBox,
                    !isAadhaarVerified && styles.disabledUpload,
                  ]}
                  onPress={() => isAadhaarVerified && pickDocument("license")}
                  disabled={!isAadhaarVerified}
                >
                  <Ionicons
                    name="cloud-upload-outline"
                    size={24}
                    color={isAadhaarVerified ? Colors.textSecondary : "#aaa"}
                  />
                  <Text
                    style={[
                      styles.uploadText,
                      !isAadhaarVerified && { color: "#aaa" },
                    ]}
                  >
                    {licenseDoc ? licenseDoc.name : "Upload License"}
                  </Text>
                </TouchableOpacity>
                {renderError("license")}

                <Text style={styles.label}>License Number</Text>
                <TextInput
                  placeholder="DL number"
                  value={licenseNumber}
                  onChangeText={(v) => {
                    setLicenseNumber(v);
                    clearFieldError("licenseNumber");
                  }}
                  autoCapitalize="characters"
                  editable={isAadhaarVerified}
                  style={[
                    styles.input,
                    !isAadhaarVerified && {
                      backgroundColor: "#f0f0f0",
                      color: "#aaa",
                    },
                  ]}
                />
                {renderError("licenseNumber")}

                <Text style={styles.label}>Expiry Date</Text>
                <TouchableOpacity
                  style={[
                    styles.input,
                    !isAadhaarVerified && { backgroundColor: "#f0f0f0" },
                  ]}
                  onPress={() =>
                    isAadhaarVerified && setShowLicenseExpiry(true)
                  }
                  disabled={!isAadhaarVerified}
                >
                  <Text
                    style={[
                      styles.dobText,
                      !licenseExpiry && { color: Colors.placeholder },
                    ]}
                  >
                    {licenseExpiry
                      ? licenseExpiry.toLocaleDateString("en-GB")
                      : "dd-mm-yyyy"}
                  </Text>
                  <Ionicons
                    name="calendar-outline"
                    size={20}
                    color={isAadhaarVerified ? Colors.primary : "#aaa"}
                    style={styles.calendarIcon}
                  />
                </TouchableOpacity>
                {renderError("licenseExpiry")}
                {showLicenseExpiry && (
                  <DateTimePicker
                    mode="date"
                    value={licenseExpiry || new Date()}
                    minimumDate={new Date()}
                    onChange={(e, d) => {
                      setShowLicenseExpiry(false);
                      if (d) {
                        setLicenseExpiry(d);
                        clearFieldError("licenseExpiry");
                      }
                    }}
                  />
                )}

                {renderError("submit")}

                <TouchableOpacity
                  style={[
                    styles.nextButton,
                    (!isAadhaarVerified || isSubmitting) && {
                      backgroundColor: "#ccc",
                    },
                  ]}
                  onPress={handleStep2Submit}
                  disabled={!isAadhaarVerified || isSubmitting}
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
    position: "relative",
    marginBottom: 10,
  },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: "dashed",
  },
  avatarText: { fontSize: 12, color: "#aaa", marginTop: 4 },
  cameraBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: Colors.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
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
  verifyBtnNormal: {
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: "center",
  },
  verifyBtnSuccess: {
    backgroundColor: "#4CAF50",
    borderColor: "#4CAF50",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  verifyBtnText: { fontSize: 14, fontWeight: "600", textAlign: "center" },
  dobText: { color: Colors.textPrimary },
  calendarIcon: { position: "absolute", right: 16, top: 16 },
  uploadBox: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    borderStyle: "dashed",
    padding: 20,
    alignItems: "center",
    backgroundColor: Colors.white,
    marginBottom: 6,
  },
  disabledUpload: { borderColor: "#ddd", backgroundColor: "#f9f9f9" },
  uploadText: {
    marginTop: 8,
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: "center",
  },
  nextButton: {
    backgroundColor: Colors.primary,
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 10,
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
  },
  closeCamera: {
    alignSelf: "flex-start",
    marginLeft: 20,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 20,
    padding: 8,
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
  },
  verifyButtonText: { color: Colors.white, fontSize: 18, fontWeight: "bold" },
  resendContainer: { alignItems: "center" },
  resendText: { color: Colors.textPrimary, fontSize: 15 },
  resendTextDisabled: { color: Colors.textSecondary },
});
