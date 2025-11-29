import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
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
  const { token } = loginStore();
  const { driver } = useDriverStore();
  const route = useRoute();
  const { id } = route.params || {};

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
    vehicle_number: "",
    budget: "",
    insurance_type: "third_party",
    extra_notes: "",
  });

  // Fetch Existing Data For Edit Mode
  useEffect(() => {
    if (!id) return;

    const fetchInsuranceDetails = async () => {
      setFetching(true);
      try {
        const res = await axios.get(`${API_URL_APP}/api/v1/insurance/my/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = res.data?.data;
        setFormData({
          full_name: data.full_name,
          contact_number: data.contact_number,
          vehicle_number: data.vehicle_number,
          budget: String(data.budget),
          insurance_type: data.insurance_type || "third_party",
          extra_notes: data.extra_notes || "",
        });
      } catch (error) {
        console.log("Fetch Edit Insurance Error:", error);
        showAlert("error", "Failed", "Unable to load insurance details.");
      }
      setFetching(false);
    };

    fetchInsuranceDetails();
  }, [id]);

  // Autofill for create mode
  useEffect(() => {
    if (id) return;

    if (driver?.driver_name) {
      setFormData((prev) => ({ ...prev, full_name: driver.driver_name }));
    }

    if (driver?.driver_contact_number) {
      setFormData((prev) => ({
        ...prev,
        contact_number: driver.driver_contact_number,
      }));
    }

    if (driver?.current_vehicle_id?.vehicle_number) {
      setFormData((prev) => ({
        ...prev,
        vehicle_number: driver.current_vehicle_id.vehicle_number,
      }));
    }
  }, [driver]);

  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const showAlert = (type, title, message) => {
    setAlertData({ visible: true, type, title, message });
  };

  const submitInsurance = async () => {
    if (
      !formData.full_name ||
      !formData.contact_number ||
      !formData.vehicle_number ||
      !formData.budget
    ) {
      return showAlert(
        "error",
        "Missing Fields",
        "Please fill all required fields."
      );
    }

    setLoading(true);

    try {
      if (id) {
        await axios.put(
          `${API_URL_APP}/api/v1/insurance/${id}`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        showAlert(
          "success",
          "Updated Successfully",
          "Your insurance request has been updated."
        );
      } else {
        await axios.post(`${API_URL_APP}/api/v1/insurance`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });

        showAlert(
          "success",
          "Submitted Successfully",
          "Your insurance request has been created."
        );
      }
    } catch (error) {
      console.log("Insurance Submit Error:", error);

      showAlert(
        "error",
        "Submission Failed",
        error?.response?.data?.message || "Failed to submit insurance request."
      );
    }

    setLoading(false);
  };

  const getInsuranceTypeLabel = (value) => {
    const labels = {
      third_party: "Third Party",
      comprehensive: "Comprehensive",
      zero_dep: "Zero Depreciation",
      unknown: "Unknown",
    };
    return labels[value] || value;
  };

  if (fetching) {
    return (
      <SafeAreaView style={styles.container}>
        <BackWithLogo />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1565C0" />
          <Text style={styles.loadingText}>Loading details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <BackWithLogo />

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Text style={styles.iconText}>🛡️</Text>
          </View>
          <Text style={styles.title}>
            {id ? "Edit Insurance Request" : "Apply for Insurance"}
          </Text>
          <Text style={styles.subtitle}>
            {id 
              ? "Update your insurance request details" 
              : "Fill in the details to get your insurance quote"}
          </Text>
        </View>

        {/* Form Card */}
        <View style={styles.formCard}>
          {/* Personal Information Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Full Name <Text style={styles.required}>*</Text>
              </Text>
              <View style={[
                styles.inputWrapper,
                focusedField === 'full_name' && styles.inputWrapperFocused
              ]}>
                <Text style={styles.inputIcon}>👤</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your full name"
                  placeholderTextColor="#999"
                  value={formData.full_name}
                  onChangeText={(t) => handleChange("full_name", t)}
                  onFocus={() => setFocusedField('full_name')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Contact Number <Text style={styles.required}>*</Text>
              </Text>
              <View style={[
                styles.inputWrapper,
                focusedField === 'contact_number' && styles.inputWrapperFocused
              ]}>
                <Text style={styles.inputIcon}>📱</Text>
                <TextInput
                  style={styles.input}
                  placeholder="10-digit mobile number"
                  placeholderTextColor="#999"
                  maxLength={10}
                  keyboardType="number-pad"
                  value={formData.contact_number}
                  onChangeText={(t) => handleChange("contact_number", t)}
                  onFocus={() => setFocusedField('contact_number')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>
          </View>

          {/* Vehicle Information Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Vehicle Information</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Vehicle Number <Text style={styles.required}>*</Text>
              </Text>
              <View style={[
                styles.inputWrapper,
                focusedField === 'vehicle_number' && styles.inputWrapperFocused
              ]}>
                <Text style={styles.inputIcon}>🚗</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., DL 01 AB 1234"
                  placeholderTextColor="#999"
                  autoCapitalize="characters"
                  value={formData.vehicle_number}
                  onChangeText={(t) => handleChange("vehicle_number", t)}
                  onFocus={() => setFocusedField('vehicle_number')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>
          </View>

          {/* Insurance Details Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Insurance Details</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Budget (₹) <Text style={styles.required}>*</Text>
              </Text>
              <View style={[
                styles.inputWrapper,
                focusedField === 'budget' && styles.inputWrapperFocused
              ]}>
                <Text style={styles.inputIcon}>💰</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your budget"
                  placeholderTextColor="#999"
                  keyboardType="number-pad"
                  value={formData.budget}
                  onChangeText={(t) => handleChange("budget", t)}
                  onFocus={() => setFocusedField('budget')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Insurance Type <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.pickerWrapper}>
                <Text style={styles.inputIcon}>📋</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={formData.insurance_type}
                    onValueChange={(value) => handleChange("insurance_type", value)}
                    style={styles.picker}
                  >
                    <Picker.Item label="Third Party" value="third_party" />
                    <Picker.Item label="Comprehensive" value="comprehensive" />
                    <Picker.Item label="Zero Depreciation" value="zero_dep" />
                    <Picker.Item label="Unknown" value="unknown" />
                  </Picker>
                </View>
              </View>
              
              {/* Insurance Type Info Cards */}
              <View style={styles.insuranceTypeInfo}>
                {formData.insurance_type === 'third_party' && (
                  <View style={styles.infoCard}>
                    <Text style={styles.infoCardText}>
                      💡 Covers third-party liabilities only
                    </Text>
                  </View>
                )}
                {formData.insurance_type === 'comprehensive' && (
                  <View style={styles.infoCard}>
                    <Text style={styles.infoCardText}>
                      💡 Covers both third-party and own damage
                    </Text>
                  </View>
                )}
                {formData.insurance_type === 'zero_dep' && (
                  <View style={styles.infoCard}>
                    <Text style={styles.infoCardText}>
                      💡 Full claim without depreciation deduction
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Extra Notes (Optional)</Text>
              <View style={[
                styles.inputWrapper,
                styles.textAreaWrapper,
                focusedField === 'extra_notes' && styles.inputWrapperFocused
              ]}>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Any additional information..."
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  value={formData.extra_notes}
                  onChangeText={(t) => handleChange("extra_notes", t)}
                  onFocus={() => setFocusedField('extra_notes')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={submitInsurance}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Text style={styles.submitButtonText}>
                {id ? "Update Request" : "Submit Request"}
              </Text>
              <Text style={styles.submitButtonIcon}>→</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            🔒 Your information is secure and encrypted
          </Text>
        </View>
      </ScrollView>

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
    backgroundColor: "#F5F7FA",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },

  // Header
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#E3F2FD",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  iconText: {
    fontSize: 36,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1A1A1A",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    paddingHorizontal: 20,
    lineHeight: 22,
  },

  // Form Card
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 20,
  },

  // Section
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: "#1565C0",
  },

  // Input Group
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  required: {
    color: "#E53935",
    fontSize: 16,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderWidth: 2,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    paddingHorizontal: 16,
    minHeight: 56,
  },
  inputWrapperFocused: {
    borderColor: "#1565C0",
    backgroundColor: "#FFFFFF",
  },
  inputIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#1A1A1A",
    padding: 0,
  },
  textAreaWrapper: {
    alignItems: "flex-start",
    paddingTop: 16,
    paddingBottom: 16,
    minHeight: 120,
  },
  textArea: {
    minHeight: 88,
    textAlignVertical: "top",
  },

  // Picker
  pickerWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderWidth: 2,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    paddingLeft: 16,
    minHeight: 56,
  },
  pickerContainer: {
    flex: 1,
  },
  picker: {
    marginLeft: -8,
  },

  // Insurance Type Info
  insuranceTypeInfo: {
    marginTop: 8,
  },
  infoCard: {
    backgroundColor: "#E8F5E9",
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#4CAF50",
  },
  infoCardText: {
    fontSize: 13,
    color: "#2E7D32",
    fontWeight: "500",
  },

  // Submit Button
  submitButton: {
    backgroundColor: "#1565C0",
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 32,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1565C0",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 16,
  },
  submitButtonDisabled: {
    backgroundColor: "#B0BEC5",
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    marginRight: 8,
  },
  submitButtonIcon: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
  },

  // Footer
  footer: {
    alignItems: "center",
    paddingVertical: 12,
  },
  footerText: {
    fontSize: 13,
    color: "#666",
    fontWeight: "500",
  },
});