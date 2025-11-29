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
    skills: "",
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
      const { data } = await axios.get(`${API_URL_APP}/api/v1/driver-jobs/${jobId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

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
        skills: job.skills?.join(", ") || "",
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
    if (!form.salary_min || isNaN(form.salary_min) || Number(form.salary_min) < 0)
      return "Valid minimum salary is required";
    if (form.salary_max && (isNaN(form.salary_max) || Number(form.salary_max) < Number(form.salary_min)))
      return "Max salary must be ≥ min salary";
    if (!form.valid_till) return "Please select a valid until date";
    if (form.valid_till <= new Date()) return "Valid until date must be in the future";

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
        skills: form.skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        valid_till: form.valid_till.toISOString().split("T")[0], // YYYY-MM-DD
        driverId: driver._id, // CRITICAL: Send driver ID!
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

      Alert.alert("Success", `Job ${isEditMode ? "updated" : "posted"} successfully!`, [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      const msg = err.response?.data?.message || "Something went wrong";
      Alert.alert("Failed", msg);
    } finally {
      setLoading(false);
    }
  };

  const PickerItem = ({ label, selected, onPress }) => (
    <TouchableOpacity
      style={[styles.pickerItem, selected && styles.pickerItemSelected]}
      onPress={onPress}
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
          contentContainerStyle={{ paddingBottom: 50 }}
        >
          {/* Job Title */}
          <Text style={styles.label}>Job Title *</Text>
          <TextInput
            style={styles.input}
            value={form.title}
            onChangeText={(t) => updateField("title", t)}
            placeholder="e.g. Full-Time Car Driver in Mumbai"
          />

          {/* Description */}
          <Text style={styles.label}>Description *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={form.description}
            onChangeText={(t) => updateField("description", t)}
            multiline
            placeholder="Job duties, requirements, benefits..."
          />

          {/* Company Name */}
          <Text style={styles.label}>Company Name *</Text>
          <TextInput
            style={styles.input}
            value={form.company_name}
            onChangeText={(t) => updateField("company_name", t)}
            placeholder="ABC Transport Ltd"
          />

          {/* Salary Range */}
          <Text style={styles.label}>Salary Range *</Text>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.halfInput]}
              keyboardType="numeric"
              placeholder="Min (e.g. 25000)"
              value={form.salary_min}
              onChangeText={(t) => updateField("salary_min", t.replace(/[^0-9]/g, ""))}
            />
            <Text style={styles.dash}>–</Text>
            <TextInput
              style={[styles.input, styles.halfInput]}
              keyboardType="numeric"
              placeholder="Max (optional)"
              value={form.salary_max}
              onChangeText={(t) => updateField("salary_max", t.replace(/[^0-9]/g, ""))}
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
          <Text style={styles.label}>Work Location *</Text>
          <TextInput
            style={styles.input}
            value={form.address}
            onChangeText={(t) => updateField("address", t)}
            placeholder="e.g. Andheri East, Mumbai"
          />

          {/* Skills */}
          <Text style={styles.label}>Skills (comma separated)</Text>
          <TextInput
            style={styles.input}
            value={form.skills}
            onChangeText={(t) => updateField("skills", t)}
            placeholder="Valid DL, Night shift, English..."
          />

          {/* Valid Till Date */}
          <Text style={styles.label}>Valid Until *</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.dateText}>
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
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
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
    paddingHorizontal: 20,
    marginTop: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  label: {
    marginTop: 18,
    marginBottom: 6,
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    backgroundColor: "#fff",
  },
  textArea: {
    height: 120,
    textAlignVertical: "top",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  halfInput: {
    flex: 1,
  },
  dash: {
    fontSize: 20,
    color: "#666",
  },
  pickerContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 8,
  },
  pickerItem: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#f9f9f9",
  },
  pickerItemSelected: {
    backgroundColor: "#EF4444",
    borderColor: "#EF4444",
  },
  pickerText: {
    fontSize: 14,
    color: "#333",
  },
  pickerTextSelected: {
    color: "#fff",
    fontWeight: "600",
  },
  saveBtn: {
    backgroundColor: "#EF4444",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 30,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  saveBtnDisabled: {
    backgroundColor: "#999",
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
});