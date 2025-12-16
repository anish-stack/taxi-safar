// screens/AllBorderTax.js
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
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
import { useNavigation } from "@react-navigation/native";

export default function AllBorderTax() {
  const { token } = loginStore();
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
    try {
      setLoading(newPage === 1);
      const res = await axios.get(
        `${API_URL_APP}/api/v1/border-tax/my?page=${newPage}&limit=${limit}&status=${statusFilter}`,
        { headers: { Authorization: `Bearer ${token}` } }
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
  }, [token, limit, statusFilter, taxes]);

  useEffect(() => {
    fetchData(1);
  }, [limit, statusFilter]);

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
    Alert.alert("Delete", "Delete this border tax record?", [
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
          } catch (err) {
            Alert.alert("Error", "Failed to delete");
          }
        },
      },
    ]);
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "approved": return "#10B981";
      case "rejected": return "#EF4444";
      case "pending": return "#F59E0B";
      default: return "#666";
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.content}>
        <Text style={styles.state}>{item.border_state || "N/A"}</Text>
        <Text style={styles.vehicle}>Vehicle: {item.vehicle_number}</Text>
        <Text style={styles.trip}>Trip: {item.trip_type?.replace("_", " ")}</Text>

        <View style={styles.footer}>
          <Text style={styles.amount}>
            {item.tax_amount > 0 ? `₹${item.tax_amount}` : "Processing..."}
          </Text>
          <View style={[styles.status, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{(item.status || "pending").toUpperCase()}</Text>
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => navigation.navigate("CreateBorderTax", { id: item._id })}
        >
          <Ionicons name="create-outline" size={20} color="#000" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteRecord(item._id)}>
          <Ionicons name="trash-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading && taxes.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <BackWithLogo />
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.loaderText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <BackWithLogo />

      <View style={styles.header}>
        <Text style={styles.title}>My Border Taxes</Text>
        <View style={styles.headerBtns}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => setLimitModal(true)}>
            <Ionicons name="grid-outline" size={20} color="#fff" />
            <Text style={styles.headerBtnText}>{limit}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={() => setFilterModal(true)}>
            <Ionicons name="filter" size={20} color="#fff" />
            {statusFilter && <View style={styles.dot} />}
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={taxes}
        keyExtractor={item => item._id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={60} color="#ccc" />
            <Text style={styles.emptyText}>No records</Text>
          </View>
        }
        ListFooterComponent={loading && page > 1 ? <ActivityIndicator style={{ margin: 20 }} /> : null}
      />

      {/* Status Filter Modal */}
      <Modal visible={filterModal} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setFilterModal(false)}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Filter by Status</Text>
            {["All", "Pending", "Approved", "Rejected"].map(label => {
              const value = label === "All" ? "" : label.toLowerCase();
              return (
                <TouchableOpacity
                  key={value}
                  style={[styles.modalItem, statusFilter === value && styles.modalItemActive]}
                  onPress={() => {
                    setStatusFilter(value);
                    setFilterModal(false);
                  }}
                >
                  <Text style={[styles.modalItemText, statusFilter === value && styles.modalItemTextActive]}>
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
        <Pressable style={styles.overlay} onPress={() => setLimitModal(false)}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Items per page</Text>
            {[10, 20, 50].map(val => (
              <TouchableOpacity
                key={val}
                style={[styles.modalItem, limit === val && styles.modalItemActive]}
                onPress={() => {
                  setLimit(val);
                  setLimitModal(false);
                }}
              >
                <Text style={[styles.modalItemText, limit === val && styles.modalItemTextActive]}>
                  {val}
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
  container: { flex: 1, backgroundColor: "#fff" },

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
  title: { fontSize: 20, fontWeight: "bold", color: "#000" },
  headerBtns: { flexDirection: "row", gap: 12 },
  headerBtn: {
    backgroundColor: "#000",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  headerBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  dot: { position: "absolute", top: 6, right: 6, width: 8, height: 8, backgroundColor: "#fff", borderRadius: 4 },

  list: { padding: 16 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#eee",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  content: { flex: 1 },
  state: { fontSize: 16, fontWeight: "600", color: "#000" },
  vehicle: { fontSize: 13, color: "#555", marginTop: 4 },
  trip: { fontSize: 13, color: "#555", marginTop: 2 },

  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 },
  amount: { fontSize: 14, fontWeight: "600", color: "#000" },
  status: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { color: "#fff", fontSize: 11, fontWeight: "600" },

  actions: { flexDirection: "row", gap: 10 },
  editBtn: {
    backgroundColor: "#f0f0f0",
    padding: 10,
    borderRadius: 10,
  },
  deleteBtn: {
    backgroundColor: "#000",
    padding: 10,
    borderRadius: 10,
  },

  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  loaderText: { marginTop: 12, fontSize: 14, color: "#777" },

  empty: { alignItems: "center", marginTop: 80 },
  emptyText: { fontSize: 16, color: "#888", marginTop: 16 },

  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center" },
  modal: { backgroundColor: "#fff", width: "80%", borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 17, fontWeight: "600", textAlign: "center", marginBottom: 16, color: "#000" },
  modalItem: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, marginBottom: 8 },
  modalItemActive: { backgroundColor: "#000" },
  modalItemText: { textAlign: "center", fontSize: 15, color: "#000" },
  modalItemTextActive: { color: "#fff" },
});