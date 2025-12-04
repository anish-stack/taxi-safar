import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";

const OPTIONS = ["All Available Rides", "Driver Post Rides", "Taxi Safar Rides"];

export default function RideFilterDropdown({ selectedOption = "All Available Rides", onSelect }) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (option) => {
    onSelect(option);
    setIsOpen(false);
  };

  return (
    <View style={styles.container}>
      {/* Label and Dropdown Side by Side */}
      <Text style={styles.label}>Available Rides</Text>

      <TouchableOpacity
        style={styles.dropdownButton}
        onPress={() => setIsOpen(!isOpen)}
        activeOpacity={0.8}
      >
        <Text style={styles.selectedText}>{selectedOption}</Text>
        <Icon name={isOpen ? "chevron-up" : "chevron-down"} size={20} color="#555" />
      </TouchableOpacity>

      {/* Dropdown Menu */}
      {isOpen && (
        <View style={styles.dropdownMenu}>
          <FlatList
            data={OPTIONS}
            keyExtractor={(item) => item}
            renderItem={({ item }) => {
              const isSelected = selectedOption === item;
              return (
                <TouchableOpacity
                  style={[styles.menuItem, isSelected && styles.menuItemSelected]}
                  onPress={() => handleSelect(item)}
                >
                  <Text style={[styles.menuText, isSelected && styles.menuTextSelected]}>
                    {item}
                  </Text>
                  {isSelected && <Icon name="checkmark" size={18} color="#DC2626" />}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent:"space-between"
  },
  label: {
    fontSize: 16,
    color: "#333",
    marginRight: 12,
    fontFamily: "SFProDisplay-Bold",
  },
  dropdownButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: .41,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    backgroundColor: "#fff",
    minWidth: 50,
  
  },
  selectedText: {
    fontSize: 15,
    color: "#111",
    fontFamily: "SFProDisplay-Medium",
    marginRight: 8,
  },
  dropdownMenu: {
    position: "absolute",
    top: 50, 
    right: 0, 
    backgroundColor: "#fff",
    borderRadius: 10,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    zIndex: 1000,
    width: 180,
  },
  menuItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: "#eee",
  },
  menuItemSelected: {
    backgroundColor: "#FEF2F2",
  },
  menuText: {
    fontSize: 15,
    color: "#333",
    fontFamily: "SFProDisplay-Medium",
  },
  menuTextSelected: {
    color: "#DC2626",
    fontFamily: "SFProDisplay-Bold",
  },
});
