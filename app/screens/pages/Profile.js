import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  Modal,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import {
  MaterialCommunityIcons,
  Ionicons,
  FontAwesome5,
} from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import loginStore from "../../store/auth.store";
import useDriverStore from "../../store/driver.store";
import Layout from "../common/layout";
import BackWithLogo from "../common/back_with_logo";
import { useNavigation } from "@react-navigation/native";
import { API_URL_APP } from "../../constant/api";
import { FloatingWidgetService } from "../../services/NativeModules";
export default function Profile() {
  const { logout, token } = loginStore();
  const { driver, fetchDriverDetails } = useDriverStore();
  const [modalVisible, setModalVisible] = useState(false);
  const [modalContent, setModalContent] = useState(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [uploading, setUploading] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ type: "", message: "" });
  const navigation = useNavigation();

  useEffect(() => {
    fetchDriverDetails();
  }, [token]);

   const stopFloatingWidget = async () => {
      if (Platform.OS !== "android") return false;
  
      try {
        console.log("🛑 Stopping floating widget...");
        await FloatingWidgetService.hideFloatingIcon();
       
        console.log("✅ Floating widget stopped");
        return true;
      } catch (error) {
        console.error("❌ Stop floating widget failed:", error);
        return false;
      }
    };
  

  const openModal = (type) => {
    setModalContent(type);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setModalContent(null);
  };

  const handleChangeDp = async () => {
    try {
      // Request camera permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Camera permission is required to change profile picture."
        );
        return;
      }

      // Launch camera with front camera
      const result = await ImagePicker.launchCameraAsync({
        cameraType: ImagePicker.CameraType.front,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        // Upload the image
        await uploadProfilePhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error changing profile picture:", error);
      Alert.alert(
        "Error",
        "Failed to change profile picture. Please try again."
      );
    }
  };

  const showAlert = (type, message) => {
    setAlertConfig({ type, message });
    setAlertVisible(true);
    setTimeout(() => setAlertVisible(false), 3000);
  };

  const uploadProfilePhoto = async (uri) => {
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("dp", {
        uri: uri,
        type: "image/jpeg",
        name: "profile.jpg",
      });

      const response = await fetch(`${API_URL_APP}/api/v1/change-dp-profile`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        showAlert("success", "Profile picture updated successfully!");
        fetchDriverDetails(); // Refresh driver details
      } else {
        throw new Error("Upload failed");
      }
    } catch (error) {
      console.error("Error uploading photo:", error);
      showAlert("error", "Failed to upload profile picture.");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAccount = () => {
    setDeleteModalVisible(true);
  };

  const confirmDeleteAccount = () => {
    if (!deleteReason.trim()) {
      Alert.alert(
        "Required",
        "Please provide a reason for deleting your account."
      );
      return;
    }

    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete your account? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              // Call your delete API here
              // await deleteAccountAPI(deleteReason);
              setDeleteModalVisible(false);
              setDeleteReason("");
              Alert.alert(
                "Account Deleted",
                "Your account has been deleted successfully."
              );
              stopFloatingWidget()
              logout(navigation);
              await FloatingWidgetService.hideFloatingIcon();
            } catch (error) {
              Alert.alert(
                "Error",
                "Failed to delete account. Please try again."
              );
            }
          },
        },
      ]
    );
  };

  const renderModalContent = () => {
    if (!driver) return null;

    switch (modalContent) {
      case "profile":
        return (
          <View>
            <Text style={styles.modalTitle}>My Driver Profile Details</Text>
            <DetailRow label="Name" value={driver.driver_name} />
            <DetailRow
              label="Date of Birth"
              value={new Date(driver.driver_dob).toLocaleDateString()}
            />
            <DetailRow label="Phone" value={driver.driver_contact_number} />
            <DetailRow label="Email" value={driver.driver_email} />
            <DetailRow
              label="Total Rides"
              value={driver.total_rides?.toString()}
            />
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
              <Text style={styles.walletAmount}>
                ₹{driver.wallet?.balance || "0"}
              </Text>
            </View>
            <DetailRow
              label="Total Rides"
              value={driver.total_rides?.toString()}
            />
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
            <DetailRow label="Vehicle Number" value={vehicle.vehicle_number} />
            <DetailRow label="Vehicle Name" value={vehicle.vehicle_name} />

            <DetailRow label="Vehicle Type" value={vehicle.vehicle_type} />

            <DetailRow
              label="Insurance Expiry"
              value={new Date(
                vehicle.insurance?.expiry_date
              ).toLocaleDateString()}
            />
            <DetailRow
              label="Insurance Verified"
              value={vehicle.insurance?.verified ? "Yes" : "No"}
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
              value={new Date(
                doc.aadhar_card?.uploaded_at
              ).toLocaleDateString()}
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
            <DetailRow
              label="Account Holder"
              value={bank.account_holder_name}
            />
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
        {/* Profile Header with Edit Button */}
        <View style={{ alignItems: "center", marginTop: 20 }}>
          <View style={{ position: "relative" }}>
            <Image
              source={{ uri: driver?.profile_photo?.url }}
              style={{ width: 90, height: 90, borderRadius: 45 }}
            />
            <TouchableOpacity
              onPress={handleChangeDp}
              disabled={uploading}
              style={{
                position: "absolute",
                bottom: 0,
                right: 0,
                backgroundColor: "black",
                borderRadius: 15,
                width: 30,
                height: 30,
                justifyContent: "center",
                alignItems: "center",
                borderWidth: 2,
                borderColor: "white",
                opacity: uploading ? 0.6 : 1,
              }}
            >
              {uploading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons name="pencil" size={14} color="white" />
              )}
            </TouchableOpacity>
          </View>
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
            label="My Driver Profile Details"
            onPress={() => openModal("profile")}
          />
          <MenuItem
            icon={<Ionicons name="business-outline" size={22} color="black" />}
            label="My Agent Profile Details"
            onPress={() => navigation.navigate("company-details")}
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
          {/* <MenuItem
            icon={
              <MaterialCommunityIcons
                name="tune-variant"
                size={22}
                color="black"
              />
            }
            label="Preferences"
            onPress={() => navigation.navigate("preferences")}
          /> */}

          <MenuItem
            icon={<Ionicons name="car-outline" size={22} color="black" />}
            label="Vehicles Selection"
            subText={`${driver?.current_vehicle_id?.vehicle_name || ""} - ${
              driver?.current_vehicle_id?.vehicle_number || ""
            } (${
              driver?.current_vehicle_id?.is_active ? "Active" : "Inactive"
            })`}
            onPress={() => navigation.navigate("all-vehicle")}
          />

          <MenuItem
            onPress={() => navigation.navigate("job-posted-u")}
            icon={<Ionicons name="bag" size={22} color="black" />}
            label="Jobs Posted You"
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
            onPress={handleDeleteAccount}
          />
          <MenuItem
            icon={<Ionicons name="log-out-outline" size={22} color="#dc2626" />}
            label="Logout"
            color="#dc2626"
            onPress={async () => {
              stopFloatingWidget()
              await FloatingWidgetService.hideFloatingIcon();
              logout(navigation);
            }}
          />
        </Section>
      </ScrollView>

      {/* Detail Modal */}
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

      {/* Delete Account Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={deleteModalVisible}
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalContainer}>
            <View style={styles.deleteIconContainer}>
              <Ionicons name="warning" size={50} color="#dc2626" />
            </View>

            <Text style={styles.deleteModalTitle}>Delete Account</Text>
            <Text style={styles.deleteModalSubtitle}>
              We're sorry to see you go. Please tell us why you're deleting your
              account.
            </Text>

            <TextInput
              style={styles.deleteReasonInput}
              placeholder="Reason for deletion..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
              value={deleteReason}
              onChangeText={setDeleteReason}
              textAlignVertical="top"
            />

            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                style={[styles.deleteModalButton, styles.cancelButton]}
                onPress={() => {
                  setDeleteModalVisible(false);
                  setDeleteReason("");
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.deleteModalButton, styles.deleteButton]}
                onPress={confirmDeleteAccount}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Custom Alert Modal */}
      {alertVisible && (
        <View style={styles.alertContainer}>
          <View
            style={[
              styles.alertBox,
              alertConfig.type === "success"
                ? styles.alertSuccess
                : styles.alertError,
            ]}
          >
            <View style={styles.alertIconContainer}>
              <Ionicons
                name={
                  alertConfig.type === "success"
                    ? "checkmark-circle"
                    : "close-circle"
                }
                size={24}
                color="white"
              />
            </View>
            <Text style={styles.alertText}>{alertConfig.message}</Text>
          </View>
        </View>
      )}

      {/* Upload Loader Overlay */}
      {uploading && (
        <View style={styles.uploadingOverlay}>
          <View style={styles.uploadingContainer}>
            <ActivityIndicator size="large" color="black" />
            <Text style={styles.uploadingText}>Uploading...</Text>
          </View>
        </View>
      )}
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
    textTransform: "capitalize",
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
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  deleteModalContainer: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 400,
  },
  deleteIconContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  deleteModalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "black",
    textAlign: "center",
    marginBottom: 8,
  },
  deleteModalSubtitle: {
    fontSize: 14,
    color: "gray",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  deleteReasonInput: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 100,
    marginBottom: 20,
    backgroundColor: "#F8F9FB",
  },
  deleteModalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  deleteModalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#F0F0F0",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "black",
  },
  deleteButton: {
    backgroundColor: "#dc2626",
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
  alertContainer: {
    position: "absolute",
    top: 60,
    left: 20,
    right: 20,
    zIndex: 9999,
    alignItems: "center",
  },
  alertBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    minWidth: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  alertSuccess: {
    backgroundColor: "#10b981",
  },
  alertError: {
    backgroundColor: "#ef4444",
  },
  alertIconContainer: {
    marginRight: 12,
  },
  alertText: {
    color: "white",
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
  },
  uploadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9998,
  },
  uploadingContainer: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 30,
    alignItems: "center",
    minWidth: 150,
  },
  uploadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: "600",
    color: "black",
  },
});
