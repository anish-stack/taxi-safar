// src/screens/WaitScreen.js
import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Modal,
  Animated,
  RefreshControl,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../../constant/ui";
import BackWithLogo from "../../common/back_with_logo";
import axios from "axios";
import { API_URL_APP } from "../../../constant/api";
import loginStore from "../../../store/auth.store";
import { SafeAreaView } from "react-native-safe-area-context";

export default function WaitScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { driverId } = route.params || {};
  const { logout } = loginStore();

  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showVerifiedModal, setShowVerifiedModal] = useState(false);

  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const REFRESH_INTERVAL = 20_000; // 20 seconds

  // Auto-refresh every 20 seconds
  useEffect(() => {
    if (!driverId) return;

    const interval = setInterval(() => {
      fetchDriver(true);
    }, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [driverId]);

  // Initial fetch
  useEffect(() => {
    fetchDriver();
  }, [driverId]);

  const fetchDriver = async (isRefresh = false) => {
    if (!driverId) {
      Alert.alert("Error", "Driver ID missing.");
      return;
    }

    try {
      !isRefresh && setLoading(true);
      isRefresh && setRefreshing(true);

      const { data } = await axios.get(`${API_URL_APP}/api/v1/driver-details/${driverId}`);

      if (data.success) {
        setDriver(data.data);

        // Trigger success modal if account is now ACTIVE
        if (data.data.account_status === "active" && !showVerifiedModal) {
          triggerVerifiedModal();
        }
      }
    } catch (error) {
      console.error("Fetch error:", error);
      if (!isRefresh) {
        Alert.alert("Error", error.response?.data?.message || "Failed to load data");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const triggerVerifiedModal = () => {
    setShowVerifiedModal(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Simple bounce + fade animation
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-redirect after 3 seconds
    setTimeout(() => {
      navigation.reset({
        index: 0,
        routes: [{ name: "splash" }],
      });
    }, 3000);
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Sure you want to log out?", [
      { text: "Cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await logout(navigation);
          navigation.reset({ index: 0, routes: [{ name: "Login" }] });
        },
      },
    ]);
  };

  const formatDate = (d) => (d ? new Date(d).toLocaleDateString("en-IN") : "-");

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <BackWithLogo title="Profile Review" />
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Checking your profile...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f9f9f9" }}>
      <BackWithLogo title="Profile Under Review" />
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchDriver(true)} />
        }
      >
        {/* Auto-refresh badge */}
        <View style={styles.refreshBadge}>
          <Ionicons name="sync" size={14} color={Colors.primary} />
          <Text style={styles.refreshText}>Auto-refresh in 20s</Text>
        </View>

        {/* Avatar + Status */}
        <View style={styles.avatarContainer}>
          {driver?.profile_photo?.url ? (
            <Image source={{ uri: driver.profile_photo.url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={50} color="#aaa" />
            </View>
          )}
          <View style={styles.statusBadge(driver?.account_status)}>
            <Text style={styles.statusText}>
              {driver?.account_status?.toUpperCase()}
            </Text>
          </View>
        </View>

        <Text style={styles.name}>{driver?.driver_name || "Driver"}</Text>
        <Text style={styles.phone}>{driver?.driver_contact_number}</Text>

        {/* Personal Info */}
        <Card title="Personal Info">
          <Row label="Email" value={driver?.driver_email} />
          <Row label="Gender" value={driver?.driver_gender} />
          <Row label="DOB" value={formatDate(driver?.driver_dob)} />
          <Row
            label="Aadhaar"
            value={driver?.aadhar_verified ? "Verified" : "Pending"}
            color={driver?.aadhar_verified ? Colors.success : Colors.warning}
          />
        </Card>

 

        {/* Bank */}
        {driver?.BankDetails && (
          <Card title="Bank">
            <Row label="Bank" value={driver.BankDetails.bank_name} />
            <Row label="A/c Holder" value={driver.BankDetails.account_holder_name} />
            <Row label="A/c No." value={driver.BankDetails.account_number} />
            <Row
              label="Verified"
              value={driver.BankDetails.verified ? "Yes" : "No"}
              color={driver.BankDetails.verified ? Colors.success : Colors.warning}
            />
          </Card>
        )}

        {/* Vehicle */}
        {driver?.current_vehicle_id && (
          <Card title="Vehicle">
            <Row label="Number" value={driver.current_vehicle_id.vehicle_number} />
            <Row label="Type" value={driver.current_vehicle_id.vehicle_type?.toUpperCase()} />
            <Row label="Brand" value={driver.current_vehicle_id.vehicle_brand} />
            <Row
              label="RC"
              value={
                driver.current_vehicle_id.registration_certificate?.verified
                  ? "Verified"
                  : "Pending"
              }
              color={
                driver.current_vehicle_id.registration_certificate?.verified
                  ? Colors.success
                  : Colors.warning
              }
            />
          </Card>
        )}

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.refreshBtn} onPress={() => fetchDriver(true)}>
            <Ionicons name="refresh" size={22} color="#fff" />
            <Text style={styles.btnText}>Refresh Now</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={22} color="#fff" />
            <Text style={styles.btnText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>
          We’re reviewing your profile. You’ll get a notification once approved.
        </Text>
      </ScrollView>

      {/* SUCCESS MODAL – Uses GIF only */}
      <Modal transparent visible={showVerifiedModal} onRequestClose={() => {}}>
        <View style={styles.modalOverlay}>
          <Animated.View
            style={[
              styles.modalCard,
              {
                transform: [{ scale: scaleAnim }],
                opacity: opacityAnim,
              },
            ]}
          >
            <Image
              source={require("../../../assets/verified.gif")} // Simple GIF
              style={styles.successGif}
              resizeMode="contain"
            />
            <Text style={styles.modalTitle}>Account Verified!</Text>
            <Text style={styles.modalSubtitle}>
              Welcome aboard! You’re all set.
            </Text>
            <Text style={styles.redirectText}>Redirecting in 3s...</Text>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* ====================== COMPONENTS ====================== */
const Card = ({ title, children }) => (
  <View style={styles.card}>
    <Text style={styles.cardTitle}>{title}</Text>
    <View style={styles.cardContent}>{children}</View>
  </View>
);

const Row = ({ label, value, color }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={[styles.rowValue, color && { color }]}>{value || "-"}</Text>
  </View>
);

const DocRow = ({ label, number, verified, url, uploadedAt, expiry }) => {
  const navigation = useNavigation();
  return (
    <TouchableOpacity
      style={styles.docRow}
      onPress={() =>
        navigation.navigate("DocumentViewer", {
          images: [url],
          title: label,
        })
      }
    >
      <View>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowSub}>#{number}</Text>
        {uploadedAt && (
          <Text style={styles.rowSub}>Uploaded: {formatDate(uploadedAt)}</Text>
        )}
        {expiry && <Text style={styles.rowSub}>Expires: {formatDate(expiry)}</Text>}
      </View>
      <View style={styles.docStatus(verified)}>
        <Text style={styles.docStatusText}>
          {verified ? "Verified" : "Pending"}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#999" />
    </TouchableOpacity>
  );
};

/* ====================== STYLES ====================== */
const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
  },
  loadingText: { marginTop: 12, color: "#666", fontSize: 16 },

  container: { padding: 20, backgroundColor: "#f9f9f9", paddingBottom: 50 },
  refreshBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "#e6f7ff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  refreshText: { fontSize: 12, color: Colors.primary, marginLeft: 6, fontWeight: "600" },

  avatarContainer: { alignItems: "center", marginBottom: 16, position: "relative" },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: "#fff",
    elevation: 5,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#eee",
    justifyContent: "center",
    alignItems: "center",
  },
  statusBadge: (status) => ({
    position: "absolute",
    bottom: 0,
    right: -10,
    backgroundColor:
      status === "active"
        ? Colors.success
        : status === "pending"
        ? Colors.warning
        : Colors.danger,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#fff",
  }),
  statusText: { color: "#fff", fontSize: 11, fontWeight: "bold" },

  name: { fontSize: 24, fontWeight: "bold", textAlign: "center", color: "#222" },
  phone: { fontSize: 16, color: "#666", textAlign: "center", marginBottom: 20 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  cardTitle: { fontSize: 18, fontWeight: "700", color: "#222", marginBottom: 12 },
  cardContent: { gap: 12 },

  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rowLabel: { fontSize: 15, color: "#555" },
  rowValue: { fontSize: 15, color: "#222", fontWeight: "600" },
  rowSub: { fontSize: 12, color: "#999", marginTop: 2 },

  docRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  // docStatus: (verified) => ({
  //   backgroundColor: verified ? "#d4edda" : "#fff3cd",
  //   paddingHorizontal: 10,
  //   paddingVertical: 4,
  //   borderRadius: 20,
  // }),
  docStatusText: {
    fontSize: 11,
    color:  "#856404",
    fontWeight: "600",
  },

  actions: { flexDirection: "row", gap: 12, marginTop: 20 },
  refreshBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
  },
  logoutBtn: {
    flex: 1,
    backgroundColor: Colors.danger,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
  },
  btnText: { color: "#fff", marginLeft: 8, fontWeight: "600", fontSize: 15 },

  footer: {
    textAlign: "center",
    color: "#888",
    fontSize: 14,
    marginTop: 30,
    fontStyle: "italic",
  },

  // Modal (GIF only)
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 30,
    alignItems: "center",
    width: "85%",
    elevation: 20,
  },
  successGif: { width: 120, height: 120, marginBottom: 16 },
  modalTitle: { fontSize: 24, fontWeight: "bold", color: Colors.success, marginBottom: 8 },
  modalSubtitle: { fontSize: 16, color: "#555", textAlign: "center", marginBottom: 16 },
  redirectText: { fontSize: 13, color: "#999" },
});

// Helper
const formatDate = (d) => (d ? new Date(d).toLocaleDateString("en-IN") : "-");