import React from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native";
import Icon from "react-native-vector-icons/Ionicons";

import mini from "../../assets/mini.png";
import sedan from "../../assets/sedan.jpeg";
import suv from "../../assets/suv.png";

// Status config — just mapping your enum to nice badge
const STATUS_CONFIG = {
  searching: { label: "Searching Driver", color: "#F59E0B", icon: "search-outline" },
  reserved: { label: "Reserved", color: "#8B5CF6", icon: "calendar-outline" },
  driver_assigned: { label: "Driver Assigned", color: "#3B82F6", icon: "car-outline" },
  driver_arrived: { label: "Driver Arrived", color: "#10B981", icon: "checkmark-circle" },
  trip_started: { label: "Trip Started", color: "#06B6D4", icon: "navigate" },
  trip_completed: { label: "Completed", color: "#10B981", icon: "checkmark-done" },
  cancelled_by_user: { label: "Cancelled (User)", color: "#EF4444", icon: "close-circle" },
  cancelled_by_driver: { label: "Cancelled (Driver)", color: "#EF4444", icon: "close-circle" },
  cancelled_by_system: { label: "Cancelled (System)", color: "#6B7280", icon: "alert-circle" },
  no_driver_found: { label: "No Driver Found", color: "#DC2626", icon: "car-sport-outline" },
};

const RideCard = ({
  name = "Dharmendra T.",
  rating = 4.8,
  vehicleType = "mini",
  totalRatings = 127,
  price = "6000",
  original_tryipType,
  startDate = "08 March, 2025",
  status,
  startTime = "07:00 PM",
  endDate = "09 March, 2025",
  endTime = "07:00 PM",
  tripType = "One way",
  pickup = "220 Yonge St, Toronto, ON M5B 2H1, Delhi",
  drop = "17600 Yonge St, Newmarket, ON L3Y 4Z1, Delhi",
  distance = "105",
  onPress,
}) => {
  const vehicleImage =
    vehicleType === "mini"
      ? mini
      : vehicleType === "sedan"
      ? sedan
      : vehicleType === "suv"
      ? suv
      : mini;

  const statusInfo = STATUS_CONFIG[status] || {
    label: status?.replace(/_/g, " ")?.toUpperCase() || "UNKNOWN",
    color: "#6B7280",
    icon: "help-outline",
  };

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={styles.card}>
      {/* TOP HEADER */}
      <View style={styles.rowBetween}>
        <View style={styles.row}>
          <View style={styles.avatar}>
            <Image source={vehicleImage} style={styles.vehicleImg} />
          </View>

          <View>
            <Text style={styles.name}>{name}</Text>

            <View style={styles.row}>
              <Icon name="star" size={16} color="#ffb300" />
              <Text style={styles.rating}>{rating}</Text>
              <Text style={styles.ratingCount}>({totalRatings})</Text>
            </View>
          </View>
        </View>

        <Text style={styles.price}>₹{price}</Text>
      </View>

      {/* ONLY ADDED: Status Badge */}
      <View style={styles.statusWrapper}>
        <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + "20" }]}>
          <Icon name={statusInfo.icon} size={15} color={statusInfo.color} />
          <Text style={[styles.statusText, { color: statusInfo.color }]}>
            {statusInfo.label}
          </Text>
        </View>
      </View>

      {/* DATE SECTION (unchanged) */}
      {original_tryipType === "oneWay" ? (
        <View style={styles.roundSection}>
          <View>
            <Text style={styles.date}>{startDate}</Text>
          </View>

          <View style={styles.dotLine} />

          <View>
            <Text style={styles.time}>{startTime}</Text>
          </View>
        </View>
      ) : (
        <View style={styles.roundSection}>
          <View>
            <Text style={styles.date}>{startDate}</Text>
            <Text style={styles.time}>{startTime}</Text>
          </View>

          <View style={styles.dotLine} />

          <View>
            <Text style={styles.date}>{endDate}</Text>
            <Text style={styles.time}>{endTime}</Text>
          </View>
        </View>
      )}

      {/* ADDRESS SECTION (unchanged) */}
      <View style={styles.addressBox}>
        <View style={styles.row}>
          <Icon name="navigate-outline" size={18} color="#555" />
          <Text style={styles.address}>{pickup}</Text>
        </View>

        <View style={styles.centerTag}>
          <Text style={styles.tripTag}>
            {tripType} Trip - {distance} km
          </Text>
        </View>

        <View style={styles.row}>
          <Icon name="location-outline" size={18} color="#555" />
          <Text style={styles.address}>{drop}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default RideCard;

/* ---------------------------- STYLES (only added status styles) ---------------------------- */
const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 18,
    marginVertical: 12,
    marginHorizontal: 6,
  },

  row: { flexDirection: "row", alignItems: "center" },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#f7f7f7",
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  vehicleImg: {
    width: 40,
    height: 40,
    resizeMode: "contain",
  },

  name: {
    fontSize: 16,
    fontWeight: "600",
    color: "#222",
  },
  rating: {
    marginLeft: 4,
    fontWeight: "600",
    color: "#333",
  },
  ratingCount: {
    marginLeft: 4,
    color: "#777",
  },
  price: {
    fontSize: 22,
    fontWeight: "700",
    color: "#e53935",
  },

  // ONLY NEW STYLES BELOW
  statusWrapper: {
    marginTop: 12,
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
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

  // Rest of your original styles (unchanged)
  roundSection: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fafafa",
    padding: 14,
    borderRadius: 12,
  },
  dotLine: {
    width: 50,
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 1,
    borderColor: "#aaa",
  },
  date: {
    fontSize: 15,
    color: "#444",
  },
  time: {
    fontSize: 15,
    marginTop: 2,
    fontWeight: "700",
    color: "#111",
  },
  addressBox: {
    backgroundColor: "#f4f4f4",
    borderRadius: 14,
    padding: 14,
    marginTop: 20,
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
    fontSize: 12,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 14,
  },
});