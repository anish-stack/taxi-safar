// screens/wallet/WalletScreen.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Modal,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowRight,
  Plus,
  Wallet as WalletIcon,
  Lock,
  IndianRupee,
  X,
  Clock,
  Calendar,
  Filter,
  TrendingUp,
  TrendingDown,
} from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import axios from "axios";

import { API_URL_APP } from "../../constant/api";
import loginStore from "../../store/auth.store";
import Layout from "../common/layout";
import { UniversalAlert } from "../common/UniversalAlert";
import { formatDate, formatTimeByDate } from "../../utils/utils";

const WalletScreen = () => {
  const navigation = useNavigation();
  const { token } = loginStore();

  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState("all");

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    type: "success",
    title: "",
    message: "",
  });

  const showAlert = (type, title, message) => {
    setAlertConfig({ type, title, message });
    setAlertVisible(true);
  };

  const fetchWallet = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);

      const [walletRes, txRes] = await Promise.all([
        axios.get(`${API_URL_APP}/api/v1/wallet/details`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_URL_APP}/api/v1/wallet/transactions?limit=100`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (walletRes.data.success) {
        setWallet(walletRes.data.data);
      }

      if (txRes.data.success) {
        setTransactions(txRes.data.data.transactions);
        setFilteredTransactions(txRes.data.data.transactions);
      }
    } catch (err) {
      showAlert(
        "error",
        "Failed to Load Wallet",
        err.response?.data?.message || "Please try again"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWallet();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchWallet(true);
  };

  const handleWithdraw = () => {
    if (!wallet || wallet.availableBalance < 100) {
      showAlert(
        "warning",
        "Cannot Withdraw",
        "Minimum withdrawal is ₹100 and must be available (not locked)"
      );
      return;
    }
    navigation.navigate("WithdrawScreen");
  };

  const openTransactionDetails = (transaction) => {
    setSelectedTransaction(transaction);
    setDetailsVisible(true);
  };

  const applyFilter = (filter) => {
    setSelectedFilter(filter);
    setFilterVisible(false);

    if (filter === "all") {
      setFilteredTransactions(transactions);
    } else if (filter === "credit") {
      setFilteredTransactions(
        transactions.filter((tx) => tx.type === "credit")
      );
    } else if (filter === "debit") {
      setFilteredTransactions(transactions.filter((tx) => tx.type === "debit"));
    } else if (filter === "completed") {
      setFilteredTransactions(
        transactions.filter((tx) => tx.status === "completed")
      );
    } else if (filter === "pending") {
      setFilteredTransactions(
        transactions.filter((tx) => tx.status === "pending")
      );
    }
  };

  if (loading) {
    return (
      <Layout>
        <SafeAreaView style={styles.container}>
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#DC2626" />
            <Text style={styles.loadingText}>Loading wallet...</Text>
          </View>
        </SafeAreaView>
      </Layout>
    );
  }

  const totalLocked = wallet?.totalLocked || 0;
  const availableBalance = wallet?.balance || 0;
  const totalEarnings = wallet?.totalEarnings || 0;
  const totalWithdrawals = wallet?.totalWithdrawals || 0;
  const pendingSettlement = wallet?.pendingSettlement || 0;

  return (
    <Layout showHeader={true} title="My Wallet">
      <SafeAreaView style={styles.container}>
        <FlatList
          data={filteredTransactions}
          keyExtractor={(item) => item._id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#DC2626"]}
            />
          }
          ListHeaderComponent={
            <>
              {/* Wallet Balance Card */}
              <View style={styles.balanceCard}>
                <View style={styles.balanceHeader}>
                  <WalletIcon size={32} color="#FFF" />
                  <Text style={styles.balanceTitle}>Wallet Balance</Text>
                </View>

                <Text style={styles.mainBalance}>
                  ₹{wallet?.balance?.toLocaleString() || "0"}
                </Text>

                <View style={styles.balanceBreakdown}>
                  <View style={styles.breakdownItem}>
                    <IndianRupee size={20} color="#10B981" />
                    <Text style={styles.breakdownLabel}>Available</Text>
                    <Text style={[styles.breakdownValue, styles.availableText]}>
                      ₹{availableBalance.toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.breakdownItem}>
                    <Lock size={20} color="#F59E0B" />
                    <Text style={styles.breakdownLabel}>Locked</Text>
                    <Text style={styles.breakdownValue}>
                      ₹{totalLocked.toLocaleString()}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Wallet Stats */}
              <View style={styles.statsContainer}>
                <View style={styles.statCard}>
                  <TrendingDown size={24} color="#EF4444" />
                  <Text style={styles.statLabel}>Withdrawals</Text>
                  <Text style={styles.statValue}>
                    ₹{totalWithdrawals.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.statCard}>
                  <Clock size={24} color="#F59E0B" />
                  <Text style={styles.statLabel}>Pending</Text>
                  <Text style={styles.statValue}>
                    ₹{pendingSettlement.toLocaleString()}
                  </Text>
                </View>
              </View>

              {/* Locked Amounts Details */}
              {wallet?.lockAmounts && wallet.lockAmounts.length > 0 && (
                <View style={styles.lockedSection}>
                  <Text style={styles.lockedTitle}>Locked Amounts</Text>
                  {wallet.lockAmounts.map((lock, index) => (
                    <View key={lock._id || index} style={styles.lockedItem}>
                      <Lock size={18} color="#F59E0B" />
                      <View style={styles.lockedDetails}>
                        <Text style={styles.lockedAmount}>
                          ₹{lock.amount_lock?.toLocaleString()}
                        </Text>
                        <Text style={styles.lockedDate}>
                          Locked: {new Date(lock.lockedAt).toLocaleDateString()}
                        </Text>
                        {lock.forRide && (
                          <Text style={styles.lockedRide}>
                            Ride ID: {lock.forRide}
                          </Text>
                        )}
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          lock.isReleased
                            ? styles.releasedBadge
                            : styles.activeBadge,
                        ]}
                      >
                        <Text style={styles.statusText}>
                          {lock.isReleased ? "Released" : "Active"}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => navigation.navigate("recharge")}
                >
                  <Plus size={24} color="#DC2626" />
                  <Text style={styles.actionText}>Add Money</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    availableBalance < 100 && styles.disabledButton,
                  ]}
                  onPress={handleWithdraw}
                  disabled={availableBalance < 100}
                >
                  <IndianRupee size={24} color="#6366F1" />
                  <Text style={styles.actionText}>Withdraw</Text>
                </TouchableOpacity>
              </View>

              {/* Transactions Header with Filter */}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  All Transactions ({filteredTransactions.length})
                </Text>
                <TouchableOpacity
                  style={styles.filterButton}
                  onPress={() => setFilterVisible(true)}
                >
                  <Filter size={20} color="#DC2626" />
                  <Text style={styles.filterText}>Filter</Text>
                </TouchableOpacity>
              </View>

              {selectedFilter !== "all" && (
                <View style={styles.activeFilter}>
                  <Text style={styles.activeFilterText}>
                    Filter: {selectedFilter.toUpperCase()}
                  </Text>
                  <TouchableOpacity onPress={() => applyFilter("all")}>
                    <X size={16} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              )}
            </>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.transactionItem}
              onPress={() => openTransactionDetails(item)}
            >
              <View
                style={[
                  styles.txIcon,
                  item.type === "debit" && styles.txIconDebit,
                ]}
              >
                {item.type === "credit" ? (
                  <Plus size={20} color="#10B981" />
                ) : (
                  <Text style={styles.minus}>-</Text>
                )}
              </View>
              <View style={styles.txDetails}>
                <Text style={styles.txDescription}>{item.description}</Text>
                <Text style={styles.txDate}>
                  {new Date(item.createdAt).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
                <View
                  style={[
                    styles.statusBadgeSmall,
                    item.status === "completed"
                      ? styles.completedBadge
                      : styles.pendingBadge,
                  ]}
                >
                  <Text style={styles.statusTextSmall}>
                    {item.status.toUpperCase()}
                  </Text>
                </View>
              </View>
              <View style={styles.txRight}>
                <Text
                  style={[
                    styles.txAmount,
                    item.type === "credit"
                      ? styles.creditAmount
                      : styles.debitAmount,
                  ]}
                >
                  {item.type === "credit" ? "+" : "-"}₹
                  {item.amount.toLocaleString()}
                </Text>
                <ArrowRight size={16} color="#9CA3AF" />
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <WalletIcon size={60} color="#9CA3AF" />
              <Text style={styles.emptyText}>No transactions found</Text>
              <Text style={styles.emptySubtext}>
                {selectedFilter !== "all"
                  ? "Try changing your filter"
                  : "Your wallet activity will appear here"}
              </Text>
            </View>
          }
        />

        {/* Transaction Details Modal */}
        <Modal
          visible={detailsVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setDetailsVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Transaction Details</Text>
                <TouchableOpacity onPress={() => setDetailsVisible(false)}>
                  <X size={24} color="#111827" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                {selectedTransaction && (
                  <>
                    <View style={styles.detailCard}>
                      <View
                        style={[
                          styles.detailAmountBadge,
                          selectedTransaction.type === "credit"
                            ? styles.creditBg
                            : styles.debitBg,
                        ]}
                      >
                        <Text style={styles.detailAmount}>
                          {selectedTransaction.type === "credit" ? "+" : "-"}₹
                          {selectedTransaction.amount.toLocaleString()}
                        </Text>
                      </View>
                      <Text style={styles.detailDescription}>
                        {selectedTransaction.description}
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Type</Text>
                      <Text
                        style={[
                          styles.detailValue,
                          styles.detailBadge,
                          selectedTransaction.type === "credit"
                            ? styles.creditBadge
                            : styles.debitBadge,
                        ]}
                      >
                        {selectedTransaction.type.toUpperCase()}
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Status</Text>
                      <Text
                        style={[
                          styles.detailValue,
                          styles.detailBadge,
                          selectedTransaction.status === "completed"
                            ? styles.completedBadge
                            : styles.pendingBadge,
                        ]}
                      >
                        {selectedTransaction.status.toUpperCase()}
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Date & Time</Text>
                      <Text style={styles.detailValue}>
                        {formatDate(selectedTransaction.createdAt)}{" "}
                        {formatTimeByDate(selectedTransaction.createdAt)}
                      </Text>
                    </View>

                    {selectedTransaction.completedAt && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Completed At</Text>
                        <Text style={styles.detailValue}>
                          {formatDate(selectedTransaction.completedAt)}{" "}
                          {formatTimeByDate(selectedTransaction.completedAt)}
                        </Text>
                      </View>
                    )}

                    {selectedTransaction.paymentMethod && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Payment Method</Text>
                        <Text style={styles.detailValue}>
                          {selectedTransaction.paymentMethod.toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </>
                )}
              </ScrollView>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setDetailsVisible(false)}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Filter Modal */}
        <Modal
          visible={filterVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setFilterVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.filterModal}>
              <Text style={styles.filterModalTitle}>Filter Transactions</Text>
              {["all", "credit", "debit", "completed", "pending"].map(
                (filter) => (
                  <TouchableOpacity
                    key={filter}
                    style={[
                      styles.filterOption,
                      selectedFilter === filter && styles.filterOptionActive,
                    ]}
                    onPress={() => applyFilter(filter)}
                  >
                    <Text
                      style={[
                        styles.filterOptionText,
                        selectedFilter === filter &&
                          styles.filterOptionTextActive,
                      ]}
                    >
                      {filter.charAt(0).toUpperCase() + filter.slice(1)}
                    </Text>
                  </TouchableOpacity>
                )
              )}
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setFilterVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Universal Alert */}
        <UniversalAlert
          visible={alertVisible}
          onClose={() => setAlertVisible(false)}
          type={alertConfig.type}
          title={alertConfig.title}
          message={alertConfig.message}
        />
      </SafeAreaView>
    </Layout>
  );
};

export default WalletScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 16, fontSize: 16, color: "#6B7280" },

  // Balance Card
  balanceCard: {
    backgroundColor: "#DC2626",
    margin: 16,
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 0.3,
  },
  balanceHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  balanceTitle: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 12,
  },
  mainBalance: {
    color: "#FFF",
    fontSize: 48,
    fontWeight: "800",
    marginVertical: 8,
    letterSpacing: 0.5,
  },
  balanceBreakdown: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 20,
  },
  breakdownItem: { alignItems: "center", flex: 1 },
  breakdownLabel: { color: "#FFF", fontSize: 13, opacity: 0.9, marginTop: 6 },
  breakdownValue: {
    color: "#FFF",
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 4,
  },
  availableText: { color: "#10B981" },

  // Stats Cards
  statsContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFF",
    padding: 18,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 0.3,
  },
  statLabel: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 10,
    textAlign: "center",
  },
  statValue: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#111827",
    marginTop: 6,
  },

  // Locked Amounts Section
  lockedSection: {
    backgroundColor: "#FFF",
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 0.3,
  },
  lockedTitle: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 14,
  },
  lockedItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBEB",
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: "#FDE68A",
  },
  lockedDetails: { flex: 1, marginLeft: 12 },
  lockedAmount: { fontSize: 17, fontWeight: "bold", color: "#D97706" },
  lockedDate: { fontSize: 13, color: "#92400E", marginTop: 4 },
  lockedRide: { fontSize: 12, color: "#78716C", marginTop: 4 },

  // Status Badges
  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  activeBadge: {
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  releasedBadge: {
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  statusText: { fontSize: 12, fontWeight: "bold", color: "#92400E" },

  // Action Buttons
  actionRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 16,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    backgroundColor: "#FFF",
    paddingVertical: 22,
    borderRadius: 18,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 0.3,
  },
  disabledButton: { opacity: 0.6 },
  actionText: { fontSize: 17, fontWeight: "bold", color: "#111827" },

  // Transactions Header
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 19, fontWeight: "bold", color: "#111827" },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  filterText: { color: "#DC2626", fontWeight: "bold", fontSize: 15 },

  activeFilter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FEE2E2",
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  activeFilterText: { color: "#DC2626", fontWeight: "bold", fontSize: 15 },

  // Transaction Item
  transactionItem: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 18,
    borderRadius: 18,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 0.3,
  },
  txIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F0FDF4",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  txIconDebit: { backgroundColor: "#FEF2F2" },
  minus: { fontSize: 28, color: "#EF4444", fontWeight: "bold" },
  txDetails: { flex: 1 },
  txDescription: { fontSize: 16, fontWeight: "600", color: "#111827" },
  txDate: { fontSize: 13, color: "#6B7280", marginTop: 6 },
  statusBadgeSmall: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  completedBadge: { backgroundColor: "#ECFDF5" },
  pendingBadge: { backgroundColor: "#FEF3C7" },
  statusTextSmall: { fontSize: 11, fontWeight: "bold", color: "#065F46" },

  txRight: { alignItems: "flex-end" },
  txAmount: { fontSize: 17, fontWeight: "bold", marginBottom: 4 },
  creditAmount: { color: "#10B981" },
  debitAmount: { color: "#EF4444" },

  // Empty State
  emptyContainer: { alignItems: "center", paddingVertical: 80 },
  emptyText: {
    fontSize: 19,
    fontWeight: "600",
    color: "#374151",
    marginTop: 24,
  },
  emptySubtext: {
    fontSize: 15,
    color: "#9CA3AF",
    marginTop: 10,
    textAlign: "center",
    paddingHorizontal: 40,
  },

  // Modal Overlay
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },

  // Transaction Details Modal
  modalContent: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    width: "92%",
    maxHeight: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 0.3,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
  },
  modalTitle: { fontSize: 20, fontWeight: "bold", color: "#111827" },
  modalBody: { padding: 20 },
  detailCard: {
    backgroundColor: "#F9FAFB",
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 20,
  },
  detailAmountBadge: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 16,
    marginBottom: 12,
  },
  creditBg: { backgroundColor: "#D1FAE5" },
  debitBg: { backgroundColor: "#FEE2E2" },
  detailAmount: { fontSize: 24, fontWeight: "bold", color: "#111827" },
  detailDescription: { fontSize: 16, color: "#4B5563", textAlign: "center" },

  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: "#F3F4F6",
  },
  detailLabel: { fontSize: 15, color: "#6B7280" },
  detailValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    flex: 0.6,
    textAlign: "right",
  },
  detailBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: "flex-end",
  },
  creditBadge: { backgroundColor: "#D1FAE5", color: "#065F46" },
  debitBadge: { backgroundColor: "#FEE2E2", color: "#991B1B" },

  closeButton: {
    backgroundColor: "#DC2626",
    marginHorizontal: 20,
    marginVertical: 16,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  closeButtonText: { color: "#FFF", fontSize: 17, fontWeight: "bold" },

  // Filter Modal
  filterModal: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 24,
    width: "85%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 0.3,
  },
  filterModalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
    textAlign: "center",
    marginBottom: 20,
  },
  filterOption: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 14,
    marginBottom: 10,
    backgroundColor: "#F3F4F6",
  },
  filterOptionActive: {
    backgroundColor: "#DC2626",
  },
  filterOptionText: {
    fontSize: 17,
    color: "#374151",
    textAlign: "center",
    fontWeight: "600",
  },
  filterOptionTextActive: {
    color: "#FFF",
  },
  cancelButton: {
    marginTop: 10,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    color: "#374151",
    fontWeight: "600",
  },
});
