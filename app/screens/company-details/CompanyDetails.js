import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Modal,
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

      <TouchableOpacity
        style={styles.imageBox}
        onPress={onPress}
        activeOpacity={0.8}
      >
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

export default function CompanyDetails({ navigation }) {
  const { token } = loginStore();
  const { driver, fetchDriverDetails } = useDriverStore();

  const scrollViewRef = useRef(null);

  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    type: "success",
    title: "",
    message: "",
    primaryButton: "OK",
    onPrimaryPress: () => setAlertVisible(false),
  });

  const [isEditMode, setIsEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState("noGst");

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

  const pickImage = useCallback(
    async (type) => {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        showAlert(
          "warning",
          "Permission Required",
          "Please grant access to your photo library."
        );
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
    },
    [showAlert]
  );

  const onPickLogo = useCallback(() => pickImage("logo"), [pickImage]);
  const onPickSignature = useCallback(
    () => pickImage("signature"),
    [pickImage]
  );

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
            setActiveTab("withGst");
            setGstVerified(true);
          } else {
            setActiveTab("noGst");
          }
          setIsEditMode(false);
        }
      } else {
        if (isInitialLoad.current) {
          setActiveTab("noGst");
          setIsEditMode(true);
        }
      }

      isInitialLoad.current = false;
    } catch (err) {
      console.log("Fetch error =>", err?.response?.data);
      showAlert("error", "Error", "Failed to load company details");
    } finally {
      setLoading(false);
    }
  }, [token, driver, showAlert, fetchDriverDetails]);

  const verifyGst = useCallback(async () => {
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

      if (response.data.success) {
        const verified = response.data.data;
        const companyNameValue =
          verified.business_name || verified.legal_name || "";
        let addressValue = "";
        if (verified.address && typeof verified.address === "object") {
          const parts = [];
          if (
            verified.address.street &&
            verified.address.street !== "123 Default Street"
          )
            parts.push(verified.address.street);
          if (verified.address.city && verified.address.city !== "Default City")
            parts.push(verified.address.city);
          if (
            verified.address.state &&
            verified.address.state !== "Default State"
          )
            parts.push(verified.address.state);
          if (verified.address.pincode && verified.address.pincode !== "000000")
            parts.push(verified.address.pincode);
          addressValue = parts.join(", ");
        } else if (typeof verified.address === "string") {
          addressValue = verified.address;
        }

        const emailValue = verified.email || verified.emailId || "";
        const phoneValue =
          verified.mobileNo || verified.mobile || verified.phone || "";

        const filledData = {
          name: companyNameValue,
          address: addressValue,
          email: emailValue,
          phone: phoneValue,
        };

        setGstData(filledData);
        setGstVerified(true);
        if (filledData.name) setCompanyName(filledData.name);
        if (filledData.address) setAddress(filledData.address);
        if (filledData.email)
          setEmail(filledData.email || driver?.driver_email || "");
        if (filledData.phone)
          setPhone(filledData.phone || driver?.driver_contact_number || "");

        showAlert(
          "success",
          "GST Verified ✓",
          "Company details auto-filled successfully!"
        );
        setActiveTab("withGst");
      } else {
        showAlert(
          "error",
          "Invalid GST",
          response.data.message || "GST number not valid"
        );
      }
    } catch (err) {
      showAlert(
        "error",
        "Failed",
        err.response?.data?.message || "Verification failed"
      );
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
      formData.append(
        "gst_number",
        activeTab === "withGst" && gstVerified ? gstNumber : ""
      );

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
        () => {
          setIsEditMode(false);
          fetchCompany();
        }
      );
    } catch (err) {
      showAlert(
        "error",
        "Error",
        err.response?.data?.message || "Failed to save company details"
      );
    } finally {
      setSaving(false);
    }
  }, [
    companyName,
    address,
    phone,
    email,
    activeTab,
    gstVerified,
    gstNumber,
    logo,
    signature,
    company,
    token,
    showAlert,
    fetchCompany,
  ]);

  const scrollToInput = useCallback((ref) => {
    ref.current?.measure((x, y, width, height, pageX, pageY) => {
      scrollViewRef.current?.scrollTo({ y: pageY - 100, animated: true });
    });
  }, []);

  useEffect(() => {
    fetchCompany();
  }, [fetchCompany]);

  useEffect(() => {
    (async () => {
      if (Platform.OS === "android") {
        const pending = await ImagePicker.getPendingResultAsync();
        if (pending.length > 0) {
          const lastResult = pending[pending.length - 1];
          if (lastResult?.assets?.[0]?.uri) {
            showAlert(
              "info",
              "Recovered Image",
              "An image selection was recovered. Please re-upload if needed."
            );
          }
        }
      }
    })();
  }, [showAlert]);

  if (loading) {
    return (
      <Layout showHeader={false}>
        <BackWithLogo />
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.loadingText}>Loading profile details...</Text>
        </View>
      </Layout>
    );
  }


  // Show detail card if company exists and not in edit mode
  if (company && !isEditMode) {
    return (
      <Layout showHeader={false} showBottomTabs={false}>
        <BackWithLogo isLogo={false} title="My Agent Profile" />
        <ScrollView
          contentContainerStyle={{ paddingBottom: verticalScale(50) }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>
            <View style={styles.compactDetailCard}>
              {/* Logo + Info Section */}
              <View style={styles.cardContent}>
                {/* Logo */}
                {logo && (
                  <View style={styles.compactLogoContainer}>
                    <Image
                      source={{ uri: logo }}
                      style={styles.compactLogo}
                      contentFit="contain"
                    />
                  </View>
                )}

                {/* Text Info */}
                <View style={styles.cardInfo}>
                  <Text style={styles.compactCompanyName}>{companyName}</Text>

                  <View style={styles.compactDetails}>
                    <Text style={styles.compactLabel}>
                      📍 {address?.split(",")[0] || "Location"}
                    </Text>
                    <Text style={styles.compactLabel}>
                      📞 {phone || "Phone"}
                    </Text>
                  </View>

                  {gstNumber && (
                    <View style={styles.gstBadge}>
                      <Text style={styles.gstBadgeText}>GST Verified ✓</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={styles.viewButton}
                  onPress={() => setViewModalVisible(true)}
                >
                  <Text style={styles.viewButtonText}>View</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.editActionButton}
                  onPress={() => setIsEditMode(true)}
                >
                  <Text style={styles.editActionButtonText}>Edit</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
        <UniversalAlert
          visible={alertVisible}
          onClose={() => setAlertVisible(false)}
          type={alertConfig.type}
          title={alertConfig.title}
          message={alertConfig.message}
          primaryButton={alertConfig.primaryButton}
          onPrimaryPress={alertConfig.onPrimaryPress}
        />

        {/* View Details Modal */}
        <Modal
          visible={viewModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setViewModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.viewModalContent}>
              {/* Modal Header */}
              <View style={styles.viewModalHeader}>
                <Text style={styles.viewModalTitle}>Profile Details</Text>
                <TouchableOpacity onPress={() => setViewModalVisible(false)}>
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Modal Body */}
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.viewModalBody}
              >
                {/* Logo Section */}
                {logo && (
                  <View style={styles.modalLogoContainer}>
                    <Image
                      source={{ uri: logo }}
                      style={styles.modalLogoImage}
                      contentFit="contain"
                    />
                  </View>
                )}

                {/* Company Name */}
                <Text style={styles.modalCompanyName}>{companyName}</Text>

                {/* Details Sections */}
                <View style={styles.modalDetailSection}>
                  <Text style={styles.modalDetailLabel}>Address</Text>
                  <Text style={styles.modalDetailValue}>
                    {address || "N/A"}
                  </Text>
                </View>

                <View style={styles.modalDetailSection}>
                  <Text style={styles.modalDetailLabel}>Phone</Text>
                  <Text style={styles.modalDetailValue}>{phone || "N/A"}</Text>
                </View>

                <View style={styles.modalDetailSection}>
                  <Text style={styles.modalDetailLabel}>Email</Text>
                  <Text style={styles.modalDetailValue}>{email || "N/A"}</Text>
                </View>

                {gstNumber && (
                  <View style={styles.modalDetailSection}>
                    <Text style={styles.modalDetailLabel}>GST Number</Text>
                    <Text style={styles.modalDetailValue}>{gstNumber}</Text>
                  </View>
                )}

                {signature && (
                  <View style={styles.modalDetailSection}>
                    <Text style={styles.modalDetailLabel}>
                      Digital Signature
                    </Text>
                    <Image
                      source={{ uri: signature }}
                      style={styles.modalSignatureImage}
                      contentFit="contain"
                    />
                  </View>
                )}
              </ScrollView>

              {/* Close Button */}
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setViewModalVisible(false)}
              >
                <Text style={styles.modalCloseBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </Layout>
    );
  }

  // Edit mode form
  const isFormVisible = activeTab === "noGst" || gstVerified;
  const isFormEditable = activeTab === "noGst" || !gstVerified;

 
  return (
    <Layout showHeader={false} showBottomTabs={false}>
      <BackWithLogo
        isLogo={false}
        title={company ? "Edit My Agent Profile" : "Add My Agent Profile"}
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
                style={[styles.tab, activeTab === "noGst" && styles.activeTab]}
                onPress={() => {
                  setActiveTab("noGst");
                  setGstVerified(false);
                  setGstData(null);
                }}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === "noGst" && styles.activeTabText,
                  ]}
                >
                  No GST
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.tab,
                  activeTab === "withGst" && styles.activeTab,
                ]}
                onPress={() => setActiveTab("withGst")}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === "withGst" && styles.activeTabText,
                  ]}
                >
                  With GST
                </Text>
              </TouchableOpacity>
            </View>

            {/* GST Input */}
            {activeTab === "withGst" && !gstVerified && (
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
                    placeholderTextColor="#999"
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

            {/* Form Fields */}
            {isFormVisible && (
              <>
                <Text style={styles.label}>
                  Business Name{" "}
                  {gstVerified && (
                    <Text style={styles.verifiedTag}>(Verified)</Text>
                  )}
                </Text>
                <TextInput
                  ref={companyNameRef}
                  style={styles.input}
                  value={companyName}
                  onChangeText={isFormEditable ? setCompanyName : null}
                  editable={isFormEditable}
                  placeholder="Enter company name"
                  placeholderTextColor="#999"
                  returnKeyType="next"
                />

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
                  onChangeText={isFormEditable ? setAddress : null}
                  editable={isFormEditable}
                  multiline
                  placeholder="Enter full address"
                  placeholderTextColor="#999"
                  returnKeyType="next"
                />

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
                      onChangeText={isFormEditable ? setPhone : null}
                      editable={isFormEditable}
                      keyboardType="phone-pad"
                      placeholder="Enter phone number"
                      placeholderTextColor="#999"
                      returnKeyType="next"
                    />
                  </View>
                  <View style={{ width: scale(12) }} />
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
                      onChangeText={isFormEditable ? setEmail : null}
                      editable={isFormEditable}
                      keyboardType="email-address"
                      placeholder="Enter email"
                      placeholderTextColor="#999"
                      returnKeyType="done"
                    />
                  </View>
                </View>

                {/* Image Uploaders */}
                {/* Image Uploaders - Side by Side */}
                <View style={styles.imageUploadersContainer}>
                  <View style={styles.imageUploaderWrapper}>
                    <ImageUploader
                      title="Company Logo (Transparent Background Recommended)"
                      uri={logo}
                      onPress={onPickLogo}
                    />
                  </View>

                  <View style={styles.imageUploaderWrapper}>
                    <ImageUploader
                      title="Digital Signature (Transparent Background Recommended)"
                      uri={signature}
                      onPress={onPickSignature}
                    />
                  </View>
                </View>
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
                      {company ? "Update Profile" : "Save Profile"}
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
    fontSize: moderateScale(11),
    fontWeight: "600",
    color: "#000",
    marginTop: verticalScale(20),
    marginBottom: verticalScale(8),
  },
  verifiedTag: {
    fontSize: moderateScale(12),
    color: "#16a34a",
    fontWeight: "500",
  },

  gstInputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: scale(12),
  },
  gstInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: moderateScale(10),
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(12),
    fontSize: moderateScale(15),
    backgroundColor: "#fff",
    color: "#000",
  },
  verifyBtn: {
    backgroundColor: "#000",
    paddingHorizontal: scale(24),
    paddingVertical: verticalScale(12),
    borderRadius: moderateScale(10),
  },
  verifyBtnDisabled: { opacity: 0.6 },
  verifyText: { color: "#fff", fontWeight: "600" },
  hint: {
    fontSize: moderateScale(10),
    color: "#6b7280",
    marginTop: verticalScale(8),
    fontStyle: "italic",
  },

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
    height: verticalScale(120),
    width: "100%",
    flex: 1,
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
  overlayText: {
    color: "#fff",
    fontSize: moderateScale(11),
    fontWeight: "600",
  },

  saveButton: {
    backgroundColor: "#000",
    paddingVertical: verticalScale(16),
    borderRadius: moderateScale(12),
    alignItems: "center",
    marginTop: verticalScale(32),
  },
  saveButtonDisabled: { opacity: 0.7 },
  saveButtonText: {
    color: "#fff",
    fontSize: moderateScale(16),
    fontWeight: "bold",
  },

  // Compact Detail Card Styles (Hotel Card Style)
  compactDetailCard: {
    backgroundColor: "#fff",
    borderRadius: moderateScale(16),
    padding: scale(14),
    // marginTop: verticalScale(16),
    marginBottom: verticalScale(16),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  cardContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: scale(12),
  },
  compactLogoContainer: {
    width: scale(80),
    height: scale(80),
    borderRadius: moderateScale(12),
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  compactLogo: {
    width: "90%",
    height: "90%",
  },
  cardInfo: {
    flex: 1,
  },
  compactCompanyName: {
    fontSize: moderateScale(16),
    fontWeight: "700",
    color: "#000",
    marginBottom: verticalScale(6),
  },
  compactDetails: {
    marginBottom: verticalScale(8),
  },
  compactLabel: {
    fontSize: moderateScale(12),
    color: "#6b7280",
    marginBottom: verticalScale(3),
    lineHeight: 16,
  },
  gstBadge: {
    backgroundColor: "#dcfce7",
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
    borderRadius: moderateScale(6),
    alignSelf: "flex-start",
  },
  gstBadgeText: {
    fontSize: moderateScale(11),
    fontWeight: "600",
    color: "#065f46",
  },
  cardActions: {
    flexDirection: "column",
    gap: verticalScale(8),
    marginLeft: scale(12),
  },
  viewButton: {
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(8),
    borderRadius: moderateScale(8),
    borderWidth: 1,
    borderColor: "#000",
    alignItems: "center",
    minWidth: scale(70),
  },
  viewButtonText: {
    fontSize: moderateScale(12),
    fontWeight: "600",
    color: "#000",
  },
  editActionButton: {
    backgroundColor: "#000",
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(8),
    borderRadius: moderateScale(8),
    alignItems: "center",
    minWidth: scale(70),
  },
  editActionButtonText: {
    fontSize: moderateScale(12),
    fontWeight: "600",
    color: "#fff",
  },

  loadingText: {
    marginTop: verticalScale(12),
    color: "#666",
    fontSize: moderateScale(15),
  },

  // View Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  viewModalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: moderateScale(20),
    borderTopRightRadius: moderateScale(20),
    maxHeight: "90%",
    paddingTop: verticalScale(16),
  },
  viewModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(12),
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  viewModalTitle: {
    fontSize: moderateScale(18),
    fontWeight: "700",
    color: "#000",
  },
  closeButtonText: {
    fontSize: moderateScale(24),
    color: "#6b7280",
    fontWeight: "600",
  },
  viewModalBody: {
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(16),
    paddingBottom: verticalScale(20),
  },
  modalLogoContainer: {
    width: "100%",
    height: verticalScale(120),
    borderRadius: moderateScale(12),
    backgroundColor: "#f9fafb",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: verticalScale(20),
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  modalLogoImage: {
    width: "80%",
    height: "100%",
  },
  modalCompanyName: {
    fontSize: moderateScale(22),
    fontWeight: "700",
    color: "#000",
    marginBottom: verticalScale(20),
    textAlign: "center",
  },
  modalDetailSection: {
    marginBottom: verticalScale(16),
    paddingBottom: verticalScale(16),
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalDetailLabel: {
    fontSize: moderateScale(12),
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: verticalScale(6),
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  modalDetailValue: {
    fontSize: moderateScale(15),
    fontWeight: "500",
    color: "#000",
    lineHeight: 22,
  },
  modalSignatureImage: {
    width: "100%",
    height: verticalScale(100),
    marginTop: verticalScale(10),
    borderRadius: moderateScale(8),
  },
  modalCloseBtn: {
    backgroundColor: "#000",
    paddingVertical: verticalScale(14),
    borderRadius: moderateScale(12),
    alignItems: "center",
    marginHorizontal: scale(20),
    marginBottom: verticalScale(20),
  },
  modalCloseBtnText: {
    color: "#fff",
    fontSize: moderateScale(16),
    fontWeight: "600",
  },
  imageUploadersContainer: {
    flexDirection: "row",
    gap: scale(16),
    marginTop: verticalScale(20),
    marginHorizontal: scale(16), // optional: align with other inputs
  },

  imageUploaderWrapper: {
    flex: 1, // Each takes equal width
  },
});
