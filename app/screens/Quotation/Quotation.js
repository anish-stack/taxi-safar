import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  RefreshControl,
  Share,
  Linking,
  TextInput,
  Alert,
} from "react-native";
import { MaterialCommunityIcons, Ionicons, Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import axios from "axios";
import { useNavigation } from "@react-navigation/native";
import { UniversalAlert } from "../common/UniversalAlert";
import { API_URL_APP } from "../../constant/api"; // Fixed: was API_URL_APP
import loginStore from "../../store/auth.store";
import BackWithLogo from "../common/back_with_logo";

export default function Quotation() {
  const navigation = useNavigation();
  const { token } = loginStore();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [quotations, setQuotations] = useState([]);
  const [filteredQuotations, setFilteredQuotations] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); // all, ready, processing

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    type: "error",
    title: "",
    message: "",
  });

  const showAlert = (type, title, message) => {
    setAlertConfig({ type, title, message });
    setAlertVisible(true);
  };

  // Fetch Quotations
  const fetchQuotations = async () => {
    try {
      const res = await axios.get(`${API_URL_APP}/api/v1/get-quotation`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.success) {
        const data = res.data.data || [];
        setQuotations(data);
        setFilteredQuotations(data);
      }
    } catch (error) {
      showAlert(
        "error",
        "Error",
        error.response?.data?.message || "Failed to load quotations"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Delete Quotation
  const deleteQuotation = async (id, invoiceNo) => {
    Alert.alert(
      "Delete Quotation",
      `Are you sure you want to delete ${invoiceNo}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await axios.delete(
                `${API_URL_APP}/api/v1/delete-quotation/${id}`,
                {
                  headers: { Authorization: `Bearer ${token}` },
                }
              );
              showAlert("success", "Deleted", `${invoiceNo} has been deleted.`);
              fetchQuotations();
            } catch (error) {
              showAlert("error", "Failed", "Could not delete quotation.");
            }
          },
        },
      ]
    );
  };

  // Search & Filter Logic
  useEffect(() => {
    let filtered = quotations;

    if (searchQuery.trim()) {
      filtered = filtered.filter(
        (q) =>
          q.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
          q.bill_to.customer_name
            .toLowerCase()
            .includes(searchQuery.toLowerCase())
      );
    }

    if (filterStatus !== "all") {
      filtered = filtered.filter((q) =>
        filterStatus === "ready" ? q.pdf?.url : !q.pdf?.url
      );
    }

    setFilteredQuotations(filtered);
  }, [searchQuery, filterStatus, quotations]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchQuotations();
  }, [token]);

  useEffect(() => {
    if (token) fetchQuotations();
  }, [token]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const sharePDF = async (pdfUrl, invoiceNo) => {
    try {
      await Share.share({
        title: `Quotation ${invoiceNo}`,
        message: `Quotation ${invoiceNo} from your travel partner`,
        url: pdfUrl,
      });
    } catch (error) {
      showAlert("error", "Share Failed", "Unable to share PDF");
    }
  };

  const downloadPDF = (pdfUrl) => {
    Linking.openURL(pdfUrl).catch(() =>
      showAlert("error", "Error", "Cannot open PDF")
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#FF5252" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FF5252" />
          <Text style={styles.loadingText}>Loading quotations...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
   
    <BackWithLogo/>

      {/* Search & Filter Bar */}
      <View style={styles.searchFilterContainer}>
        <View style={styles.searchBar}>
          <Feather name="search" size={20} color="#999" />
          <TextInput
            placeholder="Search invoice or customer..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
            placeholderTextColor="#aaa"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.filterButtons}>
          {["all", "ready", "processing"].map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.filterBtn,
                filterStatus === status && styles.filterBtnActive,
              ]}
              onPress={() => setFilterStatus(status)}
            >
              <Text
                style={[
                  styles.filterBtnText,
                  filterStatus === status && styles.filterBtnTextActive,
                ]}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Quotation List */}
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#FF5252"]}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16 }}
      >
        {/* Empty View */}
        {filteredQuotations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons
              name="file-document-outline"
              size={80}
              color="#ddd"
            />
            <Text style={styles.emptyTitle}>
              {searchQuery || filterStatus !== "all"
                ? "No results found"
                : "No Quotations Yet"}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery || filterStatus !== "all"
                ? "Try different keywords"
                : "Create your first quotation"}
            </Text>
          </View>
        ) : (
          filteredQuotations.map((q) => {
            const trip = q.trip_details?.[0];
            const isRoundTrip = q.trip_type === "round_trip";
            const pdfUrl = q.pdf?.url;
            const amountFormatted = `₹${q.summary.grand_total
              .toLocaleString()
              .replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;

            return (
              <View key={q._id} style={styles.cardWrapper}>
                <TouchableOpacity
                  style={styles.card}
                  activeOpacity={0.8}
                  // onPress={() =>
                  //   navigation.navigate("QuotationDetail", {
                  //     quotationId: q._id,
                  //   })
                  // }
                >
                  {/* ---------- Card Header ---------- */}
                  <View style={styles.cardHeader}>
                    <View>
                      <Text style={styles.invoiceNo}>{q.invoice_number}</Text>
                      <Text style={styles.customerName}>
                        {q.bill_to?.customer_name}
                      </Text>
                    </View>

                    <View style={styles.amountContainer}>
                      <Text style={styles.amount}>{amountFormatted}</Text>

                      <View
                        style={[
                          styles.statusBadge,
                          pdfUrl ? styles.statusSuccess : styles.statusPending,
                        ]}
                      >
                        <Text style={styles.statusText}>
                          {pdfUrl ? "Ready" : "Processing"}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* ---------- Trip Info ---------- */}
                  <View style={styles.tripInfo}>
                    {/* Pickup & Drop */}
                    <View style={styles.tripRow}>
                      <Ionicons name="location" size={16} color="#777" />
                      <Text style={styles.tripText}>
                        {trip?.pickup_drop_place}
                      </Text>
                    </View>

                    {/* Pickup Date */}
                    <View style={styles.dateRow}>
                      <MaterialCommunityIcons
                        name="calendar"
                        size={16}
                        color="#777"
                      />
                      <Text style={styles.dateText}>
                        {formatDate(trip?.pickup_date)} {trip?.pickup_time}
                      </Text>
                    </View>

                    {/* Return Date (Round Trip) */}
                    {isRoundTrip && trip?.return_date && (
                      <View style={styles.dateRow}>
                        <Ionicons
                          name="return-up-back"
                          size={16}
                          color="#FF5252"
                        />
                        <Text style={styles.returnText}>
                          Return: {formatDate(trip?.return_date)}{" "}
                          {trip?.return_time || ""}
                        </Text>
                      </View>
                    )}

                    {/* Footer Row */}
                    <View style={styles.footerRow}>
                      <View style={styles.tripTypeBadge}>
                        <Text style={styles.tripTypeText}>
                          {isRoundTrip ? "Round Trip" : "One Way"}
                        </Text>
                      </View>
                      <Text style={styles.invoiceDate}>
                        {formatDate(q.invoice_date)}
                      </Text>
                    </View>
                  </View>
                   <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => deleteQuotation(q._id, q.invoice_number)}
                >
                  <MaterialCommunityIcons
                    name="trash-can-outline"
                    size={22}
                    color="#fff"
                  />
                </TouchableOpacity>

                  {/* ---------- PDF Action Buttons ---------- */}
                  {pdfUrl && (
                    <View style={styles.pdfActions}>
                      <TouchableOpacity
                        style={styles.pdfActionBtn}
                        onPress={() => downloadPDF(pdfUrl)}
                      >
                        <MaterialCommunityIcons
                          name="download"
                          size={20}
                          color="#FF5252"
                        />
                        <Text style={styles.pdfActionText}>Download</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.pdfActionBtn,
                          { backgroundColor: "#FF5252" },
                        ]}
                        onPress={() => sharePDF(pdfUrl, q.invoice_number)}
                      >
                        <MaterialCommunityIcons
                          name="share-variant"
                          size={20}
                          color="#fff"
                        />
                        <Text style={[styles.pdfActionText, { color: "#fff" }]}>
                          Share
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </TouchableOpacity>

                {/* ---------- Delete Button ---------- */}
               
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Floating Action Button */}
      {filteredQuotations.length > 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate("create-quotation")}
        >
          <Ionicons name="add" size={32} color="#fff" />
        </TouchableOpacity>
      )}

      <UniversalAlert
        visible={alertVisible}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        primaryButton="OK"
        onPrimaryPress={() => setAlertVisible(false)}
        onClose={() => setAlertVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafafa" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 16, fontSize: 16, color: "#777" },

  header: {
    backgroundColor: "#FF5252",
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    elevation: 5,
  },
  backButton: { padding: 6 },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#fff" },
  addButton: { padding: 6 },

  searchFilterContainer: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
    marginBottom: 12,
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16, color: "#333" },

  filterButtons: { flexDirection: "row", justifyContent: "space-between" },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
  },
  filterBtnActive: { backgroundColor: "#FF5252" },
  filterBtnText: { fontSize: 13, color: "#666", fontWeight: "600" },
  filterBtnTextActive: { color: "#fff" },

  cardWrapper: { position: "relative", marginBottom: 16 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  deleteBtn: {
    // position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "#e74c3c",
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
  },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  invoiceNo: { fontSize: 17, fontWeight: "bold", color: "#333" },
  customerName: { fontSize: 14, color: "#666", marginTop: 4 },
  amountContainer: { alignItems: "flex-end" },
  amount: { fontSize: 19, fontWeight: "bold", color: "#FF5252" },
  statusBadge: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusSuccess: { backgroundColor: "#e8f5e9" },
  statusPending: { backgroundColor: "#fff8e1" },
  statusText: { fontSize: 11, fontWeight: "bold", color: "#2e7d32" },

  tripInfo: { marginTop: 16 },
  tripRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  tripText: { marginLeft: 10, fontSize: 15, color: "#444" },
  dateRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  dateText: { marginLeft: 10, fontSize: 14, color: "#666" },
  returnText: {
    marginLeft: 10,
    fontSize: 14,
    color: "#FF5252",
    fontWeight: "600",
  },

  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
  },
  tripTypeBadge: {
    backgroundColor: "#FF5252",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  tripTypeText: { color: "#fff", fontSize: 12, fontWeight: "bold" },
  invoiceDate: { fontSize: 13, color: "#999" },

  pdfActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    gap: 12,
  },
  pdfActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#FF5252",
  },
  pdfActionText: {
    marginLeft: 8,
    fontWeight: "bold",
    color: "#FF5252",
    fontSize: 15,
  },

  emptyContainer: { alignItems: "center", marginTop: 100 },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#aaa",
    marginTop: 20,
  },
  emptySubtitle: { fontSize: 15, color: "#bbb", marginTop: 8 },

  fab: {
    position: "absolute",
    right: 20,
    bottom: 30,
    backgroundColor: "#FF5252",
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    elevation: 10,
  },
});
