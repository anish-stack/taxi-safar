import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import axios from "axios";
import { UniversalAlert } from "../common/UniversalAlert";
import BackWithLogo from "../common/back_with_logo";
import loginStore from "../../store/auth.store";
import { API_URL_APP } from "../../constant/api";
import useDriverStore from "../../store/driver.store";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CreateBorderTax({ route, navigation }) {
  const editId = route?.params?.id || null;
  const { token } = loginStore();
  const { driver, fetchDriverDetails } = useDriverStore();

  // Form States
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [borderState, setBorderState] = useState("");

  const [tripDuration, setTripDuration] = useState("one_day"); // one_day | many_days
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());

  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const [loading, setLoading] = useState(false);

  // Alert
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    type: "",
    title: "",
    message: "",
  });

  const showAlert = (type, title, message) => {
    setAlertConfig({ type, title, message });
    setAlertVisible(true);
  };

  // Load driver on mount
  useEffect(() => {
    fetchDriverDetails();
  }, []);

  // Prefill vehicle from driver
  useEffect(() => {
    if (driver?.current_vehicle_id?.vehicle_number) {
      setVehicleNumber(driver.current_vehicle_id.vehicle_number);
    }
  }, [driver]);

  // Load existing record for editing
  useEffect(() => {
    if (editId) loadExisting();
  }, [editId]);

  const loadExisting = async () => {
    try {
      setLoading(true);
      const res = await axios.get(
        `${API_URL_APP}/api/v1/border-tax/${editId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const d = res.data.data;

      setVehicleNumber(d.vehicle_number);
      setBorderState(d.border_state);

      setTripDuration(d.trip_type === "one_way" ? "one_day" : "many_days");

      if (d.start_date) setStartDate(new Date(d.start_date));
      if (d.end_date) setEndDate(new Date(d.end_date));

      setLoading(false);
    } catch (error) {
      console.log(error.response.data);
      setLoading(false);
      showAlert("error", "Error", "Unable to load details.");
    }
  };

  // Submit Form
  const handleSubmit = async () => {
    if (!vehicleNumber.trim() || !borderState.trim()) {
      return showAlert(
        "error",
        "Missing Fields",
        "Vehicle number and border state are required."
      );
    }

    if (tripDuration === "many_days" && startDate >= endDate) {
      return showAlert(
        "error",
        "Invalid Dates",
        "End date must be after start date."
      );
    }

    const formData = new FormData();
    formData.append("vehicle_number", vehicleNumber);
    formData.append("border_state", borderState);
    formData.append("start_date", startDate.toISOString());

    if (tripDuration === "one_day") {
      formData.append("trip_type", "one_way");
      formData.append("end_date", startDate.toISOString());
    } else {
      formData.append("trip_type", "round_trip");
      formData.append("end_date", endDate.toISOString());
    }

    try {
      setLoading(true);

      let res;

      if (editId) {
        res = await axios.put(
          `${API_URL_APP}/api/v1/border-tax/${editId}`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "multipart/form-data",
            },
          }
        );
      } else {
        res = await axios.post(`${API_URL_APP}/api/v1/border-tax`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        });
      }

      showAlert(
        "success",
        "Success",
        editId ? "Record Updated!" : "Border Tax Created!"
      );

      setTimeout(() => navigation.goBack(), 900);
    } catch (error) {
      showAlert(
        "error",
        "Error",
        error.response?.data?.message || "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <BackWithLogo title={editId ? "Edit Border Tax" : "Add Border Tax"} />

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          {/* VEHICLE NUMBER (Editable) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Vehicle Number *</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="car" size={20} color="#EF4444" />
              <TextInput
                style={styles.input}
                placeholder="Enter Vehicle Number"
                value={vehicleNumber}
                onChangeText={setVehicleNumber}
              />
            </View>
          </View>

          {/* BORDER STATE */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Border State *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Maharashtra, Gujarat"
              value={borderState}
              onChangeText={setBorderState}
            />
          </View>

          {/* TRIP DURATION */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Trip Duration</Text>
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[
                  styles.tab,
                  tripDuration === "one_day" && styles.tabActive,
                ]}
                onPress={() => setTripDuration("one_day")}
              >
                <Text
                  style={[
                    styles.tabText,
                    tripDuration === "one_day" && styles.tabTextActive,
                  ]}
                >
                  One Day
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tab,
                  tripDuration === "many_days" && styles.tabActive,
                ]}
                onPress={() => setTripDuration("many_days")}
              >
                <Text
                  style={[
                    styles.tabText,
                    tripDuration === "many_days" && styles.tabTextActive,
                  ]}
                >
                  Many Days
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* START DATE */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Start Date</Text>

            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowStartPicker(true)}
            >
              <Ionicons name="calendar" size={20} color="#EF4444" />
              <Text style={styles.dateText}>
                {startDate.toLocaleDateString("en-IN")}
              </Text>
            </TouchableOpacity>
          </View>

          {/* END DATE (only for many days trip) */}
          {tripDuration === "many_days" && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>End Date</Text>

              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowEndPicker(true)}
              >
                <Ionicons name="calendar" size={20} color="#EF4444" />
                <Text style={styles.dateText}>
                  {endDate.toLocaleDateString("en-IN")}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* SUBMIT */}
          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.submitText}>
                {editId ? "Update Border Tax" : "Create Border Tax"}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* DATE PICKERS */}
        {showStartPicker && (
          <DateTimePicker
            value={startDate}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={(event, date) => {
              setShowStartPicker(false);
              if (date) setStartDate(date);
            }}
          />
        )}

        {showEndPicker && (
          <DateTimePicker
            value={endDate}
            minimumDate={startDate}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={(event, date) => {
              setShowEndPicker(false);
              if (date) setEndDate(date);
            }}
          />
        )}

        <UniversalAlert
          visible={alertVisible}
          setVisible={setAlertVisible}
          {...alertConfig}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: "#f8fafc", flex: 1 },
  card: {
    backgroundColor: "#fff",
    margin: 16,
    borderRadius: 20,
    padding: 20,
  },
  inputGroup: { marginBottom: 20 },
  label: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },

  inputWrapper: {
    backgroundColor: "#fef2f2",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fecaca",
  },

  input: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    fontSize: 16,
  },

  textInput: {
    backgroundColor: "#f9fafb",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    fontSize: 16,
  },

  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    padding: 6,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  tabActive: { backgroundColor: "#EF4444" },
  tabText: { fontSize: 15, fontWeight: "600", color: "#64748b" },
  tabTextActive: { color: "#fff" },

  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef2f2",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fca5a5",
  },

  dateText: {
    marginLeft: 10,
    fontSize: 16,
    color: "#991b1b",
    fontWeight: "600",
  },

  submitBtn: {
    backgroundColor: "#EF4444",
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 20,
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
});
