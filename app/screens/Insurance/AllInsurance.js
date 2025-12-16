// screens/AllInsurance.js
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import BackWithLogo from "../common/back_with_logo";
import loginStore from "../../store/auth.store";
import axios from "axios";
import { API_URL_APP } from "../../constant/api";

export default function AllInsurance({ navigation }) {
  const { token } = loginStore();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchInsurance = async () => {
    try {
      const res = await axios.get(`${API_URL_APP}/api/v1/insurance/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const items = res.data.data || [];
      setData(items);
      setFilteredData(items);
    } catch (error) {
      Alert.alert("Error", "Failed to load insurance requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsurance();
  }, []);

  // Search Filter
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredData(data);
      return;
    }

    const lowerQuery = searchQuery.toLowerCase();
    const filtered = data.filter(
      (item) =>
        item.full_name?.toLowerCase().includes(lowerQuery) ||
        item.vehicle_number?.toLowerCase().includes(lowerQuery) ||
        item.contact_number?.includes(lowerQuery)
    );
    setFilteredData(filtered);
  }, [searchQuery, data]);

  const deleteInsurance = (id) => {
    Alert.alert("Delete Request", "Are you sure you want to delete this request?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await axios.delete(`${API_URL_APP}/api/v1/insurance/${id}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            fetchInsurance();
          } catch (err) {
            Alert.alert("Error", "Failed to delete");
          }
        },
      },
    ]);
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case "completed":
        return { bg: "#E8F5E9", color: "#2E7D32", label: "Completed" };
      case "processing":
        return { bg: "#E3F2FD", color: "#1565C0", label: "Processing" };
      case "rejected":
        return { bg: "#FFEBEE", color: "#C62828", label: "Rejected" };
      default:
        return { bg: "#FFF4E6", color: "#E65100", label: "Pending" };
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <BackWithLogo />
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.loaderText}>Loading requests...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <BackWithLogo />

      <View style={styles.header}>
        <Text style={styles.title}>My Insurance Requests</Text>
        <Text style={styles.count}>{filteredData.length} requests</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, vehicle or phone..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#aaa"
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={18} color="#999" />
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
      // Updated card style in AllInsurance.js (replace the existing card JSX and styles)

{filteredData.map((item) => {
  const status = getStatusStyle(item.status || "pending");
  return (
    <View key={item._id} style={styles.cardWrapper}>
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate("CreateInsurance", { id: item._id })}
        activeOpacity={0.95}
      >
        {/* Status */}
        <View style={[styles.status, { backgroundColor: status.bg }]}>
          <Text style={[styles.statusText, { color: status.color }]}>
            {status.label}
          </Text>
        </View>

        {/* Details */}
        <View style={styles.details}>
          <Text style={styles.name}>{item.full_name}</Text>
          <Text style={styles.vehicle}>{item.vehicle_number}</Text>
          <View style={styles.row}>
            <Text style={styles.small}>{item.contact_number}</Text>
            <Text style={styles.small}>• {item.insurance_type.replace("_", " ").charAt(0).toUpperCase() + item.insurance_type.replace("_", " ").slice(1)}</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => navigation.navigate("CreateInsurance", { id: item._id })}
          >
            <Text style={styles.editText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteInsurance(item._id)}>
            <Text style={styles.deleteText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      {/* Insurance Card Image - Positioned on the right */}
      <Image
        source={{ uri: "https://res.cloudinary.com/dqjoc7ajw/image/upload/v1765647726/images/rbfqaxupfvgqmwwmwbql.png" }}
        style={styles.insuranceImage}
        resizeMode="contain"
      />
    </View>
  );
})}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loaderText: {
    marginTop: 12,
    fontSize: 14,
    color: "#777",
  },

  header: {
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#000",
  },
  count: {
    fontSize: 13,
    color: "#777",
    marginTop: 4,
  },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 14,
    borderRadius: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: "#000",
  },
cardWrapper: {
    position: "relative",
    marginBottom: 14,
  },
  card: {
    borderRadius: 14,
    padding: 16,
 
    marginRight: 80, // Make space for the image on the right
  },

  insuranceImage: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 100,
    height: 70,
    borderRadius: 10,

  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#eee",
    overflow: "hidden",
  },
  status: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    alignSelf: "flex-start",
    margin: 12,
    marginBottom: 0,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },

  details: {
    padding: 16,
    paddingTop: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
  vehicle: {
    fontSize: 15,
    color: "#000",
    fontWeight: "500",
    marginTop: 4,
  },
  row: {
    flexDirection: "row",
    marginTop: 6,
  },
  small: {
    fontSize: 13,
    color: "#666",
  },

  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    padding: 12,
    paddingTop: 0,
    gap: 16,
  },
  editBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
  },
  editText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#000",
  },
  deleteBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#ffebee",
    borderRadius: 8,
  },
  deleteText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#000",
  },

  empty: {
    alignItems: "center",
    marginTop: 60,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#777",
    textAlign: "center",
    marginBottom: 24,
    paddingHorizontal: 40,
  },
  newBtn: {
    backgroundColor: "#000",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  newBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
});