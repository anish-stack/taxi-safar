// screens/CreateBorderTax.js
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
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

  // Load driver
  useEffect(() => {
    fetchDriverDetails();
  }, []);

  // Prefill vehicle
  useEffect(() => {
    if (driver?.current_vehicle_id?.vehicle_number) {
      setVehicleNumber(driver.current_vehicle_id.vehicle_number);
    }
  }, [driver]);

  // Load existing for edit
  useEffect(() => {
    if (editId) loadExisting();
  }, [editId]);

  const loadExisting = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL_APP}/api/v1/border-tax/${editId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const d = res.data.data;

      setVehicleNumber(d.vehicle_number || "");
      setBorderState(d.border_state || "");
      setTripDuration(d.trip_type === "one_way" ? "one_day" : "many_days");
      if (d.start_date) setStartDate(new Date(d.start_date));
      if (d.end_date) setEndDate(new Date(d.end_date));
    } catch (error) {
      showAlert("error", "Error", "Unable to load details.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!vehicleNumber.trim() || !borderState.trim()) {
      return showAlert("error", "Required", "Vehicle number and border state are required.");
    }

    if (tripDuration === "many_days" && startDate >= endDate) {
      return showAlert("error", "Invalid", "End date must be after start date.");
    }

    const payload = {
      vehicle_number: vehicleNumber.trim(),
      border_state: borderState.trim(),
      trip_type: tripDuration === "one_day" ? "one_way" : "round_trip",
      start_date: startDate.toISOString(),
      end_date: tripDuration === "one_day" ? startDate.toISOString() : endDate.toISOString(),
    };

    try {
      setLoading(true);
      if (editId) {
        await axios.put(`${API_URL_APP}/api/v1/border-tax/${editId}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        showAlert("success", "Updated", "Border tax updated successfully");
      } else {
        await axios.post(`${API_URL_APP}/api/v1/border-tax`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        showAlert("success", "Created", "Border tax request submitted");
      }
      setTimeout(() => navigation.goBack(), 1000);
    } catch (error) {
      showAlert("error", "Failed", error.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <BackWithLogo title={editId ? "Edit Border Tax" : "Post Border Tax"} />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.form}>
          {/* Vehicle Number */}
          <View style={styles.field}>
            <Text style={styles.label}>Vehicle Number </Text>
            <View style={styles.input}>
              <Ionicons name="car-outline" size={20} color="#000" />
              <TextInput
                style={styles.textInput}
                placeholder="e.g. DL01AB1234"
                placeholderTextColor="#aaa"
                value={vehicleNumber}
                onChangeText={setVehicleNumber}
                autoCapitalize="characters"
              />
            </View>
          </View>

          {/* Border State */}
          <View style={styles.field}>
            <Text style={styles.label}>Border State </Text>
            <View style={styles.input}>
              <Ionicons name="location-outline" size={20} color="#000" />
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Maharashtra"
                placeholderTextColor="#aaa"
                value={borderState}
                onChangeText={setBorderState}
              />
            </View>
          </View>

          {/* Trip Duration Tabs */}
          <View style={styles.field}>
            <Text style={styles.label}>Trip Duration</Text>
            <View style={styles.tabs}>
              <TouchableOpacity
                style={[styles.tab, tripDuration === "one_day" && styles.tabActive]}
                onPress={() => setTripDuration("one_day")}
              >
                <Text style={[styles.tabText, tripDuration === "one_day" && styles.tabTextActive]}>
                  One Day
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, tripDuration === "many_days" && styles.tabActive]}
                onPress={() => setTripDuration("many_days")}
              >
                <Text style={[styles.tabText, tripDuration === "many_days" && styles.tabTextActive]}>
                  Many Days
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Start Date */}
          <View style={styles.field}>
            <Text style={styles.label}>Start Date</Text>
            <TouchableOpacity style={styles.dateBtn} onPress={() => setShowStartPicker(true)}>
              <Ionicons name="calendar-outline" size={20} color="#fff" />
              <Text style={styles.dateText}>
                {startDate.toLocaleDateString("en-IN")}
              </Text>
            </TouchableOpacity>
          </View>

          {/* End Date (Many Days) */}
          {tripDuration === "many_days" && (
            <View style={styles.field}>
              <Text style={styles.label}>End Date</Text>
              <TouchableOpacity style={styles.dateBtn} onPress={() => setShowEndPicker(true)}>
                <Ionicons name="calendar-outline" size={20} color="#fff" />
                <Text style={styles.dateText}>
                  {endDate.toLocaleDateString("en-IN")}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.submitText}>
                {editId ? "Update" : "Submit"} Request
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Date Pickers */}
      {showStartPicker && (
        <DateTimePicker
          value={startDate}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(e, date) => {
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
          onChange={(e, date) => {
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    padding: 20,
  },

  form: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#eee",
  },

  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
    marginBottom: 8,
    fontFamily: "SFProDisplay-Medium",
  },

  input: {
    flexDirection: "row",
    alignItems: "center",
    // backgroundColor: "#000",
    borderRadius: 22,
    borderWidth:0.4,

    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  textInput: {
    flex: 1,
    color: "#000",
    fontSize: 15,
    marginLeft: 12,
    fontFamily: "SFProDisplay-Regular",
  },

  tabs: {
    flexDirection: "row",
    backgroundColor: "#f0f0f0",
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  tabActive: {
    backgroundColor: "#000",
  },
  tabText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "600",
  },
  tabTextActive: {
    color: "#fff",
  },

  dateBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderColor:"#f0f0f0",
    borderWidth:1,
    // backgroundColor: "#000",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  dateText: {
    color: "#000",
    fontSize: 15,
    marginLeft: 12,
    fontWeight: "500",
  },

  submitBtn: {
    backgroundColor: "#000",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  submitDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});