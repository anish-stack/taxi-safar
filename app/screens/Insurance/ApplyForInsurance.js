// screens/ApplyForInsurance.js
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Picker } from "@react-native-picker/picker";

import BackWithLogo from "../common/back_with_logo";
import loginStore from "../../store/auth.store";
import useDriverStore from "../../store/driver.store";
import axios from "axios";
import { API_URL_APP } from "../../constant/api";
import { UniversalAlert } from "../common/UniversalAlert";

export default function ApplyForInsurance() {
  const navigation = useNavigation();
  const route = useRoute();
  const { id } = route.params || {};
  const { token } = loginStore();
  const { driver } = useDriverStore();

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const [alertData, setAlertData] = useState({
    visible: false,
    type: "error",
    title: "",
    message: "",
  });

  const [formData, setFormData] = useState({
    full_name: "",
    contact_number: "",
    budget: "0",
    vehicle_number: "",
    insurance_type: "third_party",
    extra_notes: "",
  });

  // Fetch for Edit Mode
  useEffect(() => {
    if (!id) return;

    const fetchDetails = async () => {
      setFetching(true);
      try {
        const res = await axios.get(`${API_URL_APP}/api/v1/insurance/my/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = res.data?.data;
        setFormData({
          full_name: data.full_name || "",
          contact_number: data.contact_number || "",
          vehicle_number: data.vehicle_number || "",
          insurance_type: data.insurance_type || "third_party",
          extra_notes: data.extra_notes || "",
        });
      } catch (error) {
        showAlert("error", "Error", "Failed to load details");
      } finally {
        setFetching(false);
      }
    };

    fetchDetails();
  }, [id]);

  // Auto-fill for New Request
  useEffect(() => {
    if (id) return;

    setFormData((prev) => ({
      ...prev,
      full_name: driver?.driver_name || "",
      contact_number: driver?.driver_contact_number || "",
      vehicle_number: driver?.current_vehicle_id?.vehicle_number || "",
    }));
  }, [driver]);

  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const showAlert = (type, title, message) => {
    setAlertData({ visible: true, type, title, message });
  };

  const submitRequest = async () => {
    if (!formData.full_name || !formData.contact_number || !formData.vehicle_number) {
      return showAlert("error", "Required", "Please fill all required fields");
    }

    setLoading(true);
    try {
      if (id) {
        await axios.put(`${API_URL_APP}/api/v1/insurance/${id}`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        showAlert("success", "Updated", "Insurance request updated successfully");
      } else {
        await axios.post(`${API_URL_APP}/api/v1/insurance`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        showAlert("success", "Submitted", "Insurance request sent successfully");
      }
    } catch (error) {
      showAlert(
        "error",
        "Failed",
        error?.response?.data?.message || "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <SafeAreaView style={styles.container}>
        <BackWithLogo />
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#E52710" />
          <Text style={styles.loaderText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <BackWithLogo />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconBg}>
              <Text style={styles.icon}>🛡️</Text>
            </View>
            <Text style={styles.title}>
              {id ? "Edit Request" : "Apply for Insurance"}
            </Text>
            <Text style={styles.subtitle}>
              Get the best insurance quote for your vehicle
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Personal Details */}
            <Text style={styles.sectionTitle}>Personal Details</Text>

            <View style={styles.field}>
              <Text style={styles.label}>Full Name</Text>
              <View style={[styles.inputBox, focusedField === "name" && styles.focused]}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter name"
                  value={formData.full_name}
                  onChangeText={(v) => handleChange("full_name", v)}
                  onFocus={() => setFocusedField("name")}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Contact Number</Text>
              <View style={[styles.inputBox, focusedField === "phone" && styles.focused]}>
                <TextInput
                  style={styles.input}
                  placeholder="10-digit number"
                  keyboardType="number-pad"
                  maxLength={10}
                  value={formData.contact_number}
                  onChangeText={(v) => handleChange("contact_number", v)}
                  onFocus={() => setFocusedField("phone")}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>

            {/* Vehicle Details */}
            <Text style={styles.sectionTitle}>Vehicle Details</Text>

            <View style={styles.field}>
              <Text style={styles.label}>Vehicle Number</Text>
              <View style={[styles.inputBox, focusedField === "vehicle" && styles.focused]}>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. DL01AB1234"
                  autoCapitalize="characters"
                  value={formData.vehicle_number}
                  onChangeText={(v) => handleChange("vehicle_number", v)}
                  onFocus={() => setFocusedField("vehicle")}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>

            {/* Insurance Type */}
            <Text style={styles.sectionTitle}>Insurance Type</Text>

            <View style={styles.field}>
              <Text style={styles.label}>Select Type</Text>
              <View style={styles.pickerBox}>
                <Picker
                  selectedValue={formData.insurance_type}
                  onValueChange={(v) => handleChange("insurance_type", v)}
                  style={styles.picker}
                >
                  <Picker.Item label="Third Party" value="third_party" />
                  <Picker.Item label="Comprehensive" value="comprehensive" />
                  <Picker.Item label="Zero Depreciation" value="zero_dep" />
                  <Picker.Item label="Other" value="other" />
                </Picker>
              </View>
            </View>

            {/* Extra Notes */}
            <View style={styles.field}>
              <Text style={styles.label}>Additional Notes (Optional)</Text>
              <View style={[styles.inputBox, styles.textArea, focusedField === "notes" && styles.focused]}>
                <TextInput
                  style={styles.textAreaInput}
                  placeholder="Any specific requirements..."
                  multiline
                  value={formData.extra_notes}
                  onChangeText={(v) => handleChange("extra_notes", v)}
                  onFocus={() => setFocusedField("notes")}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitDisabled]}
            onPress={submitRequest}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.submitText}>
                {id ? "Update Request" : "Submit Request"}
              </Text>
            )}
          </TouchableOpacity>

          <Text style={styles.secureText}>🔒 Your data is safe and encrypted</Text>
        </ScrollView>
      </KeyboardAvoidingView>

      <UniversalAlert
        visible={alertData.visible}
        type={alertData.type}
        title={alertData.title}
        message={alertData.message}
        onClose={() => {
          setAlertData((p) => ({ ...p, visible: false }));
          if (alertData.type === "success") navigation.goBack();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loaderText: {
    marginTop: 12,
    fontSize: 15,
    color: "#666",
  },

  content: {
    padding: 16,
    paddingBottom: 40,
  },

  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  iconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#E52710",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  icon: {
    fontSize: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#000",
    fontFamily: "SFProDisplay-Bold",
  },
  subtitle: {
    fontSize: 13,
    color: "#777",
    textAlign: "center",
    marginTop: 6,
    fontFamily: "SFProDisplay-Medium",
  },

  form: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#000",
    marginBottom: 14,
    marginTop: 6,
    fontFamily: "SFProDisplay-Semibold",
  },

  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    color: "#444",
    marginBottom: 6,
    fontFamily: "SFProDisplay-Medium",
  },
  inputBox: {
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  focused: {
    borderColor: "#E52710",
    backgroundColor: "#fff",
  },
  input: {
    fontSize: 15,
    color: "#000",
    fontFamily: "SFProDisplay-Regular",
  },
  textArea: {
    minHeight: 90,
    paddingTop: 10,
  },
  textAreaInput: {
    fontSize: 15,
    color: "#000",
    textAlignVertical: "top",
    fontFamily: "SFProDisplay-Regular",
  },

  pickerBox: {
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  picker: {
    fontSize: 15,
  },

  submitBtn: {
    backgroundColor: "#000",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  submitDisabled: {
    backgroundColor: "#888",
  },
  submitText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "SFProDisplay-Semibold",
  },

  secureText: {
    textAlign: "center",
    fontSize: 12,
    color: "#888",
    marginTop: 10,
    fontFamily: "SFProDisplay-Medium",
  },
});