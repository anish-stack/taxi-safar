import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  Image,
  Alert,
} from "react-native";
import React, { useEffect, useState } from "react";
import BackWithLogo from "../common/back_with_logo";
import axios from "axios";
import { API_URL_APP } from "../../constant/api";
import loginStore from "../../store/auth.store";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import mini from "../../assets/mini.png";
import sedan from "../../assets/sedan.png";
import suv from "../../assets/suv.png";
import useDriverStore from "../../store/driver.store";

const DetailRow = ({ label, value }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value || "N/A"}</Text>
  </View>
);

export default function AllVehicles({ navigation }) {
  const [allVehicles, setAllVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [toggleLoading, setToggleLoading] = useState(null);

  const { token } = loginStore();
  const { driver } = useDriverStore();

  // 🚗 Fetch vehicles
  const handleFetchVehicle = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(
        `${API_URL_APP}/api/v1/get-all-Vehciles`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (data.success) setAllVehicles(data.vehicles);
    } catch (err) {
      console.error("Fetch Vehicles Error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleFetchVehicle();
  }, []);

  // 🔁 Open modal
  const openVehicleModal = (vehicle) => {
    setModalVisible(true);
    setModalLoading(true);
    setTimeout(() => {
      setSelectedVehicle(vehicle);
      setModalLoading(false);
    }, 300);
  };



  // 🔄 Toggle active / inactive from modal
  const toggleActiveVehicle = async (vehicle) => {
    try {
      setModalLoading(true);
      await axios.patch(
        `${API_URL_APP}/api/v1/change-active-vehicle/${vehicle._id}`,
        { is_active: !vehicle.is_active },
        { headers: { Authorization: `Bearer ${token}` } }
      );

        handleFetchVehicle();

    } catch (err) {
        const msg = err.response.data.message 
        Alert.alert(msg)
      console.error("Toggle Active Error:", err.response.data);
    } finally {
      setModalLoading(false);
    }
  };

  const renderVehicle = ({ item }) => {
    const vehicleImage =
      item.vehicle_type === "mini"
        ? mini
        : item.vehicle_type === "sedan"
        ? sedan
        : suv;

    return (
      <TouchableOpacity
        onPress={() => openVehicleModal(item)}
        activeOpacity={0.8}
        style={[styles.card, item.is_active && styles.activeCard]}
      >
        {/* Status Badge */}
        <View style={styles.cardHeader}>
          <View
            style={[
              styles.statusBadge,
              item.is_active ? styles.activeBadge : styles.inactiveBadge,
            ]}
          >
            <View
              style={[
                styles.statusDot,
                item.is_active ? styles.activeDot : styles.inactiveDot,
              ]}
            />
            <Text
              style={[
                styles.statusText,
                item.is_active ? styles.activeText : styles.inactiveText,
              ]}
            >
              {item.is_active ? "Active" : "Inactive"}
            </Text>
          </View>
        </View>

        {/* Vehicle Image and Info */}
        <View style={styles.cardContent}>
          <View style={styles.vehicleImageContainer}>
            <Image
              source={vehicleImage}
              style={styles.vehicleImage}
              resizeMode="contain"
            />
          </View>

          <View style={styles.vehicleInfo}>
            <Text style={styles.vehicleNumber}>{item.vehicle_number}</Text>
            <Text style={styles.vehicleName}>{item.vehicle_name}</Text>

            <View style={styles.detailsRow}>
              <View style={styles.detailItem}>
                <Ionicons
                  name="speedometer-outline"
                  size={14}
                  color="#6B7280"
                />
                <Text style={styles.detailText}>{item.fuel_type}</Text>
              </View>
              <View style={styles.detailItem}>
                <Ionicons name="people-outline" size={14} color="#6B7280" />
                <Text style={styles.detailText}>
                  {item.seating_capacity} seats
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* View Details Arrow */}
        <View style={styles.viewDetailsContainer}>
          <Text style={styles.viewDetailsText}>View Details</Text>
          <Ionicons name="chevron-forward" size={18} color="#6B7280" />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <BackWithLogo
        title="My Vehicles"
        navigation={navigation}
        isLogo={false}
      />

      {/* ➕ Add Vehicle */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() =>
          navigation.navigate("addVehcile", {
            driverId: driver?._id,
            mobile:driver.driver_contact_number,
            fromAll: true,
          })
        }
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.loadingText}>Loading vehicles...</Text>
        </View>
      ) : allVehicles.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="car-off" size={80} color="#D1D5DB" />
          <Text style={styles.emptyText}>No vehicles found</Text>
          <Text style={styles.emptySubtext}>
            Add your first vehicle to get started
          </Text>
        </View>
      ) : (
        <FlatList
          data={allVehicles}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          renderItem={renderVehicle}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* 📋 Vehicle Details Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setModalVisible(false)}
            >
              <Ionicons name="close" size={28} color="black" />
            </TouchableOpacity>

            {modalLoading || !selectedVehicle ? (
              <ActivityIndicator size="large" style={{ marginTop: 40 }} />
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.modalHeader}>
                  <Image
                    source={
                      selectedVehicle.vehicle_type === "mini"
                        ? mini
                        : selectedVehicle.vehicle_type === "sedan"
                        ? sedan
                        : suv
                    }
                    style={styles.modalVehicleImage}
                    resizeMode="contain"
                  />
                  <Text style={styles.modalTitle}>
                    {selectedVehicle.vehicle_number}
                  </Text>
                  <View
                    style={[
                      styles.modalStatusBadge,
                      selectedVehicle.is_active
                        ? styles.modalActiveBadge
                        : styles.modalInactiveBadge,
                    ]}
                  >
                    <Text
                      style={[
                        styles.modalStatusText,
                        selectedVehicle.is_active
                          ? styles.modalActiveText
                          : styles.modalInactiveText,
                      ]}
                    >
                      {selectedVehicle.is_active ? "Active" : "Inactive"}
                    </Text>
                  </View>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.sectionTitle}>Vehicle Information</Text>
                  <DetailRow
                    label="Vehicle Number"
                    value={selectedVehicle.vehicle_number}
                  />
                  <DetailRow
                    label="Vehicle Name"
                    value={selectedVehicle.vehicle_name}
                  />
                  <DetailRow
                    label="Vehicle Type"
                    value={selectedVehicle.vehicle_type}
                  />
                  <DetailRow
                    label="Fuel Type"
                    value={selectedVehicle.fuel_type}
                  />
                  <DetailRow
                    label="Brand"
                    value={selectedVehicle.vehicle_brand}
                  />
                  <DetailRow
                    label="Seating Capacity"
                    value={selectedVehicle.seating_capacity}
                  />
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.sectionTitle}>Insurance Details</Text>
                  <DetailRow
                    label="Insurance Expiry"
                    value={
                      selectedVehicle.insurance?.expiry_date
                        ? new Date(
                            selectedVehicle.insurance.expiry_date
                          ).toLocaleDateString()
                        : "N/A"
                    }
                  />
                  <DetailRow
                    label="Insurance Verified"
                    value={selectedVehicle.insurance?.verified ? "Yes" : "No"}
                  />
                </View>

                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    selectedVehicle.is_active
                      ? styles.deactivateBtn
                      : styles.activateBtn,
                  ]}
                  onPress={() => toggleActiveVehicle(selectedVehicle)}
                  disabled={modalLoading}
                >
                  {modalLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons
                        name={
                          selectedVehicle.is_active
                            ? "close-circle-outline"
                            : "checkmark-circle-outline"
                        }
                        size={20}
                        color="#fff"
                      />
                      <Text style={styles.actionText}>
                        {selectedVehicle.is_active
                          ? "Deactivate Vehicle"
                          : "Make Active"}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* 🎨 Styles */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FB" },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6B7280",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 8,
    textAlign: "center",
  },
  card: {
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: "#fff",
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activeCard: {
    borderWidth: 2,
    borderColor: "#10B981",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  activeBadge: {
    backgroundColor: "#DCFCE7",
  },
  inactiveBadge: {
    backgroundColor: "#FEE2E2",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  activeDot: {
    backgroundColor: "#10B981",
  },
  inactiveDot: {
    backgroundColor: "#EF4444",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  activeText: {
    color: "#065F46",
  },
  inactiveText: {
    color: "#991B1B",
  },
  switchContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  vehicleImageContainer: {
    width: 70,
    height: 70,
    borderRadius: 12,
    // backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    overflow: "hidden",
  },
  vehicleImage: {
    width: "100%",
    height: "100%",
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleNumber: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  vehicleName: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 8,
  },
  detailsRow: {
    flexDirection: "row",
    gap: 12,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: "#6B7280",
  },
  viewDetailsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  viewDetailsText: {
    fontSize: 13,
    color: "#6B7280",
    marginRight: 4,
  },
  addButton: {
    position: "absolute",
    right: 20,
    bottom: 20,
    zIndex: 10,
    backgroundColor: "#000",
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#fff",
    padding: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
  },
  modalCloseButton: {
    position: "absolute",
    right: 20,
    top: 20,
    zIndex: 10,
  },
  modalHeader: {
    alignItems: "center",
    marginBottom: 24,
    paddingTop: 20,
  },
  modalVehicleImage: {
    width: 120,
    height: 120,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "700",
    marginTop: 12,
    marginBottom: 8,
    color: "#111827",
  },
  modalStatusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  modalActiveBadge: {
    backgroundColor: "#DCFCE7",
  },
  modalInactiveBadge: {
    backgroundColor: "#FEE2E2",
  },
  modalStatusText: {
    fontSize: 13,
    fontWeight: "600",
  },
  modalActiveText: {
    color: "#065F46",
  },
  modalInactiveText: {
    color: "#991B1B",
  },
  modalSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  detailLabel: {
    fontSize: 14,
    color: "#6B7280",
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    flex: 1,
    textAlign: "right",
  },
  actionBtn: {
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  activateBtn: {
    backgroundColor: "#10B981",
  },
  deactivateBtn: {
    backgroundColor: "#EF4444",
  },
  actionText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
});
