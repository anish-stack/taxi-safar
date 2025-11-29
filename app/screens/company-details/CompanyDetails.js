import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  TextInput,
  Alert,
  StyleSheet, // ← THIS WAS MISSING!
} from "react-native";
import React, { useEffect, useState } from "react";
import loginStore from "../../store/auth.store";
import Layout from "../common/layout";
import BackWithLogo from "../common/back_with_logo";
import { API_URL_APP } from "../../constant/api";
import axios from "axios";
import * as ImagePicker from "expo-image-picker";
import useDriverStore from "../../store/driver.store";
import { UniversalAlert } from "../common/UniversalAlert";
// Demo placeholder images
const DEMO_LOGO = "https://img.icons8.com/color/480/000000/company.png";
const DEMO_SIGNATURE =
  "https://img.icons8.com/fluency/480/000000/signature.png";

export default function CompanyDetails() {
  const { token } = loginStore();
  const { driver, fetchDriverDetails } = useDriverStore();

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

  const [companyName, setCompanyName] = useState("a");
  const [address, setAddress] = useState("a");
  const [phone, setPhone] = useState("7217619794");
  const [email, setEmail] = useState("aa@gmail,com");
  const [logo, setLogo] = useState(null);
  const [signature, setSignature] = useState(null);

  const fetchCompany = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL_APP}/api/v1/my-company`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchDriverDetails();
      const data = res.data?.data;

      if (!data || Object.keys(data).length === 0) {
        setCompany(null);
      } else {
        setCompany(data);
      }

      if (data) {
        setCompanyName(data.company_name || "");
        setAddress(data.address || "");
        setPhone(data.phone || driver?.driver_contact_number || "");
        setEmail(data.email || driver?.driver_email || "");
        setLogo(data.logo?.url || null);
        setSignature(data.signature?.url || null);
      }
    } catch (err) {
      console.log("Fetch error =>", err);
      Alert.alert("Error", "Failed to load company details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompany();
  }, []);


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

    // LOG CHECK
    console.log("Selected logo:", logo);
    console.log("Selected signature:", signature);

    // Upload logo ONLY if new file selected
    if (logo && logo.startsWith("file://")) {
      formData.append("logo", {
        uri: logo,
        name: "logo.jpg",
        type: "image/jpeg",
      });
    }

    // Upload signature ONLY if new file selected
    if (signature && signature.startsWith("file://")) {
      formData.append("signature", {
        uri: signature,
        name: "signature.png",
        type: "image/png",
      });
    }

    // Determine POST or PUT
    const isEditing = !!company;

    const url = isEditing
      ? `${API_URL_APP}/api/v1/update-company`
      : `${API_URL_APP}/api/v1/add-company`;

    const method = isEditing ? "PUT" : "POST";

    console.log("🔵 API Method:", method);
    console.log("🔵 API URL:", url);

    const response = await axios({
      method,
      url,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "multipart/form-data",
      },
      data: formData,
    });

    // SERVER RESPONSE LOG
    console.log("🟢 API Response:", response.data);

    // SUCCESS ALERT
    showAlert(
      "success",
      isEditing ? "Company Updated" : "Company Added",
      isEditing
        ? "Your company details have been updated successfully."
        : "Your company details have been added successfully.",
      () => {
        setAlertVisible(false);
        fetchCompany();
      }
    );

  } catch (err) {
    console.log("❌ Submit error:", err?.response?.data || err);

    showAlert(
      "error",
      "Error",
      "Failed to save company details. Please try again."
    );

  } finally {
    setSaving(false);
  }
};


  if (loading) {
    return (
      <Layout showHeader={false}>
        <BackWithLogo />
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={{ marginTop: 15, color: "#666", fontSize: 16 }}>
            Loading company details...
          </Text>
        </View>
      </Layout>
    );
  }

  return (
    <Layout showHeader={false}>
      <BackWithLogo />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 50 }}
      >
        <View style={{ padding: 20 }}>
          <Text style={styles.title}>
            {company ? "Edit Company" : "Add New Company"}
          </Text>
          <Text style={styles.subtitle}>
            Manage your company profile and branding
          </Text>

          {/* Company Name */}
          <Text style={styles.label}>Company Name *</Text>
          <TextInput
            style={styles.input}
            value={companyName}
            onChangeText={setCompanyName}
            placeholder="e.g. Acme Corporation"
            placeholderTextColor="#aaa"
          />

          {/* Address */}
          <Text style={styles.label}>Address</Text>
          <TextInput
            style={[
              styles.input,
              { height: 100, textAlignVertical: "top", paddingTop: 14 },
            ]}
            value={address}
            onChangeText={setAddress}
            multiline
            placeholder="123 Business Ave, City, Country"
            placeholderTextColor="#aaa"
          />

          {/* Phone & Email */}
          <View style={{ flexDirection: "row", gap: 12, marginTop: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Phone</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder="+1 (555) 000-1234"
                placeholderTextColor="#aaa"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                placeholder="hello@company.com"
                placeholderTextColor="#aaa"
              />
            </View>
          </View>

          {/* Logo */}
          <Text style={styles.label}>Company Logo</Text>
          <TouchableOpacity
            style={styles.imageContainer}
            onPress={() => pickImage("logo")}
          >
            <Image
              source={{ uri: logo || DEMO_LOGO }}
              style={styles.previewImage}
              resizeMode="contain"
            />
            <View style={styles.overlay}>
              <Text style={styles.overlayText}>Tap to Change Logo</Text>
            </View>
          </TouchableOpacity>

          {/* Signature */}
          <Text style={styles.label}>Digital Signature</Text>
          <TouchableOpacity
            style={styles.imageContainer}
            onPress={() => pickImage("signature")}
          >
            <Image
              source={{ uri: signature || DEMO_SIGNATURE }}
              style={styles.previewImage}
              resizeMode="contain"
            />
            <View style={styles.overlay}>
              <Text style={styles.overlayText}>
                {signature ? "Tap to Change" : "Tap to Upload Signature"}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Save Button */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={saving}
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          >
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.saveBtnText}>
                {company ? "Update Company" : "Save Company"}
              </Text>
            )}
          </TouchableOpacity>
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
    </Layout>
  );
}

// Fixed & Clean Styles
const styles = StyleSheet.create({
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 25,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    marginTop: 20,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1.5,
    borderColor: "#ddd",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  imageContainer: {
    height: 180,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#f9f9f9",
    borderWidth: 2,
    borderColor: "#e0e0e0",
    borderStyle: "dashed",
    marginTop: 10,
    position: "relative",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  overlayText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  saveBtn: {
    backgroundColor: "#007AFF",
    paddingVertical: 17,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 35,
  },
  saveBtnDisabled: {
    opacity: 0.7,
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});
