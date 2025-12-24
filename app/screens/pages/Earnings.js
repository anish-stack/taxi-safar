import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import useEarnings from "../../hooks/useEaraning";
import { useNavigation } from "@react-navigation/native";

const Earnings = () => {
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState("All");
  const [refreshing, setRefreshing] = useState(false);

  const navigation = useNavigation();
  const { earnings: rawEarnings, loading, refetch } = useEarnings();

  // Filter earnings based on selected date range
  const getFilteredEarnings = () => {
    if (!rawEarnings || !rawEarnings.earningsByDate) return rawEarnings;

    // If no date filter, return all data
    if (!startDate && !endDate) return rawEarnings;

    const filteredByDate = rawEarnings.earningsByDate.filter((item) => {
      const itemDate = new Date(item._id);

      if (startDate && endDate) {
        return itemDate >= new Date(startDate.setHours(0, 0, 0, 0)) &&
          itemDate <= new Date(endDate.setHours(23, 59, 59, 999));
      } else if (startDate) {
        return itemDate >= new Date(startDate.setHours(0, 0, 0, 0));
      } else if (endDate) {
        return itemDate <= new Date(endDate.setHours(23, 59, 59, 999));
      }

      return true;
    });

    // Calculate filtered summary
    const totalEarnings = filteredByDate.reduce((sum, item) => sum + item.totalEarnings, 0);
    const totalRides = filteredByDate.reduce((sum, item) => sum + item.totalRides, 0);
    const averageEarningsPerRide = totalRides > 0 ? totalEarnings / totalRides : 0;

    return {
      summary: {
        _id: null,
        totalEarnings,
        totalRides,
        averageEarningsPerRide,
      },
      earningsByDate: filteredByDate,
    };
  };

  const earnings = getFilteredEarnings();

  const formatDate = (date) =>
    date
      ? new Date(date).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
      : "Select Date";

  const handleQuickFilter = (filter) => {
    setSelectedFilter(filter);
    const today = new Date();
    let start = null;
    let end = null;

    switch (filter) {
      case "Today":
        start = new Date(today.setHours(0, 0, 0, 0));
        end = new Date();
        break;
      case "Weekly":
        start = new Date();
        start.setDate(start.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        end = new Date();
        break;
      case "Monthly":
        start = new Date();
        start.setMonth(start.getMonth() - 1);
        start.setHours(0, 0, 0, 0);
        end = new Date();
        break;
      case "All":
        start = null;
        end = null;
        break;
    }

    setStartDate(start);
    setEndDate(end);
    setShowDateFilter(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Earnings</Text>
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.filterBtn}
          onPress={() => setShowDateFilter(!showDateFilter)}
        >
          <Ionicons name="filter" size={22} color="#000" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#000000"]}
            tintColor="#000000"
          />
        }
      >
        {/* Quick Filter Tags */}
        <View style={styles.tagsContainer}>
          {["Today", "Weekly", "Monthly", "All"].map((filter) => (
            <TouchableOpacity
              key={filter}
              activeOpacity={0.7}
              style={[
                styles.tag,
                selectedFilter === filter && styles.tagActive,
              ]}
              onPress={() => handleQuickFilter(filter)}
            >
              <Text
                style={[
                  styles.tagText,
                  selectedFilter === filter && styles.tagTextActive,
                ]}
              >
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Custom Date Filter */}
        {showDateFilter && (
          <View style={styles.dateFilterContainer}>
            <Text style={styles.filterLabel}>Custom Date Range</Text>
            <View style={styles.dateRow}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.dateInput}
                onPress={() => setShowStartPicker(true)}
              >
                <Text style={styles.dateLabel}>From</Text>
                <Text style={styles.dateValue}>{formatDate(startDate)}</Text>
              </TouchableOpacity>

              <View style={styles.dateSeparator} />

              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.dateInput}
                onPress={() => setShowEndPicker(true)}
              >
                <Text style={styles.dateLabel}>To</Text>
                <Text style={styles.dateValue}>{formatDate(endDate)}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.applyBtn}
              onPress={() => setShowDateFilter(false)}
            >
              <Text style={styles.applyText}>Apply Filter</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Date Pickers */}
        {showStartPicker && (
          <DateTimePicker
            value={startDate || new Date()}
            mode="date"
            onChange={(e, date) => {
              setShowStartPicker(false);
              if (date) setStartDate(date);
            }}
          />
        )}

        {showEndPicker && (
          <DateTimePicker
            value={endDate || new Date()}
            mode="date"
            onChange={(e, date) => {
              setShowEndPicker(false);
              if (date) setEndDate(date);
            }}
          />
        )}

        {/* Loading */}
        {loading && !refreshing && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#000" />
          </View>
        )}

        {/* Summary Card */}
        {!loading && earnings?.summary && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Total Earnings</Text>
            <Text style={styles.summaryAmount}>
              ₹{earnings.summary.totalEarnings.toLocaleString("en-IN")}
            </Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {earnings.summary.totalRides}
                </Text>
                <Text style={styles.statLabel}>Total Rides</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  ₹{Math.round(earnings.summary.averageEarningsPerRide)}
                </Text>
                <Text style={styles.statLabel}>Avg per Ride</Text>
              </View>
            </View>
          </View>
        )}

        {/* Earnings by Date */}
        {!loading && earnings?.earningsByDate && earnings.earningsByDate.length > 0 && (
          <View style={styles.listContainer}>
            <Text style={styles.listTitle}>Earnings Breakdown</Text>
            {earnings.earningsByDate.map((item) => (
              <View key={item._id} style={styles.listItem}>
                <View style={styles.listLeft}>
                  <Text style={styles.itemDate}>{item._id}</Text>
                  <Text style={styles.itemRides}>{item.totalRides} rides</Text>
                </View>
                <Text style={styles.itemAmount}>
                  ₹{item.totalEarnings.toLocaleString("en-IN")}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Empty State */}
        {!loading && (!earnings?.earningsByDate || earnings.earningsByDate.length === 0) && (
          <View style={styles.emptyState}>
            <Ionicons name="wallet-outline" size={64} color="#CCCCCC" />
            <Text style={styles.emptyText}>No earnings data available</Text>
            <Text style={styles.emptySubtext}>
              Pull down to refresh or try a different date range
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default Earnings;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F5F6"

  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
    backgroundColor: "#fff",
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
  },
  filterBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  tagsContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 10,
  },
  tag: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#000000",
    backgroundColor: "#FFFFFF",
  },
  tagActive: {
    backgroundColor: "#000000",
  },
  tagText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000000",
  },
  tagTextActive: {
    color: "#FFFFFF",
  },
  dateFilterContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    backgroundColor: "#F8F8F8",
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
    color: "#000000",
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  dateInput: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  dateSeparator: {
    width: 12,
  },
  dateLabel: {
    fontSize: 12,
    color: "#666666",
    marginBottom: 4,
  },
  dateValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000000",
  },
  applyBtn: {
    backgroundColor: "#000000",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  applyText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  summaryCard: {
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: 20,
    padding: 20,
    borderRadius: 12,
    backgroundColor: "#fff",
  },
  summaryTitle: {
    fontSize: 14,
    color: "#000",
    marginBottom: 8,
  },
  summaryAmount: {
    fontSize: 36,
    fontWeight: "700",
    color: "#000",
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#000",
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: "#000",
  },
  listContainer: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
    color: "#000000",
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    backgroundColor: "#F8F8F8",
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  listLeft: {
    flex: 1,
  },
  itemDate: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 4,
  },
  itemRides: {
    fontSize: 12,
    color: "#666666",
  },
  itemAmount: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000000",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666666",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999999",
    textAlign: "center",
  },
});