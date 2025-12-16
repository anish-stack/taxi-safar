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
  Alert,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useNavigation, useRoute } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

import BackWithLogo from "../common/back_with_logo";
import Layout from "../common/layout";
import loginStore from "../../store/auth.store";
import useDriverStore from "../../store/driver.store";
import axios from "axios";
import { API_URL_APP } from "../../constant/api";

// Constants
const JOB_TYPES = [
  { label: "Full Time", value: "full_time" },
  { label: "Part Time", value: "part_time" },
  { label: "Contract", value: "contract" },
];

const DRIVER_CATEGORIES = [
  { label: "Car Driver", value: "car_driver" },
  { label: "Truck Driver", value: "truck_driver" },
  { label: "Bike/Courier", value: "bike_driver" },
  { label: "Bus Driver", value: "bus_driver" },
  { label: "Mini Bus Driver", value: "mini_bus_driver" },
  { label: "Others", value: "other" },

];

export default function DriverJobCreateAndEdit() {
  const navigation = useNavigation();
  const route = useRoute();
  const jobId = route.params?.jobId || null;
  const isEditMode = !!jobId;

  const { token } = loginStore();
  const { driver } = useDriverStore();

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEditMode);

  const [form, setForm] = useState({
    title: "",
    description: "",
    company_name: "",
    salary_min: "",
    salary_max: "",
    job_type: "full_time",
    driver_category: "car_driver",
    address: "",
    valid_till: null,
  });

  const [showDatePicker, setShowDatePicker] = useState(false);

  // Fetch job in edit mode
  useEffect(() => {
    if (isEditMode) fetchJobDetails();
  }, [jobId]);

  const fetchJobDetails = async () => {
    try {
      setFetching(true);
      const { data } = await axios.get(
        `${API_URL_APP}/api/v1/driver-jobs/${jobId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const job = data.data;
      setForm({
        title: job.title || "",
        description: job.description || "",
        company_name: job.company?.name || "",
        salary_min: job.salary?.min ? String(job.salary.min) : "",
        salary_max: job.salary?.max ? String(job.salary.max) : "",
        job_type: job.job_type || "full_time",
        driver_category: job.driver_category || "car_driver",
        address: job.location?.address || "",
        valid_till: job.valid_till ? new Date(job.valid_till) : null,
      });
    } catch (error) {
      Alert.alert("Error", "Failed to load job details");
      navigation.goBack();
    } finally {
      setFetching(false);
    }
  };

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setForm((prev) => ({ ...prev, valid_till: selectedDate }));
    }
  };

  const validateForm = () => {
    if (!form.title.trim()) return "Job title is required";
    if (!form.description.trim()) return "Job description is required";
    if (!form.company_name.trim()) return "Company name is required";
    if (!form.address.trim()) return "Work address is required";
    if (
      !form.salary_min ||
      isNaN(form.salary_min) ||
      Number(form.salary_min) < 0
    )
      return "Valid minimum salary is required";
    if (
      form.salary_max &&
      (isNaN(form.salary_max) ||
        Number(form.salary_max) < Number(form.salary_min))
    )
      return "Max salary must be ≥ min salary";
    if (!form.valid_till) return "Please select a valid until date";
    if (form.valid_till <= new Date())
      return "Valid until date must be in the future";

    return null;
  };

  const handleSubmit = async () => {
    const error = validateForm();
    if (error) {
      Alert.alert("Validation Error", error);
      return;
    }

    if (!driver?._id) {
      Alert.alert("Error", "Driver information missing. Please login again.");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        company: { name: form.company_name.trim() },
        salary: {
          min: Number(form.salary_min),
          max: form.salary_max ? Number(form.salary_max) : null,
        },
        job_type: form.job_type,
        driver_category: form.driver_category,
        location: { address: form.address.trim() },
        skills: ["Communication", "Teamwork", "Problem Solving"],
        valid_till: form.valid_till.toISOString().split("T")[0],
        driverId: driver._id,
      };

      if (isEditMode) {
        await axios.put(`${API_URL_APP}/api/v1/driver-jobs/${jobId}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.post(`${API_URL_APP}/api/v1/driver-jobs`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      Alert.alert(
        "Success",
        `Job ${isEditMode ? "updated" : "posted"} successfully!`,
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      const data = err.response?.data;

      // 1️⃣ Prefer field-level error
      const fieldError = data?.errors && Object.values(data.errors)[0];

      // 2️⃣ Fallback to general message
      const msg = fieldError || data?.message || "Something went wrong";

      Alert.alert("Failed", msg);
    } finally {
      setLoading(false);
    }
  };

  const PickerItem = ({ label, selected, onPress }) => (
    <TouchableOpacity
      style={[styles.pickerItem, selected && styles.pickerItemSelected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.pickerText, selected && styles.pickerTextSelected]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  if (fetching) {
    return (
      <Layout showHeader={false}>
        <BackWithLogo title="Loading..." />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#EF4444" />
        </View>
      </Layout>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <BackWithLogo title={isEditMode ? "Edit Job" : "Post New Job"} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.container}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* Job Title */}
          <Text style={styles.label}>Job Title</Text>
          <TextInput
            style={styles.input}
            value={form.title}
            onChangeText={(t) => updateField("title", t)}
            placeholderTextColor="#9CA3AF"
          />

          {/* Description */}
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={form.description}
            onChangeText={(t) => updateField("description", t)}
            multiline
            placeholderTextColor="#9CA3AF"
          />

          {/* Company Name */}
          <Text style={styles.label}>Company Name</Text>
          <TextInput
            style={styles.input}
            value={form.company_name}
            onChangeText={(t) => updateField("company_name", t)}
            placeholderTextColor="#9CA3AF"
          />

          {/* Salary Range */}
          <Text style={styles.label}>Salary Range</Text>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.halfInput]}
              keyboardType="numeric"
              placeholder="Min (₹)"
              placeholderTextColor="#9CA3AF"
              value={form.salary_min}
              onChangeText={(t) =>
                updateField("salary_min", t.replace(/[^0-9]/g, ""))
              }
            />
            <Text style={styles.dash}>–</Text>
            <TextInput
              style={[styles.input, styles.halfInput]}
              keyboardType="numeric"
              placeholder="Max (₹)"
              placeholderTextColor="#9CA3AF"
              value={form.salary_max}
              onChangeText={(t) =>
                updateField("salary_max", t.replace(/[^0-9]/g, ""))
              }
            />
          </View>

          {/* Job Type */}
          <Text style={styles.label}>Job Type</Text>
          <View style={styles.pickerContainer}>
            {JOB_TYPES.map((item) => (
              <PickerItem
                key={item.value}
                label={item.label}
                selected={form.job_type === item.value}
                onPress={() => updateField("job_type", item.value)}
              />
            ))}
          </View>

          {/* Driver Category */}
          <Text style={styles.label}>Driver Category</Text>
          <View style={styles.pickerContainer}>
            {DRIVER_CATEGORIES.map((item) => (
              <PickerItem
                key={item.value}
                label={item.label}
                selected={form.driver_category === item.value}
                onPress={() => updateField("driver_category", item.value)}
              />
            ))}
          </View>

          {/* Address */}
          <Text style={styles.label}>Work Location</Text>
          <TextInput
            style={styles.input}
            value={form.address}
            onChangeText={(t) => updateField("address", t)}
            placeholder="e.g. Delhi, Mumbai"
            placeholderTextColor="#9CA3AF"
          />

          {/* Valid Till Date */}
          <Text style={styles.label}>Driver Job Post Expiry Date</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.dateText,
                !form.valid_till && { color: "#9CA3AF" },
              ]}
            >
              {form.valid_till
                ? form.valid_till.toLocaleDateString("en-IN")
                : "Tap to select date"}
            </Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={form.valid_till || new Date()}
              mode="date"
              minimumDate={new Date()}
              onChange={onDateChange}
            />
          )}

          {/* Submit */}
          <TouchableOpacity
            style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.saveBtnText}>
                {isEditMode ? "Update Job" : "Post Job"}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginTop: 8,
    backgroundColor: "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  label: {
    marginTop: 14,
    marginBottom: 6,
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "SFProDisplay-Bold",
    color: "#1F2937",
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: "SFProDisplay-Regular",
    backgroundColor: "#fff",
    color: "#111827",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  halfInput: {
    flex: 1,
  },
  dash: {
    fontSize: 18,
    color: "#6B7280",
    fontFamily: "SFProDisplay-Medium",
  },
  pickerContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 6,
  },
  pickerItem: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1F2937",
    backgroundColor: "#fff",
  },
  pickerItemSelected: {
    backgroundColor: "#1F2937",
    borderColor: "#1F2937",
  },
  pickerText: {
    fontSize: 13,
    fontFamily: "SFProDisplay-Medium",
    color: "#1F2937",
  },
  pickerTextSelected: {
    color: "#fff",
    fontFamily: "SFProDisplay-Semibold",
  },
  dateButton: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#fff",
  },
  dateText: {
    fontSize: 14,
    fontFamily: "SFProDisplay-Regular",
    color: "#111827",
  },
  saveBtn: {
    backgroundColor: "#EF4444",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 24,
    elevation: 0.5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  saveBtnDisabled: {
    backgroundColor: "#9CA3AF",
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "SFProDisplay-Bold",
  },
});
