import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import BackWithLogo from "../common/back_with_logo";
import loginStore from "../../store/auth.store";
import axios from "axios";
import { API_URL_APP } from "../../constant/api";

export default function AllInsurance({ navigation }) {
  const { token } = loginStore();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);

  const fetchInsurance = async () => {
    try {
      const res = await axios.get(`${API_URL_APP}/api/v1/insurance/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
       console.log("Fetch Insurance Error:", res.data);
      setData(res.data.data);
    } catch (error) {
      console.log("Fetch Insurance Error:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchInsurance();
  }, []);

  const deleteInsurance = async (id) => {
    Alert.alert(
      "Delete Insurance Request",
      "This action cannot be undone. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await axios.delete(`${API_URL_APP}/api/v1/insurance/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              fetchInsurance();
              Alert.alert("Success", "Insurance request deleted successfully");
            } catch (err) {
              console.log(err.response.data)
              Alert.alert("Error", "Failed to delete insurance request");
            }
          },
        },
      ]
    );
  };

  const getStatusConfig = (status) => {
    const configs = {
      pending: {
        bg: "#FFF4E6",
        color: "#E65100",
        icon: "⏳",
        label: "Pending Review",
      },
      processing: {
        bg: "#E3F2FD",
        color: "#1565C0",
        icon: "⚙️",
        label: "Processing",
      },
      completed: {
        bg: "#E8F5E9",
        color: "#2E7D32",
        icon: "✓",
        label: "Completed",
      },
      rejected: {
        bg: "#FFEBEE",
        color: "#C62828",
        icon: "✕",
        label: "Rejected",
      },
    };
    return configs[status] || configs.pending;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1565C0" />
          <Text style={styles.loadingText}>Loading your requests...</Text>
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
        <View style={styles.header}>
          <Text style={styles.title}>My Insurance Requests</Text>
          <Text style={styles.subtitle}>
            {data.length} {data.length === 1 ? "request" : "requests"} found
          </Text>
        </View>

        {data.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>No Requests Yet</Text>
            <Text style={styles.emptySubtitle}>
              Your insurance requests will appear here
            </Text>
            <TouchableOpacity
              style={styles.createBtn}
              onPress={() => navigation.navigate("CreateInsurance")}
            >
              <Text style={styles.createBtnText}>Create New Request</Text>
            </TouchableOpacity>
          </View>
        ) : (
          data.map((item, index) => {
            const statusConfig = getStatusConfig(item.status);
            return (
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate("CreateInsurance", { id: item?._id })
                }
                key={index}
                style={styles.card}
                activeOpacity={0.9}
              >
                {/* Status Badge */}
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: statusConfig.bg },
                  ]}
                >
                  <Text style={styles.statusIcon}>{statusConfig.icon}</Text>
                  <Text
                    style={[styles.statusLabel, { color: statusConfig.color }]}
                  >
                    {statusConfig.label}
                  </Text>
                </View>

                {/* Main Content */}
                <View style={styles.cardContent}>
                  <View style={styles.infoRow}>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Full Name</Text>
                      <Text style={styles.infoValue}>{item.full_name}</Text>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.infoRow}>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Vehicle Number</Text>
                      <Text style={styles.infoValue}>
                        {item.vehicle_number}
                      </Text>
                    </View>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Contact</Text>
                      <Text style={styles.infoValue}>
                        {item.contact_number}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.infoRow}>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Insurance Type</Text>
                      <Text style={styles.infoValue}>
                        {item.insurance_type}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.budgetContainer}>
                    <Text style={styles.budgetLabel}>Estimated Budget</Text>
                    <Text style={styles.budgetValue}>
                      {item.budget === 0
                        ? "Calculating..."
                        : `₹${item.budget.toLocaleString("en-IN")}`}
                    </Text>
                    {item.budget === 0 && (
                      <Text style={styles.budgetNote}>
                        Amount will be available within 10 minutes
                      </Text>
                    )}
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.actionBtnSecondary}
                    onPress={() =>
                      navigation.navigate("CreateInsurance", { id: item._id })
                    }
                  >
                    <Text style={styles.actionBtnSecondaryText}>✏️ Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionBtnDanger}
                    onPress={() => deleteInsurance(item._id)}
                  >
                    <Text style={styles.actionBtnDangerText}>🗑️ Delete</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
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
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: "#666",
    fontWeight: "500",
  },

  // Empty State
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: "#666",
    marginBottom: 24,
  },
  createBtn: {
    backgroundColor: "#1565C0",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  createBtnText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },

  // Card Styles
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    overflow: "hidden",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  statusIcon: {
    fontSize: 16,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Card Content
  cardContent: {
    padding: 16,
  },
  infoRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 12,
  },
  infoItem: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontWeight: "600",
  },
  infoValue: {
    fontSize: 16,
    color: "#1A1A1A",
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: "#E0E0E0",
    marginVertical: 12,
  },

  // Budget Section
  budgetContainer: {
    backgroundColor: "#F5F7FA",
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  budgetLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontWeight: "600",
  },
  budgetValue: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1565C0",
  },
  budgetNote: {
    fontSize: 12,
    color: "#E65100",
    marginTop: 6,
    fontStyle: "italic",
  },

  // Action Buttons
  actionRow: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  actionBtnSecondary: {
    flex: 1,
    backgroundColor: "#F5F7FA",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  actionBtnSecondaryText: {
    color: "#1A1A1A",
    fontSize: 15,
    fontWeight: "700",
  },
  actionBtnDanger: {
    flex: 1,
    backgroundColor: "#FFEBEE",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FFCDD2",
  },
  actionBtnDangerText: {
    color: "#C62828",
    fontSize: 15,
    fontWeight: "700",
  },
});