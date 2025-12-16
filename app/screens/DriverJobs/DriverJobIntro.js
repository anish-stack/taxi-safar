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

const { width, height } = Dimensions.get("window");

export default function DriverJobIntro() {
  const navigation = useNavigation();

  return (
    <Layout scrollable={true} showHeader={false}>
      <BackWithLogo title="Driver Jobs" />
      
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        bounces={false}
      >
        <View style={styles.container}>
          {/* Hero Illustration */}
          <View style={styles.illustrationContainer}>
            <Image
              source={require("../../assets/job-intro.jpg")}
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
              Post your job in minutes and connect with experienced, verified drivers across India.
            </Text>

            {/* Feature Highlights */}
            <View style={styles.features}>
              <View style={styles.featureItem}>
                <View style={[styles.iconCircle, { backgroundColor: "#ecfdf5" }]}>
                  <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                </View>
                <Text style={styles.featureText}>
                  Verified & Background Checked
                </Text>
              </View>
              <View style={styles.featureItem}>
                <View style={[styles.iconCircle, { backgroundColor: "#eff6ff" }]}>
                  <Ionicons name="shield-checkmark" size={20} color="#3b82f6" />
                </View>
                <Text style={styles.featureText}>Safe & Reliable Drivers</Text>
              </View>
              <View style={styles.featureItem}>
                <View style={[styles.iconCircle, { backgroundColor: "#fffbeb" }]}>
                  <Ionicons name="flash" size={20} color="#f59e0b" />
                </View>
                <Text style={styles.featureText}>Quick Hiring Process</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.navigate("driver-job-create")}
              activeOpacity={0.85}
            >
              <Ionicons name="add-circle" size={20} color="#fff" />
              <Text style={styles.primaryButtonText}>Post a New Job</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => navigation.navigate("driver-job-list")}
              activeOpacity={0.85}
            >
              <Text style={styles.secondaryButtonText}>View Posted Jobs</Text>
              <Ionicons name="arrow-forward" size={18} color="#EF4444" />
            </TouchableOpacity>

            {/* Trust Badge */}
            <View style={styles.trustBar}>
              <Text style={styles.trustText}>
                Trusted by 10,000+ users across India
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  container: {
    flex: 1,
    backgroundColor: "#fafafa",
  },
  illustrationContainer: {
    position: "relative",
    height: height * 0.22,
    maxHeight: 180,
    borderRadius: 16,
    overflow: "hidden",
    marginHorizontal: 16,
    marginTop: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  illustration: {
    width: "100%",
    height: "100%",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    justifyContent: "flex-end",
    padding: 18,
  },
  overlayText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
    fontFamily: "SFProDisplay-Bold",
    letterSpacing: 0.3,
  },
  overlaySubtext: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "SFProDisplay-Semibold",
    marginTop: 4,
    opacity: 0.95,
  },

  content: {
    paddingHorizontal: 18,
    marginTop: 24,
  },
  heading: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "SFProDisplay-Bold",
    color: "#1e293b",
    textAlign: "center",
    lineHeight: 26,
  },
  subheading: {
    fontSize: 14,
    fontFamily: "SFProDisplay-Regular",
    color: "#64748b",
    textAlign: "center",
    lineHeight: 20,
    marginTop: 8,
    paddingHorizontal: 8,
  },

  features: {
    marginTop: 24,
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  featureText: {
    fontSize: 14,
    color: "#334155",
    fontFamily: "SFProDisplay-Medium",
    fontWeight: "600",
    flex: 1,
  },

  primaryButton: {
    backgroundColor: "#000",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 1,
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "SFProDisplay-Bold",
    marginLeft: 8,
  },

  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#EF4444",
    backgroundColor: "transparent",
  },
  secondaryButtonText: {
    color: "#EF4444",
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "SFProDisplay-Bold",
    marginRight: 6,
  },

  trustBar: {
    marginTop: 28,
    paddingVertical: 12,
    alignItems: "center",
  },
  trustText: {
    fontSize: 12,
    color: "#94a3b8",
    fontFamily: "SFProDisplay-Medium",
    fontWeight: "500",
    textAlign: "center",
  },
});