import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
} from "react-native";
import React from "react";
import {
  MaterialCommunityIcons,
  Ionicons,
  FontAwesome5,
  FontAwesome,
} from "@expo/vector-icons";
import preview from "../../assets/image.png";
import logo from "../../assets/taxisafar-logo.png";

export default function QuotationIntro({ navigation }) {
  return (
    <View style={styles.container}>
      {/* Scrollable Content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Image source={logo} style={styles.logo} resizeMode="contain" />
          <Text style={styles.tagline}>Professional Quotation System</Text>
        </View>

        {/* Main Title */}
        <Text style={styles.title}>
          Create and Send{"\n"}Professional Quotations
        </Text>

        {/* Benefits */}
        <View style={styles.benefits}>
          <BenefitItem
            icon={<FontAwesome name="inr" size={18} color="#EF4444" />}
            title="Set Your Own Price"
            desc="Quote any amount based on distance, time, or route"
          />
          <BenefitItem
            icon={
              <Ionicons
                name="document-text-outline"
                size={20}
                color="#EF4444"
              />
            }
            title="Branded Quotation"
            desc="Includes your company logo, name, and signature"
          />
          <BenefitItem
            icon={<FontAwesome5 name="handshake" size={18} color="#EF4444" />}
            title="Win More Customers"
            desc="Fixed price builds trust — no meter anxiety"
          />
          <BenefitItem
            icon={
              <MaterialCommunityIcons
                name="cash-plus"
                size={20}
                color="#EF4444"
              />
            }
            title="Increase Earnings"
            desc="Add night charge, waiting, tolls, airport fees"
          />
        </View>

     

        {/* Extra space so content isn't hidden behind fixed button */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Fixed CTA Buttons at Bottom */}
      <View style={styles.fixedButtonContainer}>
        <TouchableOpacity
          onPress={() => navigation.navigate("see-quotation")}
          style={[styles.seeButton]}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="eye" size={20} color="#1F2937" />
          <Text style={styles.seeButtonText}>See Quotations</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate("create-quotation")}
          style={styles.createButton}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="send" size={20} color="#fff" />
          <Text style={styles.createButtonText}>Start Creating Quotations</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Reusable clean benefit row
const BenefitItem = ({ icon, title, desc }) => (
  <View style={styles.benefitRow}>
    <View style={styles.icon}>{icon}</View>
    <View style={styles.texts}>
      <Text style={styles.benefitTitle}>{title}</Text>
      <Text style={styles.benefitDesc}>{desc}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    paddingTop: 80,
    
    paddingHorizontal: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  logo: {
    width: 280,
    height: 60,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    fontFamily: "SFProDisplay-Semibold",
    color: "#1F2937",
    marginTop: 2,
  },
  title: {
    fontSize: 22,
    fontFamily: "SFProDisplay-Bold",
    textAlign: "center",
    color: "#111827",
    lineHeight: 30,
    marginBottom: 24,
  },
  benefits: {
    marginBottom: 32,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  icon: {
    width: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  texts: {
    flex: 1,
    marginLeft: 12,
  },
  benefitTitle: {
    fontSize: 14,
    fontFamily: "SFProDisplay-Semibold",
    color: "#111827",
  },
  benefitDesc: {
    fontSize: 13,
    fontFamily: "SFProDisplay-Regular",
    color: "#6B7280",
    marginTop: 3,
    lineHeight: 18,
  },
  previewSection: {
    alignItems: "center",
  },
  previewLabel: {
    fontSize: 14,
    fontFamily: "SFProDisplay-Semibold",
    color: "#111827",
    marginBottom: 12,
  },
  previewImage: {
    width: "100%",
    height: 400,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  // Fixed Buttons at Bottom
  fixedButtonContainer: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 54,
    gap: 10,
  },
  seeButton: {
    flexDirection: "row",
    height: 48,
    borderRadius: 10,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#1F2937",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  seeButtonText: {
    color: "#1F2937",
    fontSize: 14,
    fontFamily: "SFProDisplay-Bold",
  },
  createButton: {
    flexDirection: "row",
    height: 48,
    borderRadius: 10,
    backgroundColor: "#E52710",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    elevation: 0.5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  createButtonText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "SFProDisplay-Bold",
  },
});