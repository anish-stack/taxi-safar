import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Switch,
  Image,
  Alert,
  RefreshControl,
  ScrollView,
} from "react-native";
import React, { useEffect, useState, useCallback, useRef } from "react";
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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);

  const { token } = loginStore();
  const { driver } = useDriverStore();
  const intervalRef = useRef(null);

  const fetchVehicles = async (isPullToRefresh = false) => {
    try {
      if (!isPullToRefresh) setLoading(true);
      else setRefreshing(true);

      const { data } = await axios.get(`${API_URL_APP}/api/v1/get-all-Vehciles`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data.success) {
        setAllVehicles(data.vehicles || []);
      }
    } catch (err) {
      console.error("Fetch Vehicles Error:", err.message);
      Alert.alert("Error", "Failed to load vehicles. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    fetchVehicles(true);
  }, [token]);

  useEffect(() => {
    fetchVehicles();
  }, [token, navigation]);

  const openVehicleModal = (vehicle) => {
    setSelectedVehicle(vehicle);
    setModalVisible(true);
    setModalLoading(false);
  };

  const toggleActiveVehicle = async (vehicle) => {
    try {
      setModalLoading(true);
      await axios.patch(
        `${API_URL_APP}/api/v1/change-active-vehicle/${vehicle._id}`,
        { is_active: !vehicle.is_active },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchVehicles();
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to update status";
      Alert.alert("Error", msg);
    } finally {
      setModalLoading(false);
    }
  };

  const getVehicleImage = (vehicleType) => {
    switch (vehicleType) {
      case "mini":
        return mini;
      case "sedan":
        return sedan;
      default:
        return suv;
    }
  };

  const renderVehicle = ({ item }) => (
    <TouchableOpacity
      activeOpacity={0.85}
      style={[styles.card, item.is_active && styles.activeCard]}
    >
      {/* Header: Status Badge + Toggle Switch */}
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

        <Switch
          value={item.is_active}
          onValueChange={() => toggleActiveVehicle(item)}
          trackColor={{ false: "#E5E7EB", true: "#A7F3D0" }}
          thumbColor={item.is_active ? "#10B981" : "#9CA3AF"}
        />
      </View>

      {/* Vehicle Info Section */}
      <View style={styles.cardContent}>
        <View style={styles.vehicleImageContainer}>
          <Image
            source={getVehicleImage(item.vehicle_type)}
            style={styles.vehicleImage}
            resizeMode="contain"
          />
        </View>

        <View style={styles.vehicleInfo}>
          <Text style={styles.vehicleNumber}>{item.vehicle_number}</Text>
          {/* <Text style={styles.vehicleName}>{item.vehicle_name}</Text> */}

          <View style={styles.detailsRow}>
            <View style={styles.detailItem}>
              <Ionicons name="speedometer-outline" size={14} color="#6B7280" />
              <Text style={styles.detailText}>{item.fuel_type}</Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="people-outline" size={14} color="#6B7280" />
              <Text style={styles.detailText}>{item.seating_capacity} seats</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Footer: Action Buttons */}
      <View style={styles.footerRow}>
        <TouchableOpacity
          style={styles.preferencesBtn}
          onPress={() => navigation.navigate("preferences")}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="tune-variant" size={22} color="#111" />
          <Text style={styles.preferencesText}>Preferences</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.viewDetailsContainer}
          onPress={() => openVehicleModal(item)}
          activeOpacity={0.7}
        >
          <Text style={styles.viewDetailsText}>View Details</Text>
          <Ionicons name="chevron-forward" size={18} color="#6B7280" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons name="car-off" size={80} color="#D1D5DB" />
      <Text style={styles.emptyText}>No vehicles found</Text>
      <Text style={styles.emptySubtext}>Add your first vehicle to get started</Text>
    </View>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.loadingText}>Loading vehicles...</Text>
        </View>
      );
    }

    return (
      <FlatList
        data={allVehicles}
        keyExtractor={(item) => item._id}
        renderItem={renderVehicle}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <BackWithLogo
        title="My Vehicles"
        navigation={navigation}
        isLogo={false}
        isPlusHow={true}
        plusOnPress={() =>
          navigation.navigate("addVehcile", {
            driverId: driver?._id,
            mobile: driver.driver_contact_number,
            fromAll: true,
          })
        }
      />

      {renderContent()}

      {/* Vehicle Details Modal */}
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
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <Image
                    source={getVehicleImage(selectedVehicle.vehicle_type)}
                    style={styles.modalVehicleImage}
                    resizeMode="contain"
                  />
                  <Text style={styles.modalTitle}>{selectedVehicle.vehicle_number}</Text>
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

            {/* Vehicle Information Section */}
<View style={styles.modalSection}>
  <Text style={styles.sectionTitle}>Vehicle Information</Text>

  {selectedVehicle?.vehicle_number && (
    <DetailRow
      label="Vehicle Number"
      value={selectedVehicle.vehicle_number}
    />
  )}

  {selectedVehicle?.vehicle_name && (
    <DetailRow
      label="Vehicle Name"
      value={selectedVehicle.vehicle_name}
    />
  )}

  {selectedVehicle?.vehicle_type && (
    <DetailRow
      label="Vehicle Type"
      value={selectedVehicle.vehicle_type}
    />
  )}

  {selectedVehicle?.fuel_type && (
    <DetailRow
      label="Fuel Type"
      value={selectedVehicle.fuel_type}
    />
  )}

  {selectedVehicle?.vehicle_brand && (
    <DetailRow
      label="Brand"
      value={selectedVehicle.vehicle_brand}
    />
  )}

 
</View>

{/* Insurance Details Section */}
<View style={styles.modalSection}>
  <Text style={styles.sectionTitle}>Insurance Details</Text>

  {selectedVehicle?.insurance?.expiry_date && (
    <DetailRow
      label="Insurance Expiry"
      value={new Date(
        selectedVehicle.insurance.expiry_date
      ).toLocaleDateString()}
    />
  )}

  {selectedVehicle?.insurance?.verified !== undefined && (
    <DetailRow
      label="Insurance Verified"
      value={selectedVehicle.insurance.verified ? "Yes" : "No"}
    />
  )}
</View>

              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* Styles */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FB",
  },
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
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  vehicleImageContainer: {
    width: 70,
    height: 70,
    borderRadius: 12,
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
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
  preferencesBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#F9FAFB",
  },
  preferencesText: {
    fontSize: 13,
    color: "#111",
    fontWeight: "500",
  },
  viewDetailsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  viewDetailsText: {
    fontSize: 13,
    color: "#6B7280",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
    paddingBottom: 40,
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
});