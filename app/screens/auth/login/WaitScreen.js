// src/screens/WaitScreen.js
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../../constant/ui";
import BackWithLogo from "../../common/back_with_logo";
import axios from "axios";
import { API_URL_APP } from "../../../constant/api";
import loginStore from "../../../store/auth.store";

export default function WaitScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { driverId } = route.params || {};

  // Zustand
  const { logout } = loginStore();

  // State
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch driver details
  const fetchDriver = async (isRefresh = false) => {
    if (!driverId) {
      Alert.alert("Error", "Driver ID not found.");
      return;
    }

    try {
      !isRefresh && setLoading(true);
      isRefresh && setRefreshing(true);

      const { data } = await axios.get(
        `${API_URL_APP}/api/v1/driver-details/${driverId}`
      );

      if (data.success) {
        setDriver(data.data);
      } else {
        throw new Error(data.message || "Failed to fetch driver");
      }
    } catch (error) {
      console.error("Fetch driver error:", error);
      Alert.alert(
        "Error",
        error.response?.data?.message || error.message || "Failed to load data"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDriver();
  }, [driverId]);

  const refreshDriver = () => {
    Haptics.selectionAsync();
    fetchDriver(true);
  };

  const handleLogout = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert("Logout", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await logout();
          navigation.reset({ index: 0, routes: [{ name: "Login" }] });
        },
      },
    ]);
  };

  const formatDate = (iso) => {
    if (!iso) return "-";
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatDateTime = (iso) => {
    if (!iso) return "-";
    return new Date(iso).toLocaleString("en-IN");
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <BackWithLogo title="Wait – Profile Review" />
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (!driver) {
    return (
      <View style={styles.center}>
        <BackWithLogo title="Wait – Profile Review" />
        <Text style={styles.error}>Failed to load driver data.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <BackWithLogo title="Wait – Profile Review" />

      {/* Refresh Overlay */}
      {refreshing && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Photo */}
        {driver.profile_photo?.url ? (
          <Image
            source={{ uri: driver.profile_photo.url }}
            style={styles.avatar}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person" size={50} color={Colors.textSecondary} />
          </View>
        )}

        {/* Personal Info */}
        <Section title="Personal Information">
          <InfoRow label="Name" value={driver.driver_name} />
          <InfoRow label="Mobile" value={driver.driver_contact_number} />
          <InfoRow label="Email" value={driver.driver_email} />
          <InfoRow label="Gender" value={driver.driver_gender} />
          <InfoRow label="DOB" value={formatDate(driver.driver_dob)} />
        </Section>

        {/* Account Status */}
        <Section title="Account Status">
          <InfoRow
            label="Status"
            value={driver.account_status?.toUpperCase()}
            valueStyle={{
              color:
                driver.account_status === "active"
                  ? Colors.success
                  : driver.account_status === "pending"
                  ? Colors.warning
                  : Colors.danger,
            }}
          />
          <InfoRow
            label="Aadhaar Verified"
            value={driver.aadhar_verified ? "Yes" : "No"}
            valueStyle={{
              color: driver.aadhar_verified ? Colors.success : Colors.danger,
            }}
          />
        </Section>

        {/* Documents */}
        {driver.document_id && (
          <Section title="Uploaded Documents">
            <InfoRow
              label="All Verified"
              value={driver.document_id.all_verified ? "Yes" : "No"}
              valueStyle={{
                color: driver.document_id.all_verified ? Colors.success : Colors.danger,
              }}
            />

            {/* Aadhaar */}
            {driver.document_id.aadhar_card && (
              <InfoRow
                label="Aadhaar"
                value={`#${driver.document_id.aadhar_card.document_number}`}
                secondary={`Uploaded: ${formatDate(driver.document_id.aadhar_card.uploaded_at)}`}
                valueStyle={{
                  color: driver.document_id.aadhar_card.verified ? Colors.success : Colors.warning,
                }}
                onPress={() =>
                  navigation.navigate("DocumentViewer", {
                    images: [driver.document_id.aadhar_card.document.url],
                    title: "Aadhaar Card",
                  })
                }
              />
            )}

            {/* PAN */}
            {driver.document_id.pan_card && (
              <InfoRow
                label="PAN Card"
                value="Uploaded"
                secondary={`Uploaded: ${formatDate(driver.document_id.pan_card.uploaded_at)}`}
                valueStyle={{
                  color: driver.document_id.pan_card.verified ? Colors.success : Colors.warning,
                }}
                onPress={() =>
                  navigation.navigate("DocumentViewer", {
                    images: [driver.document_id.pan_card.document.url],
                    title: "PAN Card",
                  })
                }
              />
            )}

            {/* Driving License */}
            {driver.document_id.driving_license && (
              <InfoRow
                label="Driving License"
                value={`#${driver.document_id.driving_license.license_number}`}
                secondary={`Expires: ${formatDate(driver.document_id.driving_license.expiry_date)}`}
                valueStyle={{
                  color: driver.document_id.driving_license.verified ? Colors.success : Colors.warning,
                }}
                onPress={() =>
                  navigation.navigate("DocumentViewer", {
                    images: [driver.document_id.driving_license.document.url],
                    title: "Driving License",
                  })
                }
              />
            )}
          </Section>
        )}

        {/* Bank Details */}
        {driver.BankDetails && (
          <Section title="Bank Details">
            <InfoRow label="Bank" value={driver.BankDetails.bank_name} />
            <InfoRow label="A/c Holder" value={driver.BankDetails.account_holder_name} />
            <InfoRow label="A/c Number" value={driver.BankDetails.account_number} />
            <InfoRow label="IFSC" value={driver.BankDetails.ifsc_code} />
            <InfoRow label="Branch" value={driver.BankDetails.branch_name} />
            <InfoRow
              label="Verified"
              value={driver.BankDetails.verified ? "Yes" : "No"}
              valueStyle={{
                color: driver.BankDetails.verified ? Colors.success : Colors.warning,
              }}
            />
          </Section>
        )}

        {/* Vehicle */}
        {driver.current_vehicle_id && (
          <Section title="Vehicle Details">
            <InfoRow label="Number" value={driver.current_vehicle_id.vehicle_number} />
            <InfoRow label="Type" value={driver.current_vehicle_id.vehicle_type?.toUpperCase()} />
            <InfoRow label="Brand" value={driver.current_vehicle_id.vehicle_brand} />
            <InfoRow
              label="RC Verified"
              value={driver.current_vehicle_id.registration_certificate?.verified ? "Yes" : "No"}
              valueStyle={{
                color: driver.current_vehicle_id.registration_certificate?.verified
                  ? Colors.success
                  : Colors.warning,
              }}
            />
            <InfoRow
              label="Insurance"
              value={formatDate(driver.current_vehicle_id.insurance?.expiry_date)}
            />
            <InfoRow
              label="Permit"
              value={formatDate(driver.current_vehicle_id.permit?.expiry_date)}
            />
            <InfoRow
              label="Active"
              value={driver.current_vehicle_id.is_active ? "Yes" : "No"}
              valueStyle={{
                color: driver.current_vehicle_id.is_active ? Colors.success : Colors.danger,
              }}
            />
          </Section>
        )}



        {/* Actions */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.btn, styles.refreshBtn]}
            onPress={refreshDriver}
            disabled={refreshing}
          >
            <Ionicons name="refresh" size={20} color={Colors.white} />
            <Text style={styles.btnText}>Refresh</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, styles.logoutBtn]}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={20} color={Colors.white} />
            <Text style={styles.btnText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Your profile is under review. We'll notify you once approved.
        </Text>
      </ScrollView>
    </View>
  );
}

/* ====================== REUSABLE COMPONENTS ====================== */
const Section = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);

const InfoRow = ({ label, value, secondary, valueStyle, onPress }) => (
  <TouchableOpacity
    style={styles.infoRow}
    onPress={onPress}
    disabled={!onPress}
    activeOpacity={0.7}
  >
    <View style={{ flex: 0.5 }}>
      <Text style={styles.infoLabel}>{label}:</Text>
      {secondary && <Text style={styles.infoSecondary}>{secondary}</Text>}
    </View>
    <View style={{ flex: 0.5, alignItems: "flex-end" }}>
      <Text style={[styles.infoValue, valueStyle]}>{value ?? "-"}</Text>
      {onPress && (
        <Ionicons
          name="chevron-forward"
          size={18}
          color={Colors.textSecondary}
          style={{ marginTop: 2 }}
        />
      )}
    </View>
  </TouchableOpacity>
);

/* ============================== STYLES ============================== */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 20, paddingBottom: 40 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background,
  },
  loadingText: { marginTop: 12, color: Colors.textSecondary, fontSize: 16 },
  error: { color: Colors.danger, fontSize: 16 },

  // Avatar
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: "center",
    marginBottom: 20,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.surface,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 20,
  },

  // Section
  section: {
    marginBottom: 25,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 12,
  },

  // Info row
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  infoLabel: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  infoSecondary: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  infoValue: {
    fontSize: 15,
    color: Colors.textPrimary,
    textAlign: "right",
  },

  // Actions
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 0.48,
  },
  refreshBtn: { backgroundColor: Colors.primary },
  logoutBtn: { backgroundColor: Colors.danger },
  btnText: { color: Colors.white, marginLeft: 8, fontWeight: "600" },

  // Footer
  footer: {
    marginTop: 30,
    textAlign: "center",
    color: Colors.textSecondary,
    fontSize: 14,
    fontStyle: "italic",
  },

  // Loading overlay
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.8)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
});