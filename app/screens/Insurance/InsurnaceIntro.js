// screens/InsuranceIntro.js
import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import BackWithLogo from "../common/back_with_logo";

const { width } = Dimensions.get("window");

export default function InsuranceIntro() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.container}>
      <BackWithLogo />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Ionicons name="shield-checkmark" size={48} color="#fff" />
          </View>
          <Text style={styles.title}>Insurance Manager</Text>
          <Text style={styles.subtitle}>
            Track Insurance, PUC, Fitness & Permits with timely reminders
          </Text>
        </View>

        {/* Action Cards */}
        <View style={styles.cards}>
          {/* Apply New */}
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate("CreateInsurance")}
            activeOpacity={0.9}
          >
            <LinearGradient colors={["#000000", "#333333"]} style={styles.gradient}>
              <Ionicons name="add-circle" size={28} color="#fff" />
              <Text style={styles.cardTitle}>Apply For New Insurance</Text>
              <Ionicons name="chevron-forward" size={24} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>

          {/* View All */}
          {/* <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate("AllInsurance")}
            activeOpacity={0.9}
          >
            <LinearGradient colors={["#E52710", "#C41E0A"]} style={styles.gradient}>
              <Ionicons name="documents" size={28} color="#fff" />
              <Text style={styles.cardTitle}>View All Insurance Records</Text>
              <Ionicons name="chevron-forward" size={24} color="#fff" />
            </LinearGradient>
          </TouchableOpacity> */}
        </View>

        {/* Quick Features */}
        <View style={styles.features}>
          <View style={styles.featureRow}>
            <Ionicons name="notifications" size={20} color="#E52710" />
            <Text style={styles.featureText}>Auto Expiry Reminders</Text>
          </View>
          <View style={styles.featureRow}>
            <Ionicons name="shield-checkmark" size={20} color="#E52710" />
            <Text style={styles.featureText}>Secure & Encrypted Data</Text>
          </View>
          <View style={styles.featureRow}>
            <Ionicons name="checkmark-circle" size={20} color="#E52710" />
            <Text style={styles.featureText}>Never Miss a Renewal</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    paddingBottom: 40,
  },

  header: {
    alignItems: "center",
    paddingTop: 40,
    paddingHorizontal: 30,
  },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#E52710",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#000",
    textAlign: "center",
    marginBottom: 10,
    fontFamily: "SFProDisplay-Bold",
  },
  subtitle: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
    fontFamily: "SFProDisplay-Medium",
  },

  cards: {
    paddingHorizontal: 20,
    marginTop: 40,
    gap: 16,
  },
  card: {
    borderRadius: 16,
    overflow: "hidden",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  gradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    gap: 16,
  },
  cardTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
    fontFamily: "SFProDisplay-Semibold",
  },

  features: {
    marginTop: 40,
    paddingHorizontal: 30,
    gap: 14,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  featureText: {
    fontSize: 15,
    color: "#333",
    fontFamily: "SFProDisplay-Medium",
  },
});