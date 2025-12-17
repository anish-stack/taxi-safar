import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Switch,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Animated,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Layout from "../common/layout";
import BackWithLogo from "../common/back_with_logo";
import loginStore from "../../store/auth.store";
import { API_URL_APP } from "../../constant/api";
import axios from "axios";

const vehicleTypes = [
  { key: "accept_mini_rides", label: "Mini", icon: "car-hatchback" },
  { key: "accept_sedan_rides", label: "Sedan", icon: "car-side" },
  { key: "accept_suv_rides", label: "SUV", icon: "car-estate" },
];

const Preferences = () => {
  const { token } = loginStore();
  const [preferences, setPreferences] = useState({});
  const [vehicleCategory, setVehicleCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatingKey, setUpdatingKey] = useState(null);
  const [message, setMessage] = useState(null); // { type: 'success' | 'error', text: '' }
  const fadeAnim = useState(new Animated.Value(0))[0];

  const showMessage = (type, text) => {
    setMessage({ type, text });
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(3000),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => setMessage(null));
  };

  const fetchPreferences = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL_APP}/api/v1/get-prefrences`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.success) {
        setPreferences(res.data.data.preferences || {});
        setVehicleCategory(res.data.data.vehicle_category || "");
      } else {
        showMessage("error", res.data.message || "Unable to load preferences");
      }
    } catch (error) {
      showMessage(
        "error",
        error.response?.data?.message || "Failed to load preferences"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPreferences();
  }, [token]);

  const updatePreference = async (key, value) => {
    try {
      setUpdatingKey(key);
      const res = await axios.put(
        `${API_URL_APP}/api/v1/update-prefrences`,
        { [key]: value },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        setPreferences((prev) => ({ ...prev, [key]: value }));
        showMessage(
          "success",
          `${vehicleTypes.find((v) => v.key === key)?.label} rides ${
            value ? "enabled" : "disabled"
          }`
        );
      } else {
        showMessage("error", res.data.message || "Update failed");
        // Revert the toggle on failure
        setPreferences((prev) => ({ ...prev, [key]: !value }));
      }
    } catch (error) {
      showMessage(
        "error",
        error.response?.data?.message || "Failed to update preference"
      );
      // Revert the toggle on error
      setPreferences((prev) => ({ ...prev, [key]: !value }));
    } finally {
      setUpdatingKey(null);
    }
  };

  const allowedToggles = () => {
    switch (vehicleCategory.toUpperCase()) {
      case "MINI":
        return ["accept_mini_rides"];
      case "SEDAN":
        return ["accept_mini_rides", "accept_sedan_rides"];
      case "SUV":
        return ["accept_mini_rides", "accept_sedan_rides", "accept_suv_rides"];
      default:
        return ["accept_mini_rides", "accept_sedan_rides", "accept_suv_rides"];
    }
  };

  const renderToggle = (vehicle) => {
    if (!allowedToggles().includes(vehicle.key)) return null;
    const value = preferences[vehicle.key] || false;
    const isUpdating = updatingKey === vehicle.key;

    return (
      <View key={vehicle.key} style={styles.toggleCard}>
        <View style={styles.toggleContent}>
          <View
            style={[
              styles.iconCircle,
              value ? styles.iconCircleActive : styles.iconCircleInactive,
            ]}
          >
            <MaterialCommunityIcons
              name={vehicle.icon}
              size={28}
              color={value ? "green" : "#9CA3AF"}
            />
          </View>

          <View style={styles.toggleInfo}>
            <Text style={styles.toggleLabel}>{vehicle.label}</Text>
            <Text style={styles.toggleDescription}>
              {value ? "Currently accepting" : "Not accepting"} {vehicle.label}{" "}
              rides
            </Text>
          </View>

          <View style={styles.toggleControl}>
            {isUpdating ? (
              <ActivityIndicator size="small" color="green" />
            ) : (
              <Switch
                value={value}
                onValueChange={(v) => updatePreference(vehicle.key, v)}
                disabled={isUpdating}
                trackColor={{ false: "#E5E7EB", true: "green" }}
                thumbColor={value ? "green" : "#9CA3AF"}
              />
            )}
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <Layout showHeader={false}>
        <BackWithLogo isLogo={false} title="Ride Preferences" />
        <View style={styles.loadingContainer}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#DC2626" />
            <Text style={styles.loadingText}>Loading preferences...</Text>
          </View>
        </View>
      </Layout>
    );
  }

  return (
    <Layout showHeader={false}>
      <BackWithLogo isLogo={false} title="Ride Preferences" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
      >
    
        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons
            name="tune-variant"
            size={24}
            color="#1F2937"
          />
          <View style={styles.sectionHeaderText}>
            <Text style={styles.sectionTitle}>Ride Types</Text>
            <Text style={styles.sectionSubtitle}>
              Choose which ride types you want to accept
            </Text>
          </View>
        </View>

        {/* Vehicle Toggles */}
        <View style={styles.vehicleList}>{vehicleTypes.map(renderToggle)}</View>


      </ScrollView>

      {/* Toast Message */}
      {message && (
        <Animated.View
          style={[
            styles.toastContainer,
            { opacity: fadeAnim },
          ]}
        >
          <View
            style={[
              styles.toast,
              message.type === "success"
                ? styles.toastSuccess
                : styles.toastError,
            ]}
          >
            <MaterialCommunityIcons
              name={
                message.type === "success"
                  ? "check-circle"
                  : "alert-circle"
              }
              size={22}
              color="#FFFFFF"
            />
            <Text style={styles.toastText}>{message.text}</Text>
          </View>
        </Animated.View>
      )}
    </Layout>
  );
};

export default Preferences;

const styles = StyleSheet.create({
  container: {
    flex: 1,
        paddingBottom: 40,

    backgroundColor: "#F9FAFB",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    padding: 20,
  },
  loadingCard: {
    backgroundColor: "#FFFFFF",
    padding: 40,
    borderRadius: 20,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: "#6B7280",
    fontWeight: "500",
  },

  // Category Card
  categoryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
  },
  categoryValue: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1F2937",
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  categoryDescription: {
    fontSize: 13,
    color: "#9CA3AF",
    lineHeight: 18,
  },

  // Section Header
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
    gap: 12,
  },
  sectionHeaderText: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
  },

  // Vehicle List
  vehicleList: {
    gap: 12,
    marginBottom: 20,
  },

  // Toggle Card
  toggleCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  toggleContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
  },
  iconCircleActive: {
    backgroundColor: "#D3EBDC",
    borderColor: "green",
  },
  iconCircleInactive: {
    backgroundColor: "#F9FAFB",
    borderColor: "#E5E7EB",
  },
  toggleInfo: {
    flex: 1,
    gap: 4,
  },
  toggleLabel: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1F2937",
  },
  toggleDescription: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
  },
  toggleControl: {
    width: 60,
    alignItems: "flex-end",
    justifyContent: "center",
  },

  // Info Card
  infoCard: {
    flexDirection: "row",
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    padding: 16,
    gap: 12,
    alignItems: "flex-start",
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: "#991B1B",
    lineHeight: 20,
  },

  // Toast Message
  toastContainer: {
    position: "absolute",
    top: 80,
    left: 20,
    right: 20,
    alignItems: "center",
    zIndex: 1000,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 12,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    maxWidth: "100%",
  },
  toastSuccess: {
    backgroundColor: "#10B981",
  },
  toastError: {
    backgroundColor: "#EF4444",
  },
  toastText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "600",
    flex: 1,
  },
});