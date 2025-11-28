import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons"; // or react-native-vector-icons

const CommonHeader = ({
  title = "Header",
  onBackPress,
  onAddPress,
  showAdd = true,
  backgroundColor = "#f4f5f7",
}) => {
  return (
    <View style={[styles.container, { backgroundColor }]}>
      
      {/* Back Button */}
      <TouchableOpacity style={styles.iconButton} onPress={onBackPress}>
        <Ionicons name="chevron-back" size={24} color="#000" />
      </TouchableOpacity>

      {/* Title */}
      <Text style={styles.title}>{title}</Text>

      {/* Add Button */}
      {showAdd ? (
        <TouchableOpacity style={styles.iconButton} onPress={onAddPress}>
          <Ionicons name="add" size={26} color="#000" />
        </TouchableOpacity>
      ) : (
        <View style={styles.placeholder} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 70,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: "#000",
  },
  iconButton: {
    width: 40,
    height: 40,
    backgroundColor: "#fff",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
  },
  placeholder: {
    width: 40,
    height: 40,
  },
});

export default CommonHeader;
