// screens/InsuranceIntro.js
import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import BackWithLogo from "../common/back_with_logo";

const { width, height } = Dimensions.get("window");

export default function InsuranceIntro() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <BackWithLogo />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          {/* Header Section */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="shield-checkmark" size={70} color="#10B981" />
            </View>

            <Text style={styles.title}>Insurance Manager</Text>
            <Text style={styles.subtitle}>
              Track Insurance, PUC, Fitness Certificate & National Permit{"\n"}
              Get timely reminders • Renew on time • Drive legally
            </Text>
          </View>

          {/* Main Action Cards */}
          <View style={styles.cardsContainer}>
            {/* Add New Document */}
            <TouchableOpacity
              style={styles.cardWrapper}
              onPress={() => navigation.navigate("CreateInsurance")}
              activeOpacity={0.92}
            >
              <LinearGradient
                colors={["#10B981", "#059669"]}
                style={styles.gradientCard}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.cardIcon}>
                  <Ionicons name="add-circle" size={44} color="#fff" />
                </View>
                <Text style={styles.cardTitle}>Apply For New Insurance</Text>

                <Ionicons
                  name="chevron-forward"
                  size={26}
                  color="#fff"
                  style={styles.arrow}
                />
              </LinearGradient>
            </TouchableOpacity>

            {/* View All Records */}
            <TouchableOpacity
              style={styles.cardWrapper}
              onPress={() => navigation.navigate("AllInsurance")}
              activeOpacity={0.92}
            >
              <LinearGradient
                colors={["#3B82F6", "#2563EB"]}
                style={styles.gradientCard}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.cardIcon}>
                  <Ionicons name="documents" size={44} color="#fff" />
                </View>
                <Text style={styles.cardTitle}>View All Applied Insurance</Text>

                <Ionicons
                  name="chevron-forward"
                  size={26}
                  color="#fff"
                  style={styles.arrow}
                />
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Trust & Stats Section */}
          <View style={styles.bottomSection}>
            {/* Trust Badges */}
            <View style={styles.trustBadges}>
              <View style={styles.trustItem}>
                <Ionicons name="notifications" size={22} color="#10B981" />
                <Text style={styles.trustText}>Auto Expiry Alerts</Text>
              </View>
              <View style={styles.trustItem}>
                <Ionicons name="lock-closed" size={22} color="#10B981" />
                <Text style={styles.trustText}>100% Secure</Text>
              </View>
              <View style={styles.trustItem}>
                <Ionicons name="shield-checkmark" size={22} color="#10B981" />
                <Text style={styles.trustText}>Trusted by 25,000+ Drivers</Text>
              </View>
            </View>

            {/* Stats */}
            <View style={styles.statsContainer}>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>98%</Text>
                <Text style={styles.statLabel}>On-Time Renewals</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>4.9</Text>
                <Text style={styles.statLabel}>App Rating</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>50K+</Text>
                <Text style={styles.statLabel}>Active Users</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  header: {
    alignItems: "center",
    paddingTop: height * 0.08,
    paddingHorizontal: 30,
  },
  iconContainer: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "#ECFDF5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    borderWidth: 3,
    borderColor: "#10B981",
  },
  title: {
    fontSize: 32,
    fontWeight: "900",
    color: "#111827",
    textAlign: "center",
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 24,
    fontWeight: "500",
  },

  cardsContainer: {
    paddingHorizontal: 20,
    marginTop: 40,
    gap: 20,
  },
  cardWrapper: {
    borderRadius: 20,
    overflow: "hidden",
    elevation: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
  },
  gradientCard: {
    padding: 28,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  cardIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "rgba(255,255,255,0.25)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.4)",
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
    marginLeft: 20,
    flex: 1,
  },
  cardDesc: {
    fontSize: 14,
    color: "#E0E7FF",
    marginLeft: 20,
    marginTop: 4,
    flex: 1,
  },
  arrow: {
    opacity: 0.9,
  },

  bottomSection: {
    marginTop: 50,
    paddingHorizontal: 24,
  },
  trustBadges: {
    gap: 16,
    marginBottom: 32,
  },
  trustItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  trustText: {
    fontSize: 15.5,
    color: "#374151",
    fontWeight: "600",
  },

  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#F8FAFC",
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  statBox: {
    alignItems: "center",
    flex: 1,
  },
  statNumber: {
    fontSize: 26,
    fontWeight: "900",
    color: "#10B981",
  },
  statLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 6,
    fontWeight: "600",
  },
  divider: {
    width: 1,
    height: "100%",
    backgroundColor: "#E2E8F0",
  },
});
