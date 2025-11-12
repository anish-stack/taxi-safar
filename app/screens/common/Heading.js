import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function Heading({ title, description, size = 24, colour = "#000" }) {
  return (
    <View style={styles.container}>
      {title ? (
        <Text style={[styles.title, { fontSize: size, color: colour }]}>
          {title}
        </Text>
      ) : null}

      {description ? (
        <Text style={styles.description}>{description}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    marginHorizontal: 16,
  },
  title: {
    fontWeight: "700",
  },
  description: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
});
