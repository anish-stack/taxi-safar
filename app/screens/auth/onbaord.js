import React from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import logo from "../../assets/taxisafar-logo.png";
import onboardImage from "../../assets/onboard.png"; // phone + driver image

export default function OnboardScreen() {
  const navigation = useNavigation();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Logo */}
      <Image source={logo} style={styles.logo} resizeMode="contain" />
      <View style={styles.dashedLine} />
      {/* Tagline */}
      <Text style={styles.tagline}>
        India’s Smart B2B & B2C AI{" "}
        <Text style={styles.highlight}>Taxi Solution</Text>
      </Text>

      {/* Main Illustration */}
      <Image
        source={onboardImage}
        style={styles.mainImage}
        resizeMode="contain"
      />

      {/* Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.loginButton]}
          onPress={() => navigation.navigate("AuthLogin")}
        >
          <Text style={styles.loginText}>Login</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.signupButton]}
          onPress={() => navigation.navigate("Signup")}
        >
          <Text style={styles.signupText}>Sign Up</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.changeLanguage]}
        onPress={() =>
          Alert.alert(
            "Coming Soon",
            "This feature will be available in the next update."
          )
        }
      >
        <Ionicons
          name="language"
          size={20}
          color="#000"
          style={{ marginRight: 8 }}
        />
        <Text style={styles.changeLanguageText}>Change Language</Text>
      </TouchableOpacity>

      {/* Change Language */}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    height: "100%",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 30,
    alignItems: "center",
  },
  dashedLine: {
    width: "80%",
    height: 1,
    backgroundColor: "transparent",
    borderTopWidth: 1,
    borderTopColor: "#9CA3AF",
    borderStyle: "dashed",
    opacity: 0.8,
  },

  logo: {
    width: 180,
    height: 60,
    marginBottom: 2,
  },

  tagline: {
    fontSize: 15,
    color: "#111",
    textAlign: "center",
    marginBottom: 20,
    fontFamily: "SFProDisplay-Medium",

    fontWeight: "700",
  },

  highlight: {
    color: "#E30417",
    fontWeight: "700",
  },

  mainImage: {
    width: "100%",
    height: 440,
    marginBottom: 20,
  },

  featuresBox: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#999",
    borderRadius: 12,
    padding: 14,
    width: "100%",
    marginBottom: 25,
    backgroundColor: "#FFF",
  },

  featuresText: {
    fontSize: 12,
    color: "#222",
    textAlign: "center",
    marginBottom: 6,
    lineHeight: 18,
  },

  buttonContainer: {
    flexDirection: "row",
    gap: 14,
    width: "100%",
    marginBottom: 18,
  },

  button: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },

  loginButton: {
    paddingHorizontal: 22,
    backgroundColor: "#000",
  },

  changeLanguage: {
    borderWidth: 1,
    width: "100%",
    flexDirection: "row",
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  changeLanguageText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "700",
  },

  signupButton: {
    backgroundColor: "#E30417",
  },

  loginText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },

  signupText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },

  languageButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: "#000",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 20,
    width: "100%",
    justifyContent: "center",
  },

  languageText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#000",
  },
});
