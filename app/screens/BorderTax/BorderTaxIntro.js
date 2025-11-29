import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import BackWithLogo from "../common/back_with_logo";

export default function BorderTaxIntro() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <BackWithLogo />

      <View style={styles.container}>

        {/* Header Section */}
        <View style={styles.headerSection}>
          <Ionicons name="car-sport" size={42} color="#E30022" />
          <Text style={styles.mainTitle}>Border Tax Service</Text>
          <Text style={styles.subText}>
            Fast, Secure & Hassle-Free Border Tax Payments for Taxi Safar Drivers
          </Text>
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Ionicons name="shield-checkmark" size={26} color="#E30022" />
          <Text style={styles.infoText}>
            Taxi Safar ensures your border tax submissions are 100% safe and verified.
          </Text>
        </View>

        {/* Action Cards */}
        <TouchableOpacity
          style={[styles.card, styles.postCard]}
          onPress={() => navigation.navigate("CreateBorderTax")}
        >
          <MaterialCommunityIcons name="file-upload" size={34} color="#fff" />
          <Text style={styles.cardText}>Post Border Tax</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.card, styles.viewCard]}
          onPress={() => navigation.navigate("ViewBorderTax")}
        >
          <MaterialCommunityIcons name="file-document" size={34} color="#fff" />
          <Text style={styles.cardText}>View Border Taxes</Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  // Header Section
  headerSection: {
    width: "100%",
    alignItems: "center",
    marginBottom: 30,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#000",
    marginTop: 8,
  },
  subText: {
    fontSize: 14,
    color: "#555",
    marginTop: 6,
    width: "85%",
    textAlign: "center",
  },

  // Info Box
  infoBox: {
    width: "100%",
    backgroundColor: "#FFE9EB",
    borderRadius: 14,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 35,
    borderLeftWidth: 5,
    borderLeftColor: "#E30022",
  },
  infoText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },

  // Action Cards
  card: {
    width: "100%",
    paddingVertical: 20,
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 14,
    marginBottom: 18,
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  postCard: {
    backgroundColor: "#E30022", // RED
  },
  viewCard: {
    backgroundColor: "#000", // BLACK
  },
  cardText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
});
