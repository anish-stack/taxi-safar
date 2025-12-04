import React from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native";
import Icon from "react-native-vector-icons/Ionicons";

import mini from "../../assets/mini.png";
import sedan from "../../assets/sedan.jpeg";
import suv from "../../assets/suv.png";

const STATUS_CONFIG = {
  searching: {
    label: "Searching Driver",
    color: "#F59E0B",
    icon: "search-outline",
  },
  reserved: { label: "Reserved", color: "#8B5CF6", icon: "calendar-outline" },
  driver_assigned: {
    label: "Driver Assigned",
    color: "#3B82F6",
    icon: "car-outline",
  },
  driver_arrived: {
    label: "Driver Arrived",
    color: "#10B981",
    icon: "checkmark-circle",
  },
  trip_started: { label: "Trip Started", color: "#06B6D4", icon: "navigate" },
  trip_completed: {
    label: "Completed",
    color: "#10B981",
    icon: "checkmark-done",
  },
  cancelled_by_user: {
    label: "Cancelled",
    color: "#EF4444",
    icon: "close-circle",
  },
  cancelled_by_driver: {
    label: "Cancelled",
    color: "#EF4444",
    icon: "close-circle",
  },
  cancelled_by_system: {
    label: "Cancelled",
    color: "#6B7280",
    icon: "alert-circle",
  },
  no_driver_found: {
    label: "No Driver Found",
    color: "#DC2626",
    icon: "car-sport-outline",
  },
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
    vehicleType === "mini" ? mini : vehicleType === "sedan" ? sedan : suv;

  const shortenAddress = (address) => {
    if (!address) return "";

    const parts = address.split(",").map((x) => x.trim());

    // take last 4 meaningful parts
    const shortParts = parts.slice(-4);

    return shortParts.join(", ");
  };

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={styles.card}>
      {/* TOP ROW: Name + Rating + Price */}
      <View style={styles.topRow}>
        <View style={styles.row}>
          <View style={styles.avatar}>
            <Image source={vehicleImage} style={styles.vehicleImg} />
          </View>
          <View>
            <Text style={styles.name}>{name}</Text>
            <View style={styles.ratingRow}>
              <Icon name="star" size={14} color="#ffb300" />
              <Text style={styles.rating}>{rating}</Text>
              <Text style={styles.ratingCount}>({totalRatings})</Text>
            </View>
          </View>
        </View>
        <Text style={styles.price}>₹{price}</Text>
      </View>

      {/* DATE & TIME - Compact */}
      <View style={styles.dateSection}>
        {original_tryipType === "oneWay" ? (
          <>
            <Text style={styles.dateTime}>{startDate}</Text>
            <View style={styles.dotLine} />
            <Text style={styles.dateTime}>{startTime}</Text>
          </>
        ) : (
          <>
            <View>
              <Text style={styles.dateTime}>{startDate}</Text>
              <Text style={styles.dateTimeSmall}>{startTime}</Text>
            </View>
            <View style={styles.dotLine} />
            <View>
              <Text style={styles.dateTime}>{endDate}</Text>
              <Text style={styles.dateTimeSmall}>{endTime}</Text>
            </View>
          </>
        )}
      </View>

      {/* ADDRESS + TRIP TAG */}
      <View style={styles.addressBox}>
        <View style={styles.addressRow}>
          <Icon name="navigate-outline" size={16} color="#666" />
          <Text style={styles.address} numberOfLines={1}>
            {" "}
            {shortenAddress(pickup)}
          </Text>
        </View>

        <View style={styles.tripTagContainer}>
          <Text style={styles.tripTag}>
            {tripType} • {distance} km
          </Text>
        </View>

        <View style={styles.addressRow}>
          <Icon name="location-outline" size={16} color="#666" />
          <Text style={styles.address} numberOfLines={1}>
            {" "}
            {shortenAddress(drop)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default RideCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    padding: 14, // कम किया
    borderRadius: 16,
    marginVertical: 16, // कम किया (12 → 6)
    marginHorizontal: 8,
    elevation: .4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },

  row: { flexDirection: "row", alignItems: "center" },

  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8, // कम किया
  },

  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f9f9f9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10, // कम किया
  },
  vehicleImg: {
    width: 34,
    height: 34,
    resizeMode: "contain",
  },

  name: {
    fontSize: 15,
    fontWeight: "600",
    color: "#222",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  rating: {
    marginLeft: 4,
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
  },
  ratingCount: {
    marginLeft: 4,
    fontSize: 12,
    color: "#888",
  },
  price: {
    fontSize: 20,
    fontWeight: "700",
    color: "#e53935",
  },

  dateSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fafafa",
    paddingHorizontal: 12,
    paddingVertical: 8, // कम किया
    borderRadius: 10,
    marginBottom: 10, // कम किया
  },
  dotLine: {
    width: 32,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#ccc",
  },
  dateTime: {
    fontSize: 13.5,
    color: "#444",
    fontWeight: "600",
  },
  dateTimeSmall: {
    fontSize: 12,
    color: "#666",
    marginTop: 1,
  },

  addressBox: {
    backgroundColor: "#f8f8f8",
    borderRadius: 12,
    padding: 10, // कम किया
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 3, // कम किया
  },
  address: {
    flex: 1,
    marginLeft: 6,
    fontSize: 13,
    color: "#444",
    lineHeight: 16,
  },
  tripTagContainer: {
    alignItems: "center",
    marginVertical: 6, // कम किया
  },
  tripTag: {
    backgroundColor: "#000",
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
});
