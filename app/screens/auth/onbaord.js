import React from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import onboardImage from "../../assets/onboard.png";

const { width, height } = Dimensions.get("window");

export default function OnboardScreen() {
  const navigation = useNavigation();

  return (
    <View style={{ flex: 1, backgroundColor: "#F8F7FA" }}>
      
      {/* Full Image */}
      <Image
        source={onboardImage}
        style={styles.background}
        resizeMode="contain"
      />

      {/* Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.loginButton]}
          onPress={() => navigation.navigate("AuthLogin")}
        >
          <Text style={styles.loginText}>Log in</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.signupButton]}
          onPress={() => navigation.navigate("Signup")}
        >
          <Text style={styles.signupText}>Sign Up</Text>
        </TouchableOpacity>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    width: "100%",
    height: "100%",
    position: "absolute",
    top: 0,
    left: 0,
  },

  buttonContainer: {
    position: "absolute",
    bottom: 60,
    flexDirection: "row",
    width: "100%",
    paddingHorizontal: 30,
    justifyContent: "space-between",
    gap: 16,
  },

  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
    elevation: 5,
  },

  loginButton: {
    backgroundColor: "#E30417",
  },

  signupButton: {
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#E30417",
  },

  loginText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },

  signupText: {
    color: "#E30417",
    fontSize: 18,
    fontWeight: "bold",
  },
});
