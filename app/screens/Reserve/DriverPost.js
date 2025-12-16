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
import sedan from "../../assets/sedan.png";
import suv from "../../assets/suv.png";
import { useNavigation } from "@react-navigation/native";
import { Plus } from "lucide-react-native";

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
    const parts = address.split(",").map((x) => x.trim());
    const shortParts = parts.slice(-4);
    return shortParts.join(", ");
  };

  const vehicleImage =
    vehicleType === "mini" ? mini : vehicleType === "sedan" ? sedan : suv;
  const capacityMap = { mini: 4, sedan: 4, suv: 5 };
  const VehicleName = vehicleType === "mini" ? "Maruti WagonR" : vehicleType === "sedan" ? "Maruti Swift Dzire" : "Maruti Ertiga SUV";
  const capacity = capacityMap[vehicleType] || 0;

  // Badges Logic
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
            <Text style={styles.vehicleName}>{VehicleName || vehicleName}</Text>
            <Text style={{fontSize:10}}>Any Other Similar AC Taxi</Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6, // spacing between items
                padding: 4,
              }}
            >
              {/* Passengers Icon */}
              <Image
                source={require("./passengers.png")}
                style={{ width: 22, height: 22, resizeMode: "contain", }}
              />

              {/* Capacity Text with Plus Icon */}
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
              >
                <Text style={{ fontSize: 14, fontWeight: "bold" }}>
                  {capacity}
                </Text>
                <Plus size={12} />
              </View>

              {/* Luggage Icon */}
              <Image
                source={require("./luggage.png")}
                style={{
                  width: 16,
                  height: 16,
                  resizeMode: "contain",
                  marginLeft: 0,
                }}
              />
            </View>
          </View>
        </View>

        <View style={styles.dateTime}>
          <Text style={styles.date}>{date}</Text>
          <Text style={styles.time}>{time} AM</Text>
        </View>
      </View>

      {/* Badges - Ribbon Style */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.badgeScroll}
        contentContainerStyle={styles.badgeContainer}
      >
        {displayBadges.map((badge, i) => (
          <View key={i} style={styles.ribbonWrapper}>
            <View style={styles.ribbonBadge}>
              <Text style={styles.ribbonText}>{badge}</Text>
            </View>
            
          </View>
        ))}
      </ScrollView>

      {/* Amounts */}
      <View style={styles.amountRow}>
        <View style={styles.amountBox}>
          <Text style={styles.totalAmount}>{totalAmount}</Text>
          <Text style={styles.amountLabel}>Total Amount</Text>
        </View>
        <View style={styles.amountBox}>
          <Text style={styles.commission}>{commission}</Text>
          <Text style={styles.amountLabel}>Commission</Text>
        </View>
        <View style={styles.amountBox}>
          <Text style={styles.earning}>{driverEarning}</Text>
          <Text style={styles.amountLabel}>Driver Earning</Text>
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
    padding: 8,
    marginVertical: 6,
    marginHorizontal: 8,
    borderRadius: 16,
    marginTop: 12,
    elevation: 0.4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
  },

  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },

  carImage: {
    width: 52,
    height: 52,
    borderRadius: 10,
    marginRight: 10,
    position:"relative",
    top:-10,
  },

  vehicleName: {
    fontSize: 15.5,
    fontFamily: "SFProDisplay-Bold",
    fontWeight: "600",
    textTransform: "capitalize",
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
    fontSize: 13,
    fontWeight: "600",
    color: "#000",
    marginTop: 1,
    fontFamily: "SFProDisplay-Bold",
  },

  // Badges - Ribbon Design
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

    marginTop:8,
    paddingRight: 10,
  },

  ribbonWrapper: {
    flexDirection: "row",
    alignItems: "center",
    height: 18,
  },

  ribbonBadge: {
    // #02BF4C
    backgroundColor: "#E5260F",
    paddingHorizontal: 8,
    height: 18,
   borderRadius:19,
    justifyContent: "center",
    alignItems: "center",
  },

  ribbonText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "SFProDisplay-Bold",
    letterSpacing: 0.3,
  },



  // Amounts
  amountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 15,
    
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
    color: "#000",
    marginBottom:4,
    fontWeight:"700",
    fontFamily: "SFProDisplay-Bold",
  },

  // Address
  addressBox: {
    backgroundColor: "#F2F5F6",
    padding: 10,
    borderRadius: 12,
  
  },

  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 3,
  },

  address: {
    flex: 1,
    textAlign: "auto",
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
