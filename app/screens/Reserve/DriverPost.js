import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import mini from "../../assets/mini.png";
import sedan from "../../assets/sedan.jpeg";
import suv from "../../assets/suv.png";
import { useNavigation } from "@react-navigation/native";

export default function DriverPost({
  _id,
  vehicleName = "Maruti WagonR",
  vehicleType = "mini",
  totalAmount = "₹8,000",
  requirement = {},
  commission = "₹2,000",
  driverEarning = "₹6,000",
  pickup = "220 Yonge St, Toronto, ON M5B 2H1, Delhi",
  drop = "17600 Yonge St, Newmarket, ON L3Y 4Z1, Delhi",
  tripType = "One way Trip - 60 km",
  date = "08 Mar, 2025",
  time = "07:00 PM",
}) {
  const navigation = useNavigation();

  const shortenAddress = (address) => {
  if (!address) return "";

  const parts = address.split(",").map(x => x.trim());

  // take last 4 meaningful parts
  const shortParts = parts.slice(-4);

  return shortParts.join(", ");
};

  const vehicleImage =
    vehicleType === "mini" ? mini : vehicleType === "sedan" ? sedan : suv;
  const capacityMap = { mini: 3, sedan: 4, suv: 5 };
  const capacity = capacityMap[vehicleType] || 0;

  // Badges Logic (same as before)
  const badgeLabels = {
    ac: "AC",
    allExclusive: "All Exclusive",
    allInclusive: "All Inclusive",
    carrier: "Carrier",
    foodAllowed: "Food Allowed",
    musicSystem: "Music System",
    onlyDiesel: "Diesel Only",
  };

  const req = requirement || {};
  let badgesToShow = [];

  if (req.allInclusive) {
    badgesToShow = ["All Inclusive"];
  } else {
    badgesToShow = Object.keys(req)
      .filter((key) => req[key] && key !== "allInclusive")
      .map((key) => badgeLabels[key]);
    if (badgesToShow.length === 0) badgesToShow = ["All Inclusive"];
  }

  const displayBadges =
    badgesToShow.length > 3
      ? [...badgesToShow.slice(0, 2), `+${badgesToShow.length - 2}`]
      : badgesToShow;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => navigation.navigate("DriverPostDetails", { rideId: _id })}
      style={styles.card}
    >
      {/* Top Row */}
      <View style={styles.topRow}>
        <View style={styles.row}>
          <Image source={vehicleImage} style={styles.carImage} />
          <View>
            <Text style={styles.vehicleName}>{vehicleName}</Text>
            <Text style={styles.capacityText}>Capacity {capacity} seats</Text>
          </View>
        </View>

        <View style={styles.dateTime}>
          <Text style={styles.date}>{date}</Text>
          <Text style={styles.time}>{time}</Text>
        </View>
      </View>

      {/* Badges */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.badgeScroll}
        contentContainerStyle={styles.badgeContainer}
      >
        {displayBadges.map((badge, i) => (
          <View key={i} style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Amounts */}
      <View style={styles.amountRow}>
        <View style={styles.amountBox}>
          <Text style={styles.totalAmount}>{totalAmount}</Text>
          <Text style={styles.amountLabel}>Total</Text>
        </View>
        <View style={styles.amountBox}>
          <Text style={styles.commission}>{commission}</Text>
          <Text style={styles.amountLabel}>Commission</Text>
        </View>
        <View style={styles.amountBox}>
          <Text style={styles.earning}>{driverEarning}</Text>
          <Text style={styles.amountLabel}>You Earn</Text>
        </View>
      </View>

      {/* Address Box */}
      <View style={styles.addressBox}>
        <View style={styles.addressRow}>
          <Icon name="navigate-outline" size={15} color="#666" />
          <Text style={styles.address} numberOfLines={1}>
            {shortenAddress(pickup)}
          </Text>
        </View>

        <View style={styles.tripTagContainer}>
          <Text style={styles.tripTag}>{tripType}</Text>
        </View>

        <View style={styles.addressRow}>
          <Icon name="location-outline" size={15} color="#666" />
          <Text style={styles.address} numberOfLines={1}>
             {shortenAddress(drop)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    padding: 14, // 22 → 14
    marginVertical: 6, // 10 → 6
    marginHorizontal: 8,
    borderRadius: 16,
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

  carImage: {
    width: 36,
    height: 36,
    borderRadius: 10,
    marginRight: 10, // 14 → 10
  },

  vehicleName: {
    fontSize: 15.5,
        fontFamily: "SFProDisplay-Bold",

    fontWeight: "600",
    textTransform:"capitalize",
    color: "#111",
  },

  capacityText: {
    fontSize: 13,
    color: "#666",
        fontFamily: "SFProDisplay-Bold",

    marginTop: 2,
  },

  dateTime: {
    alignItems: "flex-end",
    
  },
  date: {
    fontSize: 13,
        fontFamily: "SFProDisplay-Bold",

    color: "#444",
  },
  time: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
    marginTop: 1,
        fontFamily: "SFProDisplay-Bold",

  },

  // Badges
  badgeScroll: {
    marginTop: 8,
    position: "absolute",
    zIndex: 99,
    top: -20,
    right: 0,
    marginBottom: 6,
  },
  badgeContainer: {
    gap: 6,
  },
  badge: {
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  badgeText: {
    color: "#DC2626",
    fontSize: 12,
    fontWeight: "600",
        fontFamily: "SFProDisplay-Bold",

  },

  // Amounts
  amountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 8, // कम किया
  },
  amountBox: {
    alignItems: "center",
    flex: 1,
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: "700",
        fontFamily: "SFProDisplay-Bold",

    color: "#d32f2f",
  },
  commission: {
    fontSize: 15,
    fontWeight: "600",
    color: "#d32f2f",
        fontFamily: "SFProDisplay-Bold",

  },
  earning: {
    fontSize: 16,
        fontFamily: "SFProDisplay-Bold",

    fontWeight: "700",
    color: "#388E3C",
  },
  amountLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 3,
  },

  // Address
  addressBox: {
    backgroundColor: "#f8f8f8",
    padding: 10, // 16 → 10
    borderRadius: 12,
    marginTop: 6,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 3,
  },
  address: {
    flex: 1,
    textAlign:'auto',
    marginLeft: 6,
    fontSize: 13,
    color: "#444",
    lineHeight: 16,
  },
  tripTagContainer: {
    alignItems: "center",
    marginVertical: 6,
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
