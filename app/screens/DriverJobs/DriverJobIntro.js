import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
  ScrollView,
} from "react-native";
import Layout from "../common/layout";
import BackWithLogo from "../common/back_with_logo";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

export default function DriverJobIntro() {
  const navigation = useNavigation();

  return (
    <Layout scrollable={true} showHeader={false}>
      <BackWithLogo title="Driver Jobs" />

  
        <View style={styles.container}>
          {/* Hero Illustration */}
          <View style={styles.illustrationContainer}>
            <Image
              source={require("../../assets/job-intro.jpg")} // Keep your image
              style={styles.illustration}
              resizeMode="cover"
            />
            <View style={styles.overlay}>
              <Text style={styles.overlayText}>Hire Trusted Drivers</Text>
              <Text style={styles.overlaySubtext}>
                Fast • Verified • Reliable
              </Text>
            </View>
          </View>

          {/* Main Content */}
          <View style={styles.content}>
            <Text style={styles.heading}>Need a Professional Driver?</Text>
            <Text style={styles.subheading}>
              Post your job in minutes and connect with experienced, verified
              drivers across India.
            </Text>

            {/* Feature Highlights */}
            <View style={styles.features}>
              <View style={styles.featureItem}>
                <View style={styles.iconCircle}>
                  <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                </View>
                <Text style={styles.featureText}>
                  Verified & Background Checked
                </Text>
              </View>
              <View style={styles.featureItem}>
                <View style={styles.iconCircle}>
                  <Ionicons name="shield-checkmark" size={24} color="#3b82f6" />
                </View>
                <Text style={styles.featureText}>Safe & Reliable Drivers</Text>
              </View>
              <View style={styles.featureItem}>
                <View style={styles.iconCircle}>
                  <Ionicons name="flash" size={24} color="#f59e0b" />
                </View>
                <Text style={styles.featureText}>Quick Hiring Process</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.navigate("driver-job-create")}
              activeOpacity={0.9}
            >
              <Ionicons name="add-circle" size={24} color="#fff" />
              <Text style={styles.primaryButtonText}>Post a New Job</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => navigation.navigate("driver-job-list")}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryButtonText}>View Posted Jobs</Text>
              <Ionicons name="arrow-forward" size={20} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    // flex: 1,
    backgroundColor: "#f8fafc",
  },
  illustrationContainer: {
    position: "relative",
    height: 230,
    borderRadius: 20,
    overflow: "hidden",
    marginHorizontal: 20,
    marginTop: 10,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  illustration: {
    width: "100%",
    height: "100%",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "flex-end",
    padding: 24,
  },
  overlayText: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  overlaySubtext: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 6,
    opacity: 0.9,
  },

  content: {
    paddingHorizontal: 24,
    marginTop: 32,
  },
  heading: {
    fontSize: 26,
    fontWeight: "800",
    color: "#1e293b",
    textAlign: "center",
    lineHeight: 34,
  },
  subheading: {
    fontSize: 16,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 24,
    marginTop: 12,
    paddingHorizontal: 10,
  },

  features: {
    marginTop: 32,
    marginBottom: 32,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  featureText: {
    fontSize: 15,
    color: "#334155",
    fontWeight: "600",
    flex: 1,
  },

  primaryButton: {
    backgroundColor: "#EF4444",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    borderRadius: 16,
    marginBottom: 16,
    elevation: 6,
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginLeft: 10,
  },

  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#EF4444",
    backgroundColor: "transparent",
  },
  secondaryButtonText: {
    color: "#EF4444",
    fontSize: 16,
    fontWeight: "700",
    marginRight: 8,
  },

  trustBar: {
    marginTop: 40,
    paddingVertical: 16,
    alignItems: "center",
  },
  trustText: {
    fontSize: 13,
    color: "#94a3b8",
    fontWeight: "500",
    textAlign: "center",
  },
});
