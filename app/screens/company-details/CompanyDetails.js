import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from "react-native";
import { Image } from "expo-image";
import React, { useEffect, useState, useRef, memo, useCallback } from "react";
import { scale, verticalScale, moderateScale } from "react-native-size-matters";

import loginStore from "../../store/auth.store";
import Layout from "../common/layout";
import BackWithLogo from "../common/back_with_logo";
import { API_URL_APP } from "../../constant/api";
import axios from "axios";
import * as ImagePicker from "expo-image-picker";
import useDriverStore from "../../store/driver.store";
import { UniversalAlert } from "../common/UniversalAlert";

const ImageUploader = memo(({ title, uri, onPress }) => {
  return (
    <>
      <Text style={styles.label}>{title}</Text>

      <TouchableOpacity style={styles.imageBox} onPress={onPress} activeOpacity={0.8}>
        {/* Image */}
        {uri && (
          <Image
            source={{ uri }}
            style={StyleSheet.absoluteFillObject}
            contentFit="contain"
            transition={300}
            cachePolicy="disk"
          />
        )}

        {/* Placeholder */}
        {!uri && (
          <View style={styles.placeholderContainer}>
            <Text style={styles.placeholderText}>Tap to upload</Text>
          </View>
        )}

        {/* Overlay */}
        <View style={styles.imageOverlay} pointerEvents="none">
          <Text style={styles.overlayText}>
            Tap to {uri ? "Change" : "Upload"}{" "}
            {title.includes("Logo") ? "Logo" : "Signature"}
          </Text>
        </View>
      </TouchableOpacity>
    </>
  );
});

export default function CompanyDetails({navigation}) {
  const { token } = loginStore();
  const { driver, fetchDriverDetails } = useDriverStore();

  const scrollViewRef = useRef(null);

  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    type: "success",
    title: "",
    message: "",
    primaryButton: "OK",
    onPrimaryPress: () => setAlertVisible(false),
  });

  const [activeTab, setActiveTab] = useState("gst");

  const [gstNumber, setGstNumber] = useState("");
  const [verifyingGst, setVerifyingGst] = useState(false);
  const [gstVerified, setGstVerified] = useState(false);
  const [gstData, setGstData] = useState(null);

  const [companyName, setCompanyName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [logo, setLogo] = useState(null);
  const [signature, setSignature] = useState(null);

  const gstRef = useRef(null);
  const companyNameRef = useRef(null);
  const addressRef = useRef(null);
  const phoneRef = useRef(null);
  const emailRef = useRef(null);
  const isInitialLoad = useRef(true);


  // Move all hooks BEFORE any conditional returns
const showAlert = useCallback((type, title, message, onClose = null) => {
  setAlertConfig({
    type,
    title,
    message,
    primaryButton: "OK",
    onPrimaryPress: () => {
      setAlertVisible(false);
      if (onClose) onClose();
    },
  });
  setAlertVisible(true);
}, []);

  const pickImage = useCallback(async (type) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      showAlert("warning", "Permission Required", "Please grant access to your photo library.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      const uri = result.assets[0].uri;
      if (type === "logo") setLogo(uri);
      if (type === "signature") setSignature(uri);
    }
  }, [showAlert]);

  const onPickLogo = useCallback(() => pickImage("logo"), [pickImage]);
  const onPickSignature = useCallback(() => pickImage("signature"), [pickImage]);

  const fetchCompany = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL_APP}/api/v1/my-company`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchDriverDetails();
      const data = res.data?.data;

if (data && Object.keys(data).length > 0) {
  setCompany(data);
  setCompanyName(data.company_name || "");
  setAddress(data.address || "");
  setPhone(data.phone || driver?.driver_contact_number || "");
  setEmail(data.email || driver?.driver_email || "");
  setGstNumber(data.gst_number || "");
  setLogo(data.logo?.url || null);
  setSignature(data.signature?.url || null);

  if (isInitialLoad.current) {
    if (data.gst_number) {
      setActiveTab("gst");
      setGstVerified(true);
    } else {
      setActiveTab("noGst");
    }
  }
} else {
  if (isInitialLoad.current) {
    setActiveTab("gst");
  }
}

isInitialLoad.current = false;

    } catch (err) {
      console.log("Fetch error =>", err?.response?.data);
      showAlert("error", "Error", "Failed to load company details");
    } finally {
      setLoading(false);
    }
  }, [token]);

  const verifyGst = useCallback(async () => {
    if (gstNumber.length !== 15) {
      showAlert("warning", "Invalid GST", "Please enter a valid 15-digit GST number");
      return;
    }

    try {
      setVerifyingGst(true);
      const response = await axios.post(
        `${API_URL_APP}/api/v1/gst-verify`,
        { gst: gstNumber },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        const verified = response.data.data;
        const companyNameValue = verified.business_name || verified.legal_name || "";
        let addressValue = "";
        if (verified.address && typeof verified.address === "object") {
          const parts = [];
          if (verified.address.street && verified.address.street !== "123 Default Street") parts.push(verified.address.street);
          if (verified.address.city && verified.address.city !== "Default City") parts.push(verified.address.city);
          if (verified.address.state && verified.address.state !== "Default State") parts.push(verified.address.state);
          if (verified.address.pincode && verified.address.pincode !== "000000") parts.push(verified.address.pincode);
          addressValue = parts.join(", ");
        } else if (typeof verified.address === "string") {
          addressValue = verified.address;
        }

        const emailValue = verified.email || verified.emailId || "";
        const phoneValue = verified.mobileNo || verified.mobile || verified.phone || "";

        const filledData = { name: companyNameValue, address: addressValue, email: emailValue, phone: phoneValue };

        setGstData(filledData);
        setGstVerified(true);
        if (filledData.name) setCompanyName(filledData.name);
        if (filledData.address) setAddress(filledData.address);
        if (filledData.email) setEmail(filledData.email || driver?.driver_email || "");
        if (filledData.phone) setPhone(filledData.phone || driver?.driver_contact_number || "");

        showAlert("success", "GST Verified ✓", "Company details auto-filled successfully!",()=>navigation.goBack());
      } else {
        showAlert("error", "Invalid GST", response.data.message || "GST number not valid");
      }
    } catch (err) {
      showAlert("error", "Failed", err.response?.data?.message || "Verification failed");
    } finally {
      setVerifyingGst(false);
    }
  }, [gstNumber, token, driver, showAlert]);

  const handleSubmit = useCallback(async () => {
    if (!companyName.trim()) {
      showAlert("warning", "Required", "Company name is required");
      return;
    }

    try {
      setSaving(true);
      const formData = new FormData();
      formData.append("company_name", companyName);
      formData.append("address", address);
      formData.append("phone", phone);
      formData.append("email", email);
      formData.append("gst_number", activeTab === "gst" && gstVerified ? gstNumber : "");

      if (logo && logo.startsWith("file://")) {
        formData.append("logo", { uri: logo, name: "logo.jpg", type: "image/jpeg" });
      }
      if (signature && signature.startsWith("file://")) {
        formData.append("signature", { uri: signature, name: "signature.png", type: "image/png" });
      }

      const isEditing = !!company;
      const url = isEditing ? `${API_URL_APP}/api/v1/update-company` : `${API_URL_APP}/api/v1/add-company`;

      await axios({
        method: isEditing ? "PUT" : "POST",
        url,
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
        data: formData,
      });

      showAlert("success", "Success", `Company details ${isEditing ? "updated" : "saved"} successfully!`, fetchCompany);
    } catch (err) {
      showAlert("error", "Error", err.response?.data?.message || "Failed to save company details");
    } finally {
      setSaving(false);
    }
  }, [companyName, address, phone, email, activeTab, gstVerified, gstNumber, logo, signature, company, token, showAlert, fetchCompany]);

  const scrollToInput = useCallback((ref) => {
    ref.current?.measure((x, y, width, height, pageX, pageY) => {
      scrollViewRef.current?.scrollTo({ y: pageY - 100, animated: true });
    });
  }, []);

  useEffect(() => {
    fetchCompany();
  }, []);

  useEffect(() => {
    (async () => {
      if (Platform.OS === "android") {
        const pending = await ImagePicker.getPendingResultAsync();
        if (pending.length > 0) {
          const lastResult = pending[pending.length - 1];
          if (lastResult?.assets?.[0]?.uri) {
            showAlert("info", "Recovered Image", "An image selection was recovered. Please re-upload if needed.");
          }
        }
      }
    })();
  }, [showAlert]);

  // NOW it's safe to have conditional returns - all hooks are above
  if (loading) {
    return (
      <Layout showHeader={false}>
        <BackWithLogo />
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.loadingText}>Loading company details...</Text>
        </View>
      </Layout>
    );
  }

  const isFormVisible = activeTab === "noGst" || gstVerified;
  const isFormEditable = activeTab === "noGst" || !gstVerified;

  return (
    <Layout showHeader={false} showBottomTabs={false}>
      <BackWithLogo
        isLogo={false}
        title={company ? "Edit Company Details" : "Add Company Details"}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
       behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: verticalScale(50) }}
         
        >
          <View style={styles.container}>
            {/* Tabs */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tab, activeTab === "gst" && styles.activeTab]}
                onPress={() => {
                  setActiveTab("gst");
                  setGstVerified(false);
                  setGstData(null);
                }}
              >
                <Text style={[styles.tabText, activeTab === "gst" && styles.activeTabText]}>
                  Have GST
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === "noGst" && styles.activeTab]}
                onPress={() => setActiveTab("noGst")}
              >
                <Text style={[styles.tabText, activeTab === "noGst" && styles.activeTabText]}>
                  No GST
                </Text>
              </TouchableOpacity>
            </View>

            {/* GST Input */}
            {activeTab === "gst" && !gstVerified && (
              <View style={styles.gstSection}>
                <Text style={styles.label}>Enter your GST Number</Text>
                <View style={styles.gstInputContainer}>
                  <TextInput
                    ref={gstRef}
                    style={styles.gstInput}
                    value={gstNumber}
                    onChangeText={setGstNumber}
                    placeholder="e.g. 09AAACC1206D1ZM"
                    autoCapitalize="characters"
                    maxLength={15}
                    returnKeyType="done"
                    onSubmitEditing={verifyGst}
                    // onFocus={() => scrollToInput(gstRef)}
                  />
                  <TouchableOpacity
                    onPress={verifyGst}
                    disabled={verifyingGst || gstNumber.length !== 15}
                    style={[styles.verifyBtn, (verifyingGst || gstNumber.length !== 15) && styles.verifyBtnDisabled]}
                  >
                    {verifyingGst ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.verifyText}>Verify</Text>}
                  </TouchableOpacity>
                </View>
                <Text style={styles.hint}>We'll auto-fill your company details from GST records</Text>
              </View>
            )}

            {/* Form Fields */}
            {isFormVisible && (
              <>
                <Text style={styles.label}>
                  Business Name {gstVerified && <Text style={styles.verifiedTag}>(Verified)</Text>}
                </Text>
                <TextInput
                  ref={companyNameRef}
                  style={styles.input}
                  value={companyName}
                  onChangeText={isFormEditable ? setCompanyName : null}
                  editable={isFormEditable}
                  placeholder="Enter company name"
                  returnKeyType="next"
                  // onSubmitEditing={() => addressRef.current?.focus()}
                  // onFocus={() => scrollToInput(companyNameRef)}
                />

                <Text style={styles.label}>
                  Address {gstVerified && <Text style={styles.verifiedTag}>(Verified)</Text>}
                </Text>
                <TextInput
                  ref={addressRef}
                  style={[styles.input, styles.textArea]}
                  value={address}
                  onChangeText={isFormEditable ? setAddress : null}
                  editable={isFormEditable}
                  multiline
                  placeholder="Enter full address"
                  returnKeyType="next"
                  // onSubmitEditing={() => phoneRef.current?.focus()}
                  // onFocus={() => scrollToInput(addressRef)}
                />

                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>
                      Phone {gstVerified && <Text style={styles.verifiedTag}>(Verified)</Text>}
                    </Text>
                    <TextInput
                      ref={phoneRef}
                      style={styles.input}
                      value={phone}
                      onChangeText={isFormEditable ? setPhone : null}
                      editable={isFormEditable}
                      keyboardType="phone-pad"
                      placeholder="Enter phone number"
                      returnKeyType="next"
                      // onSubmitEditing={() => emailRef.current?.focus()}
                      // onFocus={() => scrollToInput(phoneRef)}
                    />
                  </View>
                  <View style={{ width: scale(12) }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>
                      Email {gstVerified && <Text style={styles.verifiedTag}>(Verified)</Text>}
                    </Text>
                    <TextInput
                      ref={emailRef}
                      style={styles.input}
                      value={email}
                      onChangeText={isFormEditable ? setEmail : null}
                      editable={isFormEditable}
                      keyboardType="email-address"
                      placeholder="Enter email"
                      returnKeyType="done"
                      // onSubmitEditing={Keyboard.dismiss}
                      // onFocus={() => scrollToInput(emailRef)}
                    />
                  </View>
                </View>

                {/* Image Uploaders */}
                <ImageUploader
                  title="Company Logo (Transparent Background Recommended)"
                  uri={logo}
                  onPress={onPickLogo}
                />

                <ImageUploader
                  title="Digital Signature (Transparent Background Recommended)"
                  uri={signature}
                  onPress={onPickSignature}
                />

                <TouchableOpacity
                  style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                  onPress={handleSubmit}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.saveButtonText}>
                      {company ? "Update Details" : "Save Details"}
                    </Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

<UniversalAlert
  visible={alertVisible}
  onClose={() => setAlertVisible(false)}
  type={alertConfig.type}
  title={alertConfig.title}
  message={alertConfig.message}
  primaryButton={alertConfig.primaryButton}
  onPrimaryPress={alertConfig.onPrimaryPress}
/>    </Layout>
  );
}

const styles = StyleSheet.create({
  container: { padding: scale(16) },

  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    borderRadius: moderateScale(12),
    padding: scale(4),
    marginBottom: verticalScale(24),
  },
  tab: {
    flex: 1,
    paddingVertical: verticalScale(12),
    borderRadius: moderateScale(10),
    alignItems: "center",
  },
  activeTab: {
    backgroundColor: "#000",
  },
  tabText: {
    fontSize: moderateScale(16),
    fontWeight: "600",
    color: "#6b7280",
  },
  activeTabText: { color: "#fff" },

  gstSection: { marginBottom: verticalScale(20) },
  label: {
    fontSize: moderateScale(14),
    fontWeight: "600",
    color: "#000",
    marginTop: verticalScale(20),
    marginBottom: verticalScale(8),
  },
  verifiedTag: { fontSize: moderateScale(12), color: "#16a34a", fontWeight: "500" },

  gstInputContainer: { flexDirection: "row", alignItems: "flex-end", gap: scale(12) },
  gstInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: moderateScale(10),
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(12),
    fontSize: moderateScale(15),
    backgroundColor: "#fff",
  },
  verifyBtn: {
    backgroundColor: "#000",
    paddingHorizontal: scale(24),
    paddingVertical: verticalScale(12),
    borderRadius: moderateScale(10),
  },
  verifyBtnDisabled: { opacity: 0.6 },
  verifyText: { color: "#fff", fontWeight: "600" },
  hint: { fontSize: moderateScale(13), color: "#6b7280", marginTop: verticalScale(8), fontStyle: "italic" },

  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: moderateScale(10),
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(12),
    fontSize: moderateScale(15),
    backgroundColor: "#fff",
    color: "#000",
  },
  textArea: { height: verticalScale(100), textAlignVertical: "top" },
  row: { flexDirection: "row", marginHorizontal: scale(-6) },

  imageBox: {
    height: 160,
    borderRadius: moderateScale(16),
    overflow: "hidden",
    backgroundColor: "#f0f0f0",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginTop: verticalScale(10),
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },

  placeholderContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    borderRadius: moderateScale(16),
  },
  placeholderText: {
    color: "#999",
    fontSize: moderateScale(16),
    fontWeight: "600",
  },

  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  overlayText: { color: "#fff", fontSize: moderateScale(15), fontWeight: "600" },

  saveButton: {
    backgroundColor: "#000",
    paddingVertical: verticalScale(16),
    borderRadius: moderateScale(12),
    alignItems: "center",
    marginTop: verticalScale(32),
  },
  saveButtonDisabled: { opacity: 0.7 },
  saveButtonText: { color: "#fff", fontSize: moderateScale(16), fontWeight: "bold" },

  loadingText: { marginTop: verticalScale(12), color: "#666", fontSize: moderateScale(15) },
});