import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import mini from '../../assets/mini.png';
import sedan from '../../assets/sedan.jpeg';
import suv from '../../assets/suv.png';
import { useNavigation } from "@react-navigation/native";

// Status badge configuration
const STATUS_CONFIG = {
  pending: { label: "Pending", color: "#F59E0B", icon: "time-outline" },
  "driver-assigned": { label: "Driver Assigned", color: "#3B82F6", icon: "car-outline" },
  "driver-accepted": { label: "Accepted", color: "#10B981", icon: "checkmark-circle" },
  "driver-rejected": { label: "Rejected", color: "#EF4444", icon: "close-circle" },
  completed: { label: "Completed", color: "#10B981", icon: "checkmark-done" },
  "cancelled-by-customer": { label: "Cancelled (Customer)", color: "#EF4444", icon: "person-outline" },
  "cancelled-by-driver": { label: "Cancelled (Driver)", color: "#EF4444", icon: "car-outline" },
  "cancelled-by-admin": { label: "Cancelled (Admin)", color: "#6B7280", icon: "shield-outline" },
  "no-show": { label: "No Show", color: "#DC2626", icon: "walk-outline" },
  failed: { label: "Failed", color: "#991B1B", icon: "alert-circle" },
};

export default function DriverPost({
  _id,
  vehicleName = "Maruti WagonR",
  assignedStatus = "Not Assigned",
  assignedColor = "#d4a017",
  vehicleType = "mini",
  totalAmount = "₹8,000",
  status = "pending", // your new status enum
  commission = "₹2,000",
  driverEarning = "₹6,000",
  pickup = "220 Yonge St, Toronto, ON M5B 2H1, Delhi",
  drop = "17600 Yonge St, Newmarket, ON L3Y 4Z1, Delhi",
  tripType = "One way Trip - 60 km",
  date = "08 Mar, 2025",
  time = "07:00 PM",
  onChatPress = () => {},
}) {
  const navigation = useNavigation();

  const vehicleImage =
    vehicleType === "mini"
      ? mini
      : vehicleType === "sedan"
      ? sedan
      : vehicleType === "suv"
      ? suv
      : mini;

  const statusInfo = STATUS_CONFIG[status] || {
    label: status?.replace(/-/g, " ")?.toUpperCase() || "UNKNOWN",
    color: "#6B7280",
    icon: "help-outline",
  };

  return (
    <View style={styles.card}>
      {/* TOP ROW */}
   
      <View style={styles.topRow}>
        <View style={styles.row}>
          <View style={styles.vehicleIconBox}>
            <Image source={vehicleImage} style={styles.vehicleIcon} />
          </View>
          <View>
            <Text style={styles.vehicleName}>{vehicleName}</Text>
            <Text style={[styles.assignText, { color: assignedColor }]}>
              {assignedStatus}
            </Text>
          </View>
        </View>

        <View>
          <Text style={styles.date}>{date}</Text>
          <Text style={styles.time}>{time}</Text>
        </View>
      </View>

      {/* NEW: Status Badge */}
      <View style={styles.statusWrapper}>
        <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + "22" }]}>
          <Icon name={statusInfo.icon} size={15} color={statusInfo.color} />
          <Text style={[styles.statusText, { color: statusInfo.color }]}>
            {statusInfo.label}
          </Text>
        </View>
      </View>

      {/* AMOUNT SECTION */}
      <View style={styles.amountRow}>
        <View style={styles.amountBox}>
          <Text style={styles.amountValue}>{totalAmount}</Text>
          <Text style={styles.amountLabel}>Total Amount</Text>
        </View>

        <View style={styles.amountBox}>
          <Text style={styles.amountValue}>{commission}</Text>
          <Text style={styles.amountLabel}>Commission</Text>
        </View>

        <View style={styles.amountBox}>
          <Text style={styles.amountValue}>{driverEarning}</Text>
          <Text style={styles.amountLabel}>Driver Earning</Text>
        </View>
      </View>

      {/* ADDRESS BLOCK */}
      <View style={styles.addressBox}>
        <View style={styles.row}>
          <Icon name="navigate-outline" size={18} color="#444" />
          <Text style={styles.address}>{pickup}</Text>
        </View>

        <View style={styles.centerTag}>
          <Text style={styles.tripTag}>{tripType}</Text>
        </View>

        <View style={styles.row}>
          <Icon name="location-outline" size={18} color="#444" />
          <Text style={styles.address}>{drop}</Text>
        </View>
      </View>

      {/* CHAT BUTTON */}
      <TouchableOpacity
        style={styles.chatBtn}
        onPress={() => navigation.navigate("DriverPostDetails", { rideId: _id })}
      >
        <Icon name="chatbubble-ellipses" size={20} color="#fff" />
        <Text style={styles.chatBtnText}>
          {assignedStatus === "driver-assigned" ? "View Details" : "Chat with Drivers"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

/* -------------------------------------------------------- */
/*                           STYLES                          */
/* -------------------------------------------------------- */

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 22,
    marginHorizontal: 6,
    marginVertical: 0,
  },

  row: { flexDirection: "row", alignItems: "center" },

  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  vehicleIconBox: {
    width: 50,
    height: 50,
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },

  vehicleIcon: {
    width: 40,
    height: 40,
    resizeMode: "contain",
  },

  vehicleName: {
    fontSize: 17,
    fontWeight: "600",
    color: "#222",
  },

  assignText: {
    marginTop: 4,
    textTransform: "capitalize",
    fontSize: 14,
    fontWeight: "500",
  },

  date: {
    fontSize: 14,
    color: "#444",
    textAlign: "right",
  },

  time: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111",
    textAlign: "right",
  },

  // ONLY NEW STYLES: Status Badge
  statusWrapper: {
    marginBottom: 14,
    alignItems: "flex-start",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusText: {
    fontSize: 12.5,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

  amountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    marginBottom: 16,
  },

  amountBox: {
    alignItems: "center",
    flex: 1,
  },

  amountValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#d32f2f",
  },

  amountLabel: {
    fontSize: 12,
    color: "#555",
    marginTop: 4,
  },

  addressBox: {
    backgroundColor: "#f2f2f2",
    padding: 14,
    borderRadius: 14,
  },

  address: {
    flex: 1,
    marginLeft: 8,
    color: "#333",
    fontSize: 14,
    lineHeight: 18,
  },

  centerTag: {
    alignItems: "center",
    marginVertical: 10,
  },

  tripTag: {
    backgroundColor: "#000",
    color: "#fff",
    paddingVertical: 6,
    textTransform: "capitalize",
    paddingHorizontal: 54,
    borderRadius: 14,
    fontSize: 13,
  },

  chatBtn: {
    backgroundColor: "#e53935",
    paddingVertical: 14,
    marginTop: 18,
    borderRadius: 18,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },

  chatBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 10,
  },
});