import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  Modal,
  StyleSheet,
} from "react-native";
import { MaterialCommunityIcons, Ionicons, FontAwesome5 } from "@expo/vector-icons";
import loginStore from "../../store/auth.store";
import useDriverStore from "../../store/driver.store";
import Layout from "../common/layout";
import BackWithLogo from "../common/back_with_logo";
import { useNavigation } from "@react-navigation/native";

export default function Profile() {
  const { logout, token } = loginStore();
  const { driver, fetchDriverDetails } = useDriverStore();
  const [modalVisible, setModalVisible] = useState(false);
  const [modalContent, setModalContent] = useState(null);
  const navigation = useNavigation()
  useEffect(() => {
    fetchDriverDetails();
  }, [token]);

  const openModal = (type) => {
    setModalContent(type);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setModalContent(null);
  };

  const renderModalContent = () => {
    if (!driver) return null;

    switch (modalContent) {
      case "profile":
        return (
          <View>
            <Text style={styles.modalTitle}>Profile Details</Text>
            <DetailRow label="Name" value={driver.driver_name} />
            <DetailRow label="Email" value={driver.driver_email} />
            <DetailRow label="Phone" value={driver.driver_contact_number} />
            <DetailRow label="Gender" value={driver.driver_gender} />
            <DetailRow
              label="Date of Birth"
              value={new Date(driver.driver_dob).toLocaleDateString()}
            />
            <DetailRow label="Account Status" value={driver.account_status} />
            <DetailRow label="Total Rides" value={driver.total_rides?.toString()} />
            <DetailRow
              label="Completed Rides"
              value={driver.completed_rides?.toString()}
            />
            <DetailRow
              label="Average Rating"
              value={driver.average_rating?.toFixed(1)}
            />
          </View>
        );

      case "wallet":
        return (
          <View>
            <Text style={styles.modalTitle}>My Wallet</Text>
            <View style={styles.walletCard}>
              <Text style={styles.walletLabel}>Current Balance</Text>
              <Text style={styles.walletAmount}>₹{driver.wallet?.balance || "0"}</Text>
            </View>
            <DetailRow label="Total Rides" value={driver.total_rides?.toString()} />
            <DetailRow
              label="Completed Rides"
              value={driver.completed_rides?.toString()}
            />
          </View>
        );

      case "vehicle":
        const vehicle = driver.current_vehicle_id;
        if (!vehicle) return <Text>No vehicle information available</Text>;
        return (
          <View>
            <Text style={styles.modalTitle}>Vehicle Details</Text>
            <DetailRow label="Vehicle Brand" value={vehicle.vehicle_brand} />
            <DetailRow label="Vehicle Number" value={vehicle.vehicle_number} />
            <DetailRow label="Vehicle Type" value={vehicle.vehicle_type} />
            <DetailRow
              label="Active Status"
              value={vehicle.is_active ? "Active" : "Inactive"}
            />
            <DetailRow
              label="Insurance Expiry"
              value={new Date(vehicle.insurance?.expiry_date).toLocaleDateString()}
            />
            <DetailRow
              label="Insurance Verified"
              value={vehicle.insurance?.verified ? "Yes" : "No"}
            />
            <DetailRow
              label="RC Expiry"
              value={new Date(
                vehicle.registration_certificate?.expiry_date
              ).toLocaleDateString()}
            />
            <DetailRow
              label="Registration Date"
              value={new Date(
                vehicle.registration_certificate?.register_date
              ).toLocaleDateString()}
            />
          </View>
        );

      case "document":
        const doc = driver.document_id;
        if (!doc) return <Text>No document information available</Text>;
        return (
          <View>
            <Text style={styles.modalTitle}>Document Registration</Text>
            <SectionHeader title="Aadhar Card" />
            <DetailRow
              label="Number"
              value={doc.aadhar_card?.document_number}
            />
            <DetailRow
              label="Verified"
              value={doc.aadhar_card?.verified ? "Yes" : "No"}
            />
            <DetailRow
              label="Uploaded"
              value={new Date(doc.aadhar_card?.uploaded_at).toLocaleDateString()}
            />

            <SectionHeader title="Driving License" />
            <DetailRow
              label="License Number"
              value={doc.driving_license?.license_number}
            />
            <DetailRow
              label="Expiry Date"
              value={new Date(
                doc.driving_license?.expiry_date
              ).toLocaleDateString()}
            />
            <DetailRow
              label="Verified"
              value={doc.driving_license?.verified ? "Yes" : "No"}
            />

            <SectionHeader title="PAN Card" />
            <DetailRow
              label="Verified"
              value={doc.pan_card?.verified ? "Yes" : "No"}
            />
            <DetailRow
              label="Uploaded"
              value={new Date(doc.pan_card?.uploaded_at).toLocaleDateString()}
            />

            <DetailRow
              label="All Documents Verified"
              value={doc.all_verified ? "Yes" : "No"}
            />
          </View>
        );

      case "bank":
        const bank = driver.BankDetails;
        if (!bank) return <Text>No bank details available</Text>;
        return (
          <View>
            <Text style={styles.modalTitle}>Bank Details</Text>
            <DetailRow label="Bank Name" value={bank.bank_name} />
            <DetailRow label="Account Holder" value={bank.account_holder_name} />
            <DetailRow label="Account Number" value={bank.account_number} />
            <DetailRow label="IFSC Code" value={bank.ifsc_code} />
            <DetailRow label="Branch Name" value={bank.branch_name} />
            <DetailRow label="Verified" value={bank.verified ? "Yes" : "No"} />
          </View>
        );

      default:
        return null;
    }
  };

  if (!driver) return null;

  return (
    <Layout showHeader={false}>
      <BackWithLogo />
      <ScrollView
        style={{ flex: 1, backgroundColor: "#F8F9FB" }}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Profile Header */}
        <View style={{ alignItems: "center", marginTop: 20 }}>
          <Image
            source={{ uri: driver?.profile_photo?.url }}
            style={{ width: 90, height: 90, borderRadius: 45 }}
          />
          <Text style={{ fontSize: 20, fontWeight: "700", marginTop: 10 }}>
            {driver?.driver_name || "Driver Name"}
          </Text>
          <Text style={{ color: "gray", fontSize: 14 }}>
            {driver?.driver_email}
          </Text>
        </View>

        {/* Wallet Card */}
        <TouchableOpacity
          onPress={() => openModal("wallet")}
          style={{
            marginTop: 20,
            marginHorizontal: 20,
            backgroundColor: "black",
            borderRadius: 12,
            padding: 16,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <MaterialCommunityIcons name="wallet" size={24} color="white" />
            <View style={{ marginLeft: 10 }}>
              <Text style={{ color: "white", fontSize: 13 }}>
                My Wallet Balance
              </Text>
              <Text style={{ color: "white", fontSize: 18, fontWeight: "700" }}>
                ₹{driver?.wallet?.balance || "0"}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="white" />
        </TouchableOpacity>

        {/* General Section */}
        <Section title="General">
          <MenuItem
            icon={<Ionicons name="person-outline" size={22} color="black" />}
            label="Profile Details"
            onPress={() => openModal("profile")}
          />
          <MenuItem
            icon={
              <MaterialCommunityIcons
                name="wallet-outline"
                size={22}
                color="black"
              />
            }
            label="My Wallet"
            onPress={() => navigation.navigate("wallet")}
          />
          <MenuItem
            icon={<FontAwesome5 name="gift" size={20} color="black" />}
            label="Offer List"
          />
          <MenuItem
            icon={<Ionicons name="car-outline" size={22} color="black" />}
            label="Vehicles Selection"
            subText={
              driver?.current_vehicle_id?.vehicle_brand +
              " " +
              driver?.current_vehicle_id?.vehicle_number
            }
            onPress={() => openModal("vehicle")}
          />
          <MenuItem
            icon={<Ionicons name="settings-outline" size={22} color="black" />}
            label="App Settings"
          />
        </Section>

        {/* Registration Section */}
        <Section title="Registration Details">
          <MenuItem
            icon={
              <Ionicons name="document-text-outline" size={22} color="black" />
            }
            label="Document Registration"
            onPress={() => openModal("document")}
          />
          <MenuItem
            icon={<Ionicons name="car-outline" size={22} color="black" />}
            label="Vehicle Registration"
            onPress={() => openModal("vehicle")}
          />
          <MenuItem
            icon={<Ionicons name="business-outline" size={22} color="black" />}
            label="Bank Details"
            onPress={() => openModal("bank")}
          />
        </Section>

        {/* Alert Zone */}
        <Section title="Alert Zone">
          <MenuItem
            icon={
              <Ionicons name="close-circle-outline" size={22} color="#dc2626" />
            }
            label="Delete Account"
            color="#dc2626"
          />
          <MenuItem
            icon={<Ionicons name="log-out-outline" size={22} color="#dc2626" />}
            label="Logout"
            color="#dc2626"
            onPress={logout}
          />
        </Section>
      </ScrollView>

      {/* Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
              <Ionicons name="close" size={28} color="black" />
            </TouchableOpacity>
            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={{ paddingBottom: 20 }}
            >
              {renderModalContent()}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Layout>
  );
}

/* ---------- Helper Components ---------- */

const Section = ({ title, children }) => (
  <View style={{ backgroundColor: "white", margin: 16, borderRadius: 12 }}>
    <Text
      style={{
        color: "gray",
        fontSize: 13,
        fontWeight: "500",
        paddingHorizontal: 16,
        paddingTop: 12,
      }}
    >
      {title}
    </Text>
    <View style={{ paddingVertical: 8 }}>{children}</View>
  </View>
);

const MenuItem = ({ icon, label, onPress, subText, color = "black" }) => (
  <TouchableOpacity
    onPress={onPress}
    style={{
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 12,
      paddingHorizontal: 16,
    }}
  >
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      {icon}
      <View style={{ marginLeft: 12 }}>
        <Text style={{ fontSize: 15, fontWeight: "500", color }}>{label}</Text>
        {subText && (
          <Text style={{ color: "gray", fontSize: 12, marginTop: 2 }}>
            {subText}
          </Text>
        )}
      </View>
    </View>
    <Ionicons name="chevron-forward" size={18} color="gray" />
  </TouchableOpacity>
);

const DetailRow = ({ label, value }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value || "N/A"}</Text>
  </View>
);

const SectionHeader = ({ title }) => (
  <Text style={styles.sectionHeader}>{title}</Text>
);

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    paddingTop: 20,
  },
  modalScroll: {
    paddingHorizontal: 20,
  },
  closeButton: {
    position: "absolute",
    right: 20,
    top: 20,
    zIndex: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 20,
    color: "black",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  detailLabel: {
    fontSize: 14,
    color: "gray",
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "black",
    flex: 1,
    textAlign: "right",
  },
  walletCard: {
    backgroundColor: "#F8F9FB",
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 20,
  },
  walletLabel: {
    fontSize: 14,
    color: "gray",
    marginBottom: 8,
  },
  walletAmount: {
    fontSize: 32,
    fontWeight: "700",
    color: "black",
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: "600",
    color: "black",
    marginTop: 20,
    marginBottom: 10,
  },
});