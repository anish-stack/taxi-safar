import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { Image } from "expo-image";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { scale, verticalScale, moderateScale } from "react-native-size-matters";

import loginStore from "../../store/auth.store";
import Layout from "../common/layout";
import BackWithLogo from "../common/back_with_logo";
import { API_URL_APP } from "../../constant/api";
import axios from "axios";
import * as ImagePicker from "expo-image-picker";
import useDriverStore from "../../store/driver.store";
import { UniversalAlert } from "../common/UniversalAlert";
import useSettings from "../../hooks/Settings";

export default function CompanyDetails({ navigation }) {
  const { token } = loginStore();
  const { driver, fetchDriverDetails } = useDriverStore();
  const { data } = useSettings();
  
  const scrollViewRef = useRef(null);

  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState("noGst");
  const [gstNumber, setGstNumber] = useState("");
  const [verifyingGst, setVerifyingGst] = useState(false);
  const [gstVerified, setGstVerified] = useState(false);

  const [companyName, setCompanyName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [logo, setLogo] = useState(null);
  const [signature, setSignature] = useState(null);
  const [logoType, setLogoType] = useState("default"); // "default" or "custom"
  const [signatureType, setSignatureType] = useState("default"); // "default" or "custom"

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({});

  const isInitialLoad = useRef(true);

  const showAlert = useCallback((type, title, message, onClose = null) => {
    setAlertConfig({ type, title, message });
    setAlertVisible(true);
    if (onClose) setTimeout(onClose, 500);
  }, []);

  const pickImage = useCallback(
    async (type) => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        showAlert("warning", "Permission Required", "Please grant photo library access.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        if (type === "logo") {
          setLogo(result.assets[0].uri);
          setLogoType("custom");
        } else {
          setSignature(result.assets[0].uri);
          setSignatureType("custom");
        }
      }
    },
    [showAlert]
  );

  useEffect(() => {
    if (!isEditMode || !driver) return;
    setCompanyName(`${driver?.driver_name || ""} Cab Service`);
    setPhone(driver?.driver_contact_number || "");
    setEmail(driver?.email || "");
    
    let addr = driver.address;
    if (typeof addr === "string") {
      try {
        const parsed = JSON.parse(addr);
        addr = typeof parsed === "object" ? Object.values(parsed).join("") : parsed;
      } catch {
        addr = driver.address;
      }
    } else if (typeof addr === "object") {
      addr = Object.values(addr).join("");
    }
    setAddress(addr);
  }, [driver, isEditMode]);

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
        setEmail(data.email || "");
        setGstNumber(data.gst_number || "");
        setLogo(data.logo?.url || null);
        setSignature(data.signature?.url || null);
        
        // Determine if logo/signature are custom or default
        const isLogoCustm = !data?.data?.DefaultLogos?.includes(data.logo?.url);
        const isSigCustom = !data?.data?.DefaultSigns?.includes(data.signature?.url);
        
        setLogoType(isLogoCustm ? "custom" : "default");
        setSignatureType(isSigCustom ? "custom" : "default");

        if (isInitialLoad.current) {
          setActiveTab(data.gst_number ? "withGst" : "noGst");
          if (data.gst_number) setGstVerified(true);
          setIsEditMode(false);
        }
      } else if (isInitialLoad.current) {
        setActiveTab("noGst");
        setLogo(data?.data?.DefaultLogos?.[0] || null);
        setSignature(data?.data?.DefaultSigns?.[0] || null);
        setLogoType("default");
        setSignatureType("default");
        setIsEditMode(true);
      }

      isInitialLoad.current = false;
    } catch (err) {
      showAlert("error", "Error", "Failed to load company details");
    } finally {
      setLoading(false);
    }
  }, [token, driver, showAlert, fetchDriverDetails, data]);

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
        const v = response.data.data;
        const parts = [v.address?.street, v.address?.city, v.address?.state, v.address?.pincode].filter(Boolean);
        
        setCompanyName(v.business_name || v.legal_name || "");
        setAddress(parts.join(", "));
        setEmail(v.email || v.emailId || "");
        setPhone(v.mobileNo || v.mobile || v.phone || "");
        setGstVerified(true);
        setActiveTab("withGst");
        showAlert("success", "GST Verified ✓", "Company details auto-filled!");
      } else {
        showAlert("error", "Invalid GST", response.data.message || "GST number not valid");
      }
    } catch (err) {
      showAlert("error", "Failed", err.response?.data?.message || "Verification failed");
    } finally {
      setVerifyingGst(false);
    }
  }, [gstNumber, token, showAlert]);

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
      formData.append("gst_number", activeTab === "withGst" && gstVerified ? gstNumber : "");

      // Handle logo
      if (logoType === "custom" && logo && logo.startsWith("file://")) {
        formData.append("logo", { uri: logo, name: "logo.jpg", type: "image/jpeg" });
      } else if (logoType === "default" && logo) {
        formData.append("logo_url", logo);
      }

      // Handle signature
      if (signatureType === "custom" && signature && signature.startsWith("file://")) {
        formData.append("signature", { uri: signature, name: "signature.png", type: "image/png" });
      } else if (signatureType === "default" && signature) {
        formData.append("signature_url", signature);
      }

      const isEditing = !!company;
      const url = isEditing ? `${API_URL_APP}/api/v1/update-company` : `${API_URL_APP}/api/v1/add-company`;

      await axios({
        method: isEditing ? "PUT" : "POST",
        url,
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
        data: formData,
      });

      showAlert("success", "Success", `Company details ${isEditing ? "updated" : "saved"}!`, () => {
        setIsEditMode(false);
        fetchCompany();
      });
    } catch (err) {
      console.log("err", err);
      showAlert("error", "Error", err.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }, [companyName, address, phone, email, activeTab, gstVerified, gstNumber, logo, signature, logoType, signatureType, company, token, showAlert, fetchCompany]);

  useEffect(() => {
    fetchCompany();
  }, []);

  if (loading) {
    return (
      <Layout showHeader={false}>
        <BackWithLogo />
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      </Layout>
    );
  }

  // View mode
  if (company && !isEditMode) {
    return (
      <Layout showHeader={false} showBottomTabs={false}>
        <BackWithLogo isLogo={false} title="My Agent Profile" />
        <ScrollView contentContainerStyle={{ paddingBottom: verticalScale(30) }} showsVerticalScrollIndicator={false}>
          <View style={styles.container}>
            <View style={styles.card}>
              <View style={{ flex: 1 }}>
                {logo && (
                  <View style={styles.logoSmall}>
                    <Image source={{ uri: logo }} style={{ width: "100%", height: "100%" }} contentFit="contain" />
                  </View>
                )}
                <Text style={styles.companyName}>{companyName}</Text>
                <Text style={styles.detail}>📍 {address?.split(",")[0] || "Location"}</Text>
                <Text style={styles.detail}>📞 {phone}</Text>
                {gstNumber && <View style={styles.badge}><Text style={styles.badgeText}>✓ GST Verified</Text></View>}
              </View>
              <TouchableOpacity style={styles.btnSmall} onPress={() => setIsEditMode(true)}>
                <Text style={styles.btnText}>Edit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
        <UniversalAlert visible={alertVisible} onClose={() => setAlertVisible(false)} {...alertConfig} />
      </Layout>
    );
  }

  // Edit mode
  const isFormVisible = activeTab === "noGst" || gstVerified;
  const defaultLogos = data?.data?.DefaultLogos || [];
  const defaultSignatures = data?.data?.DefaultSigns || [];

  return (
    <Layout showHeader={false} showBottomTabs={false}>
      <BackWithLogo isLogo={false} title={company ? "Edit Profile" : "Add Profile"} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView ref={scrollViewRef} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: verticalScale(30) }}>
          <View style={styles.container}>
            {/* Tabs */}
            <View style={styles.tabs}>
              <TouchableOpacity
                style={[styles.tab, activeTab === "noGst" && styles.tabActive]}
                onPress={() => { setActiveTab("noGst"); setGstVerified(false); }}
              >
                <Text style={[styles.tabText, activeTab === "noGst" && styles.tabTextActive]}>No GST</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === "withGst" && styles.tabActive]}
                onPress={() => setActiveTab("withGst")}
              >
                <Text style={[styles.tabText, activeTab === "withGst" && styles.tabTextActive]}>With GST</Text>
              </TouchableOpacity>
            </View>

            {/* GST Input */}
            {activeTab === "withGst" && !gstVerified && (
              <View>
                <Text style={styles.label}>GST Number</Text>
                <View style={styles.gstRow}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={gstNumber}
                    onChangeText={setGstNumber}
                    placeholder="09AAACC1206D1ZM"
                    autoCapitalize="characters"
                    maxLength={15}
                    placeholderTextColor="#999"
                  />
                  <TouchableOpacity
                    style={[styles.verifyBtn, (verifyingGst || gstNumber.length !== 15) && styles.btnDisabled]}
                    onPress={verifyGst}
                    disabled={verifyingGst || gstNumber.length !== 15}
                  >
                    {verifyingGst ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.btnText}>Verify</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Form Fields */}
            {isFormVisible && (
              <>
                <Text style={styles.label}>Business Name {gstVerified && <Text style={styles.verified}>(Verified)</Text>}</Text>
                <TextInput style={styles.input} value={companyName} onChangeText={setCompanyName} placeholder="Company name" editable={activeTab === "noGst"} placeholderTextColor="#999" />

                <Text style={styles.label}>Address {gstVerified && <Text style={styles.verified}>(Verified)</Text>}</Text>
                <TextInput style={[styles.input, { height: verticalScale(80) }]} value={address} onChangeText={setAddress} placeholder="Full address" multiline editable={activeTab === "noGst"} placeholderTextColor="#999" />

                <View style={styles.row}>
                  <View style={{ flex: 1, marginRight: scale(8) }}>
                    <Text style={styles.label}>Phone {gstVerified && <Text style={styles.verified}>(Verified)</Text>}</Text>
                    <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="Phone" keyboardType="phone-pad" editable={activeTab === "noGst"} placeholderTextColor="#999" />
                  </View>
                  <View style={{ flex: 1, marginLeft: scale(8) }}>
                    <Text style={styles.label}>Email {gstVerified && <Text style={styles.verified}>(Verified)</Text>}</Text>
                    <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="Email" keyboardType="email-address" editable={activeTab === "noGst"} placeholderTextColor="#999" />
                  </View>
                </View>

                {/* Logo Selection */}
                <Text style={styles.label}>Company Logo</Text>
                {logo && logoType === "custom" && (
                  <View style={styles.currentImageBox}>
                    <Image source={{ uri: logo }} style={{ width: "100%", height: "100%" }} contentFit="contain" />
                    <Text style={styles.currentImageText}>Current Logo</Text>
                  </View>
                )}
                <View style={styles.imageRow}>
                  <TouchableOpacity style={styles.uploadBtn} onPress={() => pickImage("logo")}>
                    <Text style={styles.uploadBtnText}>📤{"\n"}Upload</Text>
                  </TouchableOpacity>
                  {defaultLogos.map((imgUrl, i) => (
                    <TouchableOpacity key={i} style={styles.defaultImg} onPress={() => { setLogo(imgUrl); setLogoType("default"); }}>
                      <Image source={{ uri: imgUrl }} style={{ width: "100%", height: "100%" }} contentFit="contain" />
                      {logo === imgUrl && <View style={styles.checkmark} />}
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Signature Selection */}
                <Text style={styles.label}>Digital Signature</Text>
                {signature && signatureType === "custom" && (
                  <View style={styles.currentImageBox}>
                    <Image source={{ uri: signature }} style={{ width: "100%", height: "100%" }} contentFit="contain" />
                    <Text style={styles.currentImageText}>Current Signature</Text>
                  </View>
                )}
                <View style={styles.imageRow}>
                  <TouchableOpacity style={styles.uploadBtn} onPress={() => pickImage("signature")}>
                    <Text style={styles.uploadBtnText}>📤{"\n"}Upload</Text>
                  </TouchableOpacity>
                  {defaultSignatures.map((imgUrl, i) => (
                    <TouchableOpacity key={i} style={styles.defaultImg} onPress={() => { setSignature(imgUrl); setSignatureType("default"); }}>
                      <Image source={{ uri: imgUrl }} style={{ width: "100%", height: "100%" }} contentFit="contain" />
                      {signature === imgUrl && <View style={styles.checkmark} />}
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity style={[styles.saveBtn, saving && styles.btnDisabled]} onPress={handleSubmit} disabled={saving}>
                  {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{company ? "Update" : "Save"}</Text>}
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <UniversalAlert visible={alertVisible} onClose={() => setAlertVisible(false)} {...alertConfig} />
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: { padding: scale(12) },
  
  tabs: { flexDirection: "row", gap: scale(8), marginBottom: verticalScale(8), backgroundColor: "#f3f4f6", borderRadius: 8, padding: 4 },
  tab: { flex: 1, paddingVertical: verticalScale(10), borderRadius: 6, alignItems: "center" },
  tabActive: { backgroundColor: "#000" },
  tabText: { fontSize: 14, fontWeight: "600", color: "#6b7280" },
  tabTextActive: { color: "#fff" },

  label: { fontSize: 14, fontWeight: "600", color: "#000", marginTop: verticalScale(12), marginBottom: verticalScale(6) },
  verified: { fontSize: 10, color: "#16a34a", fontWeight: "500" },

  input: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8, paddingHorizontal: scale(12), paddingVertical: verticalScale(10), fontSize: 14, backgroundColor: "#fff", color: "#000" },
  
  gstRow: { flexDirection: "row", gap: scale(8), alignItems: "flex-end" },
  verifyBtn: { backgroundColor: "#000", paddingHorizontal: scale(16), paddingVertical: verticalScale(10), borderRadius: 8, justifyContent: "center", alignItems: "center" },
  
  row: { flexDirection: "row", gap: scale(8) },

  imageRow: { flexDirection: "row", gap: scale(8), marginBottom: verticalScale(6) },
  defaultImg: { width: scale(60), height: scale(60), borderRadius: 8, backgroundColor: "#f0f0f0", borderWidth: 1, borderColor: "#e5e7eb", justifyContent: "center", alignItems: "center", position: "relative" },
  uploadBtn: { width: scale(60), height: scale(60), borderRadius: 8, backgroundColor: "#f0f0f0", borderWidth: 1, borderColor: "#e5e7eb", justifyContent: "center", alignItems: "center" },
  uploadBtnText: { fontSize: 10, fontWeight: "600", color: "#000", textAlign: "center" },
  checkmark: { position: "absolute", width: scale(20), height: scale(20), borderRadius: 10, backgroundColor: "#16a34a", right: scale(-8), top: scale(-8), borderWidth: 2, borderColor: "#fff" },

  saveBtn: { backgroundColor: "#000", paddingVertical: verticalScale(12), borderRadius: 8, alignItems: "center", marginTop: verticalScale(20) },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  btnSmall: { paddingHorizontal: scale(16), paddingVertical: verticalScale(8), backgroundColor: "#000", borderRadius: 6, justifyContent: "center" },

  card: { backgroundColor: "#fff", borderRadius: 12, padding: scale(12), flexDirection: "row", alignItems: "center", gap: scale(12), shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 },
  logoSmall: { width: scale(60), height: scale(60), borderRadius: 8, backgroundColor: "#f0f0f0", overflow: "hidden" },
  companyName: { fontSize: 16, fontWeight: "700", color: "#000", marginBottom: verticalScale(4) },
  detail: { fontSize: 12, color: "#6b7280", marginBottom: verticalScale(2) },
  badge: { backgroundColor: "#dcfce7", paddingHorizontal: scale(8), paddingVertical: verticalScale(2), borderRadius: 4, alignSelf: "flex-start", marginTop: verticalScale(4) },
  badgeText: { fontSize: 10, fontWeight: "600", color: "#065f46" },
  currentImageBox: { width: "50%", height: verticalScale(70), borderRadius: 8, backgroundColor: "#f0f0f0", borderWidth: 2, borderColor: "#16a34a", justifyContent: "center", alignItems: "center", marginBottom: verticalScale(12), position: "relative", overflow: "hidden" },
  currentImageText: { position: "absolute", bottom: verticalScale(4), left: 0, right: 0, textAlign: "center", fontSize: 10, fontWeight: "600", color: "#16a34a", backgroundColor: "rgba(255,255,255,0.9)", paddingVertical: verticalScale(2) },
});