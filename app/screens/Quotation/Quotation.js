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

  Linking,
  TextInput,
  Alert,
  Modal,
} from "react-native";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import { MaterialCommunityIcons, Ionicons, Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import axios from "axios";
import { useNavigation } from "@react-navigation/native";
import { UniversalAlert } from "../common/UniversalAlert";
import { API_URL_APP } from "../../constant/api";
import loginStore from "../../store/auth.store";
import BackWithLogo from "../common/back_with_logo";

export default function Quotation() {
  const navigation = useNavigation();
  const { token } = loginStore();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [convertingId, setConvertingId] = useState(null);
  const [quotations, setQuotations] = useState([]);
  const [filteredQuotations, setFilteredQuotations] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [sortBy, setSortBy] = useState("date_desc");
  const [showSortModal, setShowSortModal] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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
        error.response?.data?.message || "Failed to load documents"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const convertToInvoice = async (id, invoiceNo) => {
    Alert.alert("Convert to Invoice", `Convert ${invoiceNo} to Tax Invoice?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Convert",
        onPress: async () => {
          setConvertingId(id);
          try {
            await axios.post(
              `${API_URL_APP}/api/v1/convert-to-invoice/${id}`,
              {},
              { headers: { Authorization: `Bearer ${token}` } }
            );
            showAlert(
              "success",
              "Success",
              `${invoiceNo} converted to Invoice`
            );
            setFilterType("invoice");
            fetchQuotations();
          } catch (error) {
            showAlert(
              "error",
              "Failed",
              error.response?.data?.message || "Could not convert"
            );
          } finally {
            setConvertingId(null);
          }
        },
      },
    ]);
  };

  const deleteDocument = async (id, invoiceNo) => {
    Alert.alert("Delete Document", `Delete ${invoiceNo} permanently?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await axios.delete(`${API_URL_APP}/api/v1/delete-quotation/${id}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            showAlert(
              "success",
              "Deleted",
              `${invoiceNo} deleted successfully`
            );
            fetchQuotations();
          } catch (error) {
            showAlert("error", "Failed", "Could not delete document");
          }
        },
      },
    ]);
  };

const shareDocument = async (pdfUrl, invoiceNo) => {
  try {
    // ✅ Legacy cache directory is guaranteed
    const localUri = `${FileSystem.cacheDirectory}${invoiceNo}.pdf`;

    console.log("⬇️ Downloading PDF to:", localUri);

    await FileSystem.downloadAsync(pdfUrl, localUri);

    if (!(await Sharing.isAvailableAsync())) {
      throw new Error("Sharing not available");
    }

    await Sharing.shareAsync(localUri, {
      mimeType: "application/pdf",
      dialogTitle: invoiceNo,
      UTI: "com.adobe.pdf", // iOS
    });
  } catch (err) {
    console.error("❌ Share error:", err);
    showAlert("error", "Share Failed", "Unable to share document");
  }
};
  const sortQuotations = (data, sortType) => {
    const sorted = [...data];
    switch (sortType) {
      case "date_desc":
        return sorted.sort(
          (a, b) => new Date(b.invoice_date) - new Date(a.invoice_date)
        );
      case "date_asc":
        return sorted.sort(
          (a, b) => new Date(a.invoice_date) - new Date(b.invoice_date)
        );
      case "amount_desc":
        return sorted.sort(
          (a, b) =>
            (b.summary?.grand_total || 0) - (a.summary?.grand_total || 0)
        );
      case "amount_asc":
        return sorted.sort(
          (a, b) =>
            (a.summary?.grand_total || 0) - (b.summary?.grand_total || 0)
        );
      case "name_asc":
        return sorted.sort((a, b) =>
          a.bill_to.customer_name.localeCompare(b.bill_to.customer_name)
        );
      case "name_desc":
        return sorted.sort((a, b) =>
          b.bill_to.customer_name.localeCompare(a.bill_to.customer_name)
        );
      default:
        return sorted;
    }
  };

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

    if (filterType !== "all") {
      filtered = filtered.filter((q) =>
        filterType === "quotation"
          ? q.document_type === "quotation"
          : q.document_type === "invoice"
      );
    }

    filtered = sortQuotations(filtered, sortBy);
    setFilteredQuotations(filtered);
    setCurrentPage(1);
  }, [searchQuery, filterType, quotations, sortBy]);

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

  const totalPages = Math.ceil(filteredQuotations.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedQuotations = filteredQuotations.slice(startIndex, endIndex);

  const sortOptions = [
    { label: "Date (Newest First)", value: "date_desc" },
    { label: "Date (Oldest First)", value: "date_asc" },
    { label: "Amount (High to Low)", value: "amount_desc" },
    { label: "Amount (Low to High)", value: "amount_asc" },
    { label: "Customer (A-Z)", value: "name_asc" },
    { label: "Customer (Z-A)", value: "name_desc" },
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.loadingText}>Loading documents...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <BackWithLogo />

      <View style={styles.searchFilterContainer}>
        <View style={styles.searchBar}>
          <Feather name="search" size={18} color="#999" />
          <TextInput
            placeholder="Search invoice or customer..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
            placeholderTextColor="#aaa"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={18} color="#999" />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.filterRow}>
          <View style={styles.filterButtons}>
            {["all", "quotation", "invoice"].map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.filterBtn,
                  filterType === type && styles.filterBtnActive,
                ]}
                onPress={() => setFilterType(type)}
              >
                <Text
                  style={[
                    styles.filterBtnText,
                    filterType === type && styles.filterBtnTextActive,
                  ]}
                >
                  {type === "all"
                    ? "All"
                    : type?.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={styles.sortButton}
            onPress={() => setShowSortModal(true)}
          >
            <MaterialCommunityIcons name="sort" size={20} color="#000" />
          </TouchableOpacity>
        </View>

        {filteredQuotations.length > 0 && (
          <Text style={styles.resultCount}>
            {filteredQuotations.length} result
            {filteredQuotations.length !== 1 ? "s" : ""}
          </Text>
        )}
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#000"]}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16 }}
      >
        {filteredQuotations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons
              name="file-document-outline"
              size={70}
              color="#ccc"
            />
            <Text style={styles.emptyTitle}>
              {searchQuery || filterType !== "all"
                ? "No results found"
                : "No Documents Yet"}
            </Text>
            <Text style={styles.emptySubtitle}>
              Create your first quotation
            </Text>
          </View>
        ) : (
          <>
         {paginatedQuotations.map((q) => {
  const trip = q.trip_details?.[0] || {};
  const isQuotation = q.document_type === "quotation";
  const pdfUrl = q.pdf?.url;
  const amount = q.summary?.grand_total || q.summary?.total || 0;
  const amountFormatted = `₹${amount.toLocaleString("en-IN")}`;
  const isConverting = convertingId === q._id;

  return (
    <View key={q._id} style={styles.card}>
      {/* Header: Invoice No, Customer, Type + Amount & Date */}
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <Text style={styles.invoiceNo}>#{q.invoice_number}</Text>
          <Text style={styles.customerName}>{q.bill_to?.customer_name}</Text>
          <Text style={styles.docType}>
            {isQuotation ? "Quotation" : "Tax Invoice"}
          </Text>
        </View>

        <View style={styles.headerRight}>
          <Text style={styles.amount}>{amountFormatted}</Text>
          <Text style={styles.dateText}>{formatDate(q.invoice_date)}</Text>
        </View>
      </View>

      {/* Trip Info */}
      <View style={styles.tripInfo}>
        <Text style={styles.routeText} numberOfLines={1}>
          {trip?.pickup_drop_place?.toLowerCase().replace(/\b\w/g, l => l.toUpperCase()) || "N/A"}
        </Text>
        <Text style={styles.tripDateTime}>
          {trip?.pickup_date ? formatDate(trip.pickup_date) : "N/A"} • {trip?.pickup_time || "N/A"}
        </Text>
      </View>

      {/* Action Buttons Row */}
      {pdfUrl && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => Linking.openURL(pdfUrl)}
          >
            <Ionicons name="eye-outline" size={14} color="#000" />
            {/* <Text style={styles.actionText}>View</Text> */}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate("create-quotation",{id:q?._id})} // Replace with actual edit navigation if available
          >
            <Feather name="edit-2" size={14} color="#000" />
            {/* <Text style={styles.actionText}>Edit</Text> */}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.shareBtn]}
            onPress={() => shareDocument(pdfUrl, q.invoice_number)}
          >
            <MaterialCommunityIcons name="share-variant" size={14} color="#fff" />
            {/* <Text style={styles.shareText}>Share</Text> */}
          </TouchableOpacity>

          {isQuotation && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.convertBtn]}
              onPress={() => convertToInvoice(q._id, q.invoice_number)}
              disabled={isConverting}
            >
              {isConverting ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <MaterialCommunityIcons name="swap-horizontal" size={14} color="#000" />
              )}
              <Text style={styles.actionText}>
                {isConverting ? "Converting..." : "To Invoice"}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => deleteDocument(q._id, q.invoice_number)}
          >
            <MaterialCommunityIcons name="trash-can-outline" size={16} color="#e74c3c" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
})}

            {totalPages > 1 && (
              <View style={styles.paginationContainer}>
                <TouchableOpacity
                  style={[
                    styles.pageBtn,
                    currentPage === 1 && styles.pageBtnDisabled,
                  ]}
                  onPress={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
                  disabled={currentPage === 1}
                >
                  <Ionicons
                    name="chevron-back"
                    size={20}
                    color={currentPage === 1 ? "#ccc" : "#000"}
                  />
                </TouchableOpacity>

                <View style={styles.pageInfo}>
                  <Text style={styles.pageText}>
                    Page {currentPage} of {totalPages}
                  </Text>
                  <Text style={styles.pageSubtext}>
                    Showing {startIndex + 1}-
                    {Math.min(endIndex, filteredQuotations.length)} of{" "}
                    {filteredQuotations.length}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.pageBtn,
                    currentPage === totalPages && styles.pageBtnDisabled,
                  ]}
                  onPress={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={currentPage === totalPages}
                >
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={currentPage === totalPages ? "#ccc" : "#000"}
                  />
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("create-quotation")}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>

      <Modal
        visible={showSortModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSortModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSortModal(false)}
        >
          <View style={styles.sortModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sort By</Text>
              <TouchableOpacity onPress={() => setShowSortModal(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            {sortOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={styles.sortOption}
                onPress={() => {
                  setSortBy(option.value);
                  setShowSortModal(false);
                }}
              >
                <Text
                  style={[
                    styles.sortOptionText,
                    sortBy === option.value && styles.sortOptionTextActive,
                  ]}
                >
                  {option.label}
                </Text>
                {sortBy === option.value && (
                  <Ionicons name="checkmark" size={20} color="#000" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

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
  container: { flex: 1, backgroundColor: "#fff",paddingBottom:80 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 16, fontSize: 15, color: "#777" },

  searchFilterContainer: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
    marginBottom: 12,
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 15, color: "#000" },

  filterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  filterButtons: { flexDirection: "row", gap: 8 },
  filterBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
  },
  filterBtnActive: { backgroundColor: "#000" },
  filterBtnText: { fontSize: 13, fontWeight: "600", color: "#666" },
  filterBtnTextActive: { color: "#fff" },

  sortButton: {
    padding: 8,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
  },

  resultCount: {
    fontSize: 12,
    color: "#777",
    marginTop: 8,
  },

  // ========== REWRITTEN CARD STYLES ==========
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#eee",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  headerLeft: {
    flex: 1,
  },

  headerRight: {
    alignItems: "flex-end",
  },

  invoiceNo: {
    fontSize: 17,
    fontWeight: "700",
    color: "#000",
  },

  customerName: {
    fontSize: 15,
    color: "#333",
    marginTop: 4,
  },

  docType: {
    fontSize: 13,
    fontWeight: "600",
    color: "#000",
    marginTop: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  amount: {
    fontSize: 20,
    fontWeight: "800",
    color: "#000",
  },

  dateText: {
    fontSize: 13,
    color: "#777",
    marginTop: 4,
  },

  tripInfo: {
    marginBottom: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },

  routeText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#000",
    textTransform: "capitalize",
  },

  tripDateTime: {
    fontSize: 13,
    color: "#666",
    marginTop: 6,
  },

  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginTop: 4,
  },

  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f8f8",
    borderWidth: 1,
    borderColor: "#ddd",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 2,
    width: 68,
    justifyContent: "center",
  },

  shareBtn: {
    backgroundColor: "#000",
    borderColor: "#000",
  },

  convertBtn: {
    backgroundColor: "#fff",
    borderColor: "#000",
    borderWidth: 1.5,
  },

  actionText: {
    fontSize: 8,
    fontWeight: "600",
    color: "#000",
  },

  shareText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },

  deleteBtn: {
    padding: 10,
    marginLeft: "auto",
  },

  // ========== REST OF STYLES (unchanged) ==========
  paginationContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 10,
    paddingHorizontal: 8,
  },
  pageBtn: {
    padding: 10,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
  },
  pageBtnDisabled: {
    backgroundColor: "#f9f9f9",
  },
  pageInfo: {
    alignItems: "center",
  },
  pageText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
  },
  pageSubtext: {
    fontSize: 12,
    color: "#777",
    marginTop: 2,
  },

  emptyContainer: { alignItems: "center", marginTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: "#aaa", marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: "#bbb", marginTop: 8 },

  fab: {
    position: "absolute",
    right: 20,
    bottom: 90,
    backgroundColor: "#000",
    width: 40,
    height: 40,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sortModal: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 80,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
  },
  sortOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
  },
  sortOptionText: {
    fontSize: 15,
    color: "#444",
  },
  sortOptionTextActive: {
    fontWeight: "600",
    color: "#000",
  },
});
