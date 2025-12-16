import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  UIManager,
  findNodeHandle,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from "react-native";
import React, { useEffect, useState, useRef } from "react";
import loginStore from "../../store/auth.store";
import Layout from "../common/layout";
import BackWithLogo from "../common/back_with_logo";
import { API_URL_APP } from "../../constant/api";
import axios from "axios";
import * as ImagePicker from "expo-image-picker";
import useDriverStore from "../../store/driver.store";
import { UniversalAlert } from "../common/UniversalAlert";

const DEMO_LOGO = "https://img.icons8.com/color/480/000000/company.png";
const DEMO_SIGNATURE =
  "https://img.icons8.com/fluency/480/000000/signature.png";

export default function CompanyDetails() {
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

  // GST Flow States
  const [isGstRegistered, setIsGstRegistered] = useState(null); // null = not answered, true/false
  const [gstNumber, setGstNumber] = useState("06AAECO3323K1ZJ");
  const [verifyingGst, setVerifyingGst] = useState(false);
  const [gstVerified, setGstVerified] = useState(false); // Verified successfully
  const [gstData, setGstData] = useState(null); // Verified data

  // Form Fields
  const [companyName, setCompanyName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [logo, setLogo] = useState(null);
  const [signature, setSignature] = useState(null);

  // Refs for keyboard navigation
  const gstRef = useRef(null);
  const companyNameRef = useRef(null);
  const addressRef = useRef(null);
  const phoneRef = useRef(null);
  const emailRef = useRef(null);

  const fetchCompany = async () => {
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

        if (data.gst_number) {
          setIsGstRegistered(true);
          setGstVerified(true);
          setGstData({
            name: data.company_name,
            address: data.address,
            email: data.email,
            phone: data.phone,
          });
        }
      }
    } catch (err) {
      console.log("Fetch error =>", err).response.data;
      showAlert("error", "Error", "Failed to load company details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompany();
  }, []);

const verifyGst = async () => {
  if (gstNumber.length !== 15) {
    showAlert(
      "warning",
      "Invalid GST",
      "Please enter a valid 15-digit GST number"
    );
    return;
  }

  try {
    setVerifyingGst(true);
    const response = await axios.post(
      `${API_URL_APP}/api/v1/gst-verify`,
      { gst: gstNumber },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    console.log("GST Verify Response:", JSON.stringify(response.data, null, 2));

    if (response.data.success) {
      const verified = response.data.data;

      // Extract company name - try legal_name first, then business_name
      const companyNameValue = verified.legal_name || verified.business_name || "";

      // Build address string from address object
      let addressValue = "";
      if (verified.address && typeof verified.address === 'object') {
        const addressParts = [];
        
        if (verified.address.street && verified.address.street !== "123 Default Street") {
          addressParts.push(verified.address.street);
        }
        if (verified.address.city && verified.address.city !== "Default City") {
          addressParts.push(verified.address.city);
        }
        if (verified.address.state && verified.address.state !== "Default State") {
          addressParts.push(verified.address.state);
        }
        if (verified.address.pincode && verified.address.pincode !== "000000") {
          addressParts.push(verified.address.pincode);
        }
        
        addressValue = addressParts.join(", ");
      } else if (typeof verified.address === 'string') {
        addressValue = verified.address;
      }

      // Extract email and phone (may not be available in bypass mode)
      const emailValue = verified.email || verified.emailId || "";
      const phoneValue = verified.mobileNo || verified.mobile || verified.phone || "";

      const filledData = {
        name: companyNameValue,
        address: addressValue,
        email: emailValue,
        phone: phoneValue,
      };

      console.log("Filled Data:", filledData);

      setGstData(filledData);
      setGstVerified(true);

      // Auto-fill form fields
      if (filledData.name) {
        setCompanyName(filledData.name);
      }
      if (filledData.address) {
        setAddress(filledData.address);
      }
      if (filledData.email) {
        setEmail(filledData.email);
      } else if (!email) {
        // If no email from GST and no existing email, use driver email
        setEmail(driver?.driver_email || "");
      }
      if (filledData.phone) {
        setPhone(filledData.phone);
      } else if (!phone) {
        // If no phone from GST and no existing phone, use driver phone
        setPhone(driver?.driver_contact_number || "");
      }

      showAlert(
        "success",
        "GST Verified ✓",
        "Company details auto-filled successfully!"
      );
    } else {
      showAlert(
        "error",
        "Invalid GST",
        response.data.message || "GST number not valid"
      );
    }
  } catch (err) {
    console.log("GST Verify Error:", err.response?.data || err.message);
    showAlert(
      "error",
      "Failed",
      err.response?.data?.message || "Verification failed"
    );
  } finally {
    setVerifyingGst(false);
  }
};

  const pickImage = async (type) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [4, 3],
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      if (type === "logo") setLogo(uri);
      if (type === "signature") setSignature(uri);
    }
  };

  const handleSubmit = async () => {
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
      formData.append("gst_number", isGstRegistered ? gstNumber : "");

      if (logo && logo.startsWith("file://")) {
        formData.append("logo", {
          uri: logo,
          name: "logo.jpg",
          type: "image/jpeg",
        });
      }

      if (signature && signature.startsWith("file://")) {
        formData.append("signature", {
          uri: signature,
          name: "signature.png",
          type: "image/png",
        });
      }

      const isEditing = !!company;
      const url = isEditing
        ? `${API_URL_APP}/api/v1/update-company`
        : `${API_URL_APP}/api/v1/add-company`;

      await axios({
        method: isEditing ? "PUT" : "POST",
        url,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
        data: formData,
      });

      showAlert(
        "success",
        "Success",
        `Company details ${isEditing ? "updated" : "saved"} successfully!`,
        fetchCompany
      );
    } catch (err) {
      showAlert("error", "Error", "Failed to save company details");
    } finally {
      setSaving(false);
    }
  };

  const scrollToInput = (ref) => {
    ref.current?.measure((x, y, width, height, pageX, pageY) => {
      scrollViewRef.current?.scrollTo({ y: pageY - 100, animated: true });
    });
  };
  if (loading) {
    return (
      <Layout showHeader={false}>
        <BackWithLogo />
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.loadingText}>Loading company details...</Text>
        </View>
      </Layout>
    );
  }

  return (
    <Layout showHeader={false} showBottomTabs={false}>
      <BackWithLogo
        isLogo={false}
        title={company ? "Edit Company Details" : "Add Company Details"}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 50 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.container}>
            {/* Step 1: GST Registration Question */}
            {isGstRegistered === null && (
              <View style={styles.gstCard}>
                <Text style={styles.gstQuestion}>
                  Are you a GST registered business?
                </Text>
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={[styles.choiceBtn, styles.yesBtn]}
                    onPress={() => setIsGstRegistered(true)}
                  >
                    <Text style={styles.choiceText}>Yes</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.choiceBtn, styles.noBtn]}
                    onPress={() => setIsGstRegistered(false)}
                  >
                    <Text style={styles.choiceText}>No</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Step 2: Only GST Input (if Yes) */}
            {isGstRegistered === true && !gstVerified && (
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
                    onFocus={() => scrollToInput(gstRef)}
                  />
                  <TouchableOpacity
                    onPress={verifyGst}
                    disabled={verifyingGst || gstNumber.length !== 15}
                    style={[
                      styles.verifyBtn,
                      (verifyingGst || gstNumber.length !== 15) &&
                        styles.verifyBtnDisabled,
                    ]}
                  >
                    {verifyingGst ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.verifyText}>Verify</Text>
                    )}
                  </TouchableOpacity>
                </View>
                <Text style={styles.hint}>
                  We'll auto-fill your company details from GST records
                </Text>
              </View>
            )}

            {/* Step 3: Show All Fields Only After GST Decision */}
            {(isGstRegistered === false || gstVerified || company) && (
              <>
                {/* Company Name */}
                <Text style={styles.label}>
                  Company Name{" "}
                  {gstVerified && (
                    <Text style={styles.verifiedTag}>(Verified)</Text>
                  )}
                </Text>
                <TextInput
                  ref={companyNameRef}
                  style={styles.input}
                  value={companyName}
                  onChangeText={gstVerified ? null : setCompanyName}
                  editable={!gstVerified}
                  placeholder="Enter company name"
                  returnKeyType="next"
                  onSubmitEditing={() => addressRef.current?.focus()}
                  onFocus={() => scrollToInput(companyNameRef)}
                />

                {/* Address */}
                <Text style={styles.label}>
                  Address{" "}
                  {gstVerified && (
                    <Text style={styles.verifiedTag}>(Verified)</Text>
                  )}
                </Text>
                <TextInput
                  ref={addressRef}
                  style={[styles.input, styles.textArea]}
                  value={address}
                  onChangeText={gstVerified ? null : setAddress}
                  editable={!gstVerified}
                  multiline
                  placeholder="Enter full address"
                  returnKeyType="next"
                  onSubmitEditing={() => phoneRef.current?.focus()}
                  onFocus={() => scrollToInput(addressRef)}
                />

                {/* Phone & Email Row */}
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>
                      Phone{" "}
                      {gstVerified && (
                        <Text style={styles.verifiedTag}>(Verified)</Text>
                      )}
                    </Text>
                    <TextInput
                      ref={phoneRef}
                      style={styles.input}
                      value={phone}
                      onChangeText={gstVerified ? null : setPhone}
                      editable={!gstVerified}
                      keyboardType="phone-pad"
                      placeholder="Enter phone number"
                      returnKeyType="next"
                      onSubmitEditing={() => emailRef.current?.focus()}
                      onFocus={() => scrollToInput(phoneRef)}
                    />
                  </View>
                  <View style={{ width: 12 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>
                      Email{" "}
                      {gstVerified && (
                        <Text style={styles.verifiedTag}>(Verified)</Text>
                      )}
                    </Text>
                    <TextInput
                      ref={emailRef}
                      style={styles.input}
                      value={email}
                      onChangeText={gstVerified ? null : setEmail}
                      editable={!gstVerified}
                      keyboardType="email-address"
                      placeholder="Enter email"
                      returnKeyType="done"
                      onSubmitEditing={Keyboard.dismiss}
                      onFocus={() => scrollToInput(emailRef)}
                    />
                  </View>
                </View>

                {/* Logo Upload */}
                <Text style={styles.label}>Company Logo (Without Background)</Text>
                <TouchableOpacity
                  style={styles.imageBox}
                  onPress={() => pickImage("logo")}
                >
                  <Image
                    source={{ uri: logo || DEMO_LOGO }}
                    style={styles.imagePreview}
                    resizeMode="contain"
                  />
                  <View style={styles.imageOverlay}>
                    <Text style={styles.overlayText}>
                      Tap to {logo ? "Change" : "Upload"} Logo
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Signature Upload */}
                <Text style={styles.label}>Digital Signature (Without Background)</Text>
                <TouchableOpacity
                  style={styles.imageBox}
                  onPress={() => pickImage("signature")}
                >
                  <Image
                    source={{ uri: signature || DEMO_SIGNATURE }}
                    style={styles.imagePreview}
                    resizeMode="contain"
                  />
                  <View style={styles.imageOverlay}>
                    <Text style={styles.overlayText}>
                      Tap to {signature ? "Change" : "Upload"} Signature
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Save Button */}
                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    saving && styles.saveButtonDisabled,
                  ]}
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
      />
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },

  gstCard: {
    backgroundColor: "#f0fdf4",
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#86efac",
    marginBottom: 20,
  },
  gstQuestion: {
    fontSize: 17,
    fontWeight: "600",
    color: "#166534",
    textAlign: "center",
    marginBottom: 24,
  },
  buttonRow: { flexDirection: "row", gap: 20 },
  choiceBtn: { paddingHorizontal: 40, paddingVertical: 14, borderRadius: 12 },
  yesBtn: { backgroundColor: "#000e" },
  noBtn: { backgroundColor: "#ef4444" },
  choiceText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  gstSection: { marginBottom: 20 },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
    marginTop: 20,
    marginBottom: 8,
  },
  verifiedTag: { fontSize: 12, color: "#16a34a", fontWeight: "500" },
  gstInputContainer: { flexDirection: "row", alignItems: "flex-end", gap: 12 },
  gstInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    backgroundColor: "#fff",
  },
  verifyBtn: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  verifyBtnDisabled: { opacity: 0.6 },
  verifyText: { color: "#fff", fontWeight: "600" },
  hint: { fontSize: 13, color: "#6b7280", marginTop: 8, fontStyle: "italic" },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    backgroundColor: "#fff",
    color: "#000",
  },
  textArea: { height: 100, textAlignVertical: "top" },
  row: { flexDirection: "row", marginHorizontal: -6 },
  imageBox: {
    height: 160,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#f9fafb",
    borderWidth: 2,
    borderColor: "#e5e7eb",
    borderStyle: "dashed",
    marginTop: 10,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  imagePreview: { width: "100%", height: "100%" },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  overlayText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  saveButton: {
    backgroundColor: "#000",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 32,
  },
  saveButtonDisabled: { opacity: 0.7 },
  saveButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  loadingText: { marginTop: 12, color: "#666", fontSize: 15 },
});
