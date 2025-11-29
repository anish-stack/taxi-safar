import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
} from "react-native";
import React from "react";
import { LinearGradient } from "expo-linear-gradient";
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
            icon={<FontAwesome name="inr" size={20} color="#D50000" />}
            title="Set Your Own Price"
            desc="Quote any amount based on distance, time, or route"
          />
          <BenefitItem
            icon={
              <Ionicons
                name="document-text-outline"
                size={22}
                color="#D50000"
              />
            }
            title="Branded Quotation"
            desc="Includes your company logo, name, and signature"
          />
          <BenefitItem
            icon={<FontAwesome5 name="handshake" size={20} color="#D50000" />}
            title="Win More Customers"
            desc="Fixed price builds trust — no meter anxiety"
          />
          <BenefitItem
            icon={
              <MaterialCommunityIcons
                name="cash-plus"
                size={22}
                color="#D50000"
              />
            }
            title="Increase Earnings"
            desc="Add night charge, waiting, tolls, airport fees"
          />
        </View>

        {/* Preview */}
        <View style={styles.previewSection}>
          <Text style={styles.previewLabel}>Sample Quotation</Text>
          <Image
            source={preview}
            style={styles.previewImage}
            resizeMode="contain"
          />
        </View>

        {/* Extra space so content isn't hidden behind fixed button */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Fixed CTA Button at Bottom */}
      <View style={styles.fixedButtonContainer}>
         <TouchableOpacity
          onPress={() => navigation.navigate("see-quotation")}
          style={[styles.fixedButton,{marginBottom:12}]}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={["#32CD32", "#3CB371"]}
            style={StyleSheet.absoluteFill}
          />
          <MaterialCommunityIcons name="eye" size={22} color="#fff" />
          <Text style={styles.fixedButtonText}>See Quotations</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => navigation.navigate("create-quotation")}
          style={styles.fixedButton}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={["#D50000", "#B71C1C"]}
            style={StyleSheet.absoluteFill}
          />
          <MaterialCommunityIcons name="send" size={22} color="#fff" />
          <Text style={styles.fixedButtonText}>Start Creating Quotations</Text>
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
    paddingTop: 50,
    paddingHorizontal: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 30,
  },
  brand: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000",
    marginTop: 12,
  },
  logo: {
    width: 320,

    marginBottom: 10,
  },
  tagline: {
    fontSize: 20,
    fontWeight: "600",

    color: "#222",
    marginTop: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    textAlign: "center",
    color: "#000",
    lineHeight: 36,
    marginBottom: 30,
  },
  benefits: {
    marginBottom: 40,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  icon: {
    width: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  texts: {
    flex: 1,
    marginLeft: 16,
  },
  benefitTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#000",
  },
  benefitDesc: {
    fontSize: 13.5,
    color: "#666",
    marginTop: 4,
    lineHeight: 20,
  },
  previewSection: {
    alignItems: "center",
  },
  previewLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#000",
    marginBottom: 16,
  },
  previewImage: {
    width: "100%",
    height: 480,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#eee",
  },

  // Fixed Button at Bottom
  fixedButtonContainer: {
    position: "absolute",
    left: 24,
    right: 24,
    bottom: 30,
  },
  fixedButton: {
    flexDirection: "row",
    height: 56,
    borderRadius: 22,
    backgroundColor: "#D50000",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  fixedButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
