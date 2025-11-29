// screens/AllBorderTax.js
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  Alert,
  Modal,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import BackWithLogo from "../common/back_with_logo";
import axios from "axios";
import loginStore from "../../store/auth.store";
import { API_URL_APP } from "../../constant/api";
import useDriverStore from "../../store/driver.store";
import { useNavigation } from "@react-navigation/native";

export default function AllBorderTax() {
  const { token } = loginStore();
  const { driver } = useDriverStore();
  const navigation = useNavigation();

  const [taxes, setTaxes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);

  const [statusFilter, setStatusFilter] = useState("");
  const [filterModal, setFilterModal] = useState(false);
  const [limitModal, setLimitModal] = useState(false);

  const fetchData = useCallback(async (newPage = 1, append = false) => {
    if (!driver?._id) return;

    try {
      setLoading(newPage === 1);
      const res = await axios.get(
        `${API_URL_APP}/api/v1/border-tax/my?page=${newPage}&limit=${limit}&status=${statusFilter}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const newData = res.data?.data || [];
      setTaxes(append ? [...taxes, ...newData] : newData);
      setPage(newPage);
      setTotalPages(res.data?.pagination?.pages || 1);
    } catch (error) {
      Alert.alert("Error", "Failed to load records");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [driver, token, limit, statusFilter, taxes]);

  useEffect(() => {
    fetchData(1);
  }, [driver, limit, statusFilter]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData(1);
  };

  const loadMore = () => {
    if (!loading && page < totalPages) {
      fetchData(page + 1, true);
    }
  };

  const deleteRecord = (id) => {
    Alert.alert(
      "Delete Record",
      "Are you sure you want to delete this border tax slip?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await axios.delete(`${API_URL_APP}/api/v1/border-tax/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              setTaxes(prev => prev.filter(t => t._id !== id));
              Alert.alert("Deleted", "Record removed successfully");
            } catch (err) {
              Alert.alert("Error", "Could not delete record");
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "approved": return "#10B981";
      case "rejected": return "#EF4444";
      case "pending": return "#F59E0B";
      default: return "#6B7280";
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardContent}>
        <Text style={styles.borderState}>{item.border_state || "Unknown State"}</Text>
        <Text style={styles.detailText}>Vehicle: <Text style={styles.bold}>{item.vehicle_number}</Text></Text>
        <Text style={styles.detailText}>Trip: <Text style={styles.bold}>{item.trip_type}</Text></Text>

        <View style={styles.bottomRow}>
<Text style={styles.amount}>
  {item.tax_amount && item.tax_amount > 0
    ? `₹${item.tax_amount}`
    : "Amount will be updated in next 10 minutes. Thank you"}
</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{(item.status || "unknown").toUpperCase()}</Text>
          </View>
        </View>
      </View>

      {/* Action Buttons - Always Visible */}
      <View style={styles.actionButtons}>
        <Pressable
          style={({ pressed }) => [styles.actionBtn, styles.editBtn, pressed && styles.btnPressed]}
          onPress={() => navigation.navigate("CreateBorderTax", { id: item?._id })}
        >
          <Ionicons name="create-outline" size={22} color="#2563EB" />
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.actionBtn, styles.deleteBtn, pressed && styles.btnPressed]}
          onPress={() => deleteRecord(item._id)}
        >
          <Ionicons name="trash-outline" size={22} color="#fff" />
        </Pressable>
      </View>
    </View>
  );

  if (loading && taxes.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <BackWithLogo />
        <View style={{ flex: 1, justifyContent: "center" }}>
          <ActivityIndicator size="large" color="#E30022" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <BackWithLogo />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>My Border Taxes</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setLimitModal(true)}>
            <Ionicons name="grid-outline" size={24} color="#fff" />
            <Text style={styles.iconBtnText}>{limit}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setFilterModal(true)}>
            <Ionicons name="filter" size={24} color="#fff" />
            {statusFilter !== "" && <View style={styles.activeDot} />}
          </TouchableOpacity>
        </View>
      </View>

      {/* List */}
      <FlatList
        data={taxes}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#E30022"]} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={80} color="#ddd" />
            <Text style={styles.emptyText}>No border tax records found</Text>
            <Text style={styles.emptySub}>Pull down to refresh</Text>
          </View>
        }
        ListFooterComponent={
          loading && page > 1 ? <ActivityIndicator style={{ marginVertical: 20 }} /> : null
        }
      />

      {/* Filter Modal */}
      <Modal visible={filterModal} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setFilterModal(false)}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Filter by Status</Text>
            {["All", "Pending", "Approved", "Rejected"].map((label) => {
              const value = label === "All" ? "" : label.toLowerCase();
              return (
                <TouchableOpacity
                  key={value}
                  style={[styles.modalOption, statusFilter === value && styles.modalOptionActive]}
                  onPress={() => {
                    setStatusFilter(value);
                    setFilterModal(false);
                  }}
                >
                  <Text style={[styles.modalOptionText, statusFilter === value && styles.modalOptionTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Modal>

      {/* Limit Modal */}
      <Modal visible={limitModal} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setLimitModal(false)}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Items Per Page</Text>
            {[10, 20, 50].map((val) => (
              <TouchableOpacity
                key={val}
                style={[styles.modalOption, limit === val && styles.modalOptionActive]}
                onPress={() => {
                  setLimit(val);
                  setLimitModal(false);
                }}
              >
                <Text style={[styles.modalOptionText, limit === val && styles.modalOptionTextActive]}>
                  {val} items
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  title: { fontSize: 23, fontWeight: "800", color: "#111827" },
  headerActions: { flexDirection: "row", gap: 12 },
  iconBtn: {
    backgroundColor: "#E30022",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  iconBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  activeDot: { position: "absolute", top: 6, right: 6, width: 9, height: 9, backgroundColor: "#10B981", borderRadius: 5 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  cardContent: { flex: 1 },
  borderState: { fontSize: 18, fontWeight: "700", color: "#111827" },
  detailText: { fontSize: 14.5, color: "#555", marginTop: 4 },
  bold: { fontWeight: "800", color: "#000" },
  bottomRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 },
  amount: { fontSize: 15, fontWeight: "800", color: "#E30022" },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  statusText: { color: "#fff", fontSize: 11, fontWeight: "700" },

  actionButtons: { flexDirection: "row", gap: 10 },
  actionBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  editBtn: { backgroundColor: "#EFF6FF" },
  deleteBtn: { backgroundColor: "#EF4444" },
  btnPressed: { opacity: 0.7, transform: [{ scale: 0.92 }] },

  empty: { alignItems: "center", marginTop: 100 },
  emptyText: { marginTop: 16, fontSize: 17, color: "#888", fontWeight: "600" },
  emptySub: { marginTop: 6, color: "#aaa", fontSize: 14 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalBox: { backgroundColor: "#fff", width: "82%", borderRadius: 18, padding: 20, elevation: 10 },
  modalTitle: { fontSize: 19, fontWeight: "800", textAlign: "center", marginBottom: 20, color: "#111" },
  modalOption: { padding: 14, borderRadius: 12, marginBottom: 10, backgroundColor: "#f4f4f5" },
  modalOptionActive: { backgroundColor: "#E30022" },
  modalOptionText: { textAlign: "center", fontWeight: "600", color: "#333" },
  modalOptionTextActive: { color: "#fff" },
});