import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function StatsCard({ count, title, onPress }) {
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.8} onPress={onPress}>
      <View style={styles.row}>
        <Text style={styles.count}>{count}</Text>
        <View style={styles.iconContainer}>
          <Ionicons name="chevron-forward" size={16} color="#000" />
        </View>
      </View>
      <Text style={styles.title}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#f4f4f4",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    width: 120,
    marginRight: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  count: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000",
  },
  iconContainer: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 13,
    color: "#444",
    marginTop: 6,
    lineHeight: 16,
  },
});
