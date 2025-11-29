import { View, Text, StyleSheet, Image } from "react-native";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import BackWithLogo from "../common/back_with_logo";

export default function BuySellTaxi() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <BackWithLogo />

      <View style={styles.container}>
        <Image
          source={require("../../assets/coming-soon.jpg")} 
          style={styles.image}
        />

        <Text style={styles.title}>Buy & Sell Taxi</Text>

        <Text style={styles.subtitle}>
          Exciting features are on the way!
        </Text>

        <Text style={styles.description}>
          Soon you will be able to buy, sell, and list taxis directly inside the app. 
          Stay tuned — we are building something awesome for you.
        </Text>

        <Text style={styles.footer}>Coming Soon...</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: 180,
    height: 180,
    marginBottom: 20,
    resizeMode: "contain",
    opacity: 0.8,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: "#444",
    marginBottom: 10,
  },
  description: {
    textAlign: "center",
    color: "#666",
    marginTop: 10,
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  footer: {
    marginTop: 25,
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
  },
});
