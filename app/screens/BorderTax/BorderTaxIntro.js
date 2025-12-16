// screens/BorderTaxIntro.js
import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import BackWithLogo from "../common/back_with_logo";

export default function BorderTaxIntro() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.container}>
      <BackWithLogo />

      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Ionicons name="car-sport-outline" size={40} color="#fff" />
          </View>
          <Text style={styles.title}>Border Tax</Text>
          <Text style={styles.subtitle}>
            Easy border tax payments for Taxi Safar drivers
          </Text>
        </View>

        {/* Action Cards */}
        <View style={styles.cards}>
          {/* Post Border Tax */}
          <TouchableOpacity
            style={[styles.card, styles.redCard]}
            onPress={() => navigation.navigate("CreateBorderTax")}
            activeOpacity={0.9}
          >
            <MaterialCommunityIcons name="file-upload-outline" size={28} color="#fff" />
            <Text style={styles.cardText}>Post Border Tax</Text>
            <Ionicons name="arrow-forward" size={22} color="#fff" />
          </TouchableOpacity>

          {/* View Border Taxes */}
          <TouchableOpacity
            style={[styles.card, styles.blackCard]}
            onPress={() => navigation.navigate("ViewBorderTax")}
            activeOpacity={0.9}
          >
            <MaterialCommunityIcons name="file-document-outline" size={28} color="#fff" />
            <Text style={styles.cardText}>View All Taxes</Text>
            <Ionicons name="arrow-forward" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Trust Badge */}
        <View style={styles.trust}>
          <Ionicons name="shield-checkmark" size={18} color="#E52710" />
          <Text style={styles.trustText}>Secure • Fast • Verified by Taxi Safar</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 30,
  },

  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#E52710",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#000",
    fontFamily: "SFProDisplay-Bold",
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginTop: 8,
    fontFamily: "SFProDisplay-Medium",
  },

  cards: {
    gap: 16,
    marginBottom: 40,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderRadius: 16,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  redCard: {
    backgroundColor: "#E52710",
  },
  blackCard: {
    backgroundColor: "#000",
  },
  cardText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#fff",
    fontFamily: "SFProDisplay-Semibold",
    flex: 1,
    marginLeft: 16,
  },

  trust: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  trustText: {
    fontSize: 13,
    color: "#777",
    fontFamily: "SFProDisplay-Medium",
  },
});