import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  FlatList,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import axios from "axios";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../../constant/ui";
import BackWithLogo from "../../common/back_with_logo";
import { API_URL_APP } from "../../../constant/api";
import { useRoute } from "@react-navigation/native";
import { getData } from "../../../utils/storage";
import { SafeAreaView } from "react-native-safe-area-context";
import { UniversalAlert } from "../../common/UniversalAlert";

export default function AddBank({ navigation }) {
  const route = useRoute();
  const { driverId } = route.params || {};

  // State
  const [banks, setBanks] = useState([]);
  const [filteredBanks, setFilteredBanks] = useState([]);
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [confirmAccountNumber, setConfirmAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [branchName, setBranchName] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [upiId, setUpiId] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [banksLoading, setBanksLoading] = useState(true);
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    type: "success",
    title: "",
    message: "",
    onPrimaryPress: () => setAlertVisible(false),
  });

  const showAlert = (type, title, message, onPrimaryPress = null) => {
    setAlertConfig({
      type,
      title,
      message,
      primaryButton: "OK",
      onPrimaryPress: () => {
        if (onPrimaryPress) onPrimaryPress();
        setAlertVisible(false);
      },
    });
    setAlertVisible(true);
  };

  useEffect(() => {
    fetchBanks();
  }, []);

  const fetchBanks = async () => {
    try {
      setBanksLoading(true);
      const res = await axios.get(`${API_URL_APP}/api/v1/bank-names`);

      if (res.data.success && Array.isArray(res.data.data)) {
        const bankList = res.data.data;
        setBanks(bankList);
        setFilteredBanks(bankList);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error) {
      console.error("Error fetching banks:", error);
      showAlert(
        "error",
        "Error",
        "Failed to load banks. Please check your connection and try again.",
        fetchBanks // Retry on OK press
      );
    } finally {
      setBanksLoading(false);
    }
  };

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = banks.filter((bank) =>
        bank.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredBanks(filtered);
    } else {
      setFilteredBanks(banks);
    }
  }, [searchQuery, banks]);

  const selectBank = (bank) => {
    setBankName(bank);
    setSearchQuery("");
    setSearchModalVisible(false);
    clearFieldError("bankName");
    Haptics.selectionAsync();
  };

  const setFieldError = (field, message) => {
    setErrors((prev) => ({ ...prev, [field]: message }));
  };

  const clearFieldError = (field) => {
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  };

  const renderError = (field) =>
    errors[field] ? (
      <Text
        style={{
          color: Colors.error,
          fontSize: 13,
          marginBottom: 8,
          marginLeft: 4,
        }}
      >
        {errors[field]}
      </Text>
    ) : null;

  const validateIFSC = (code) => {
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    return ifscRegex.test(code);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!bankName) newErrors.bankName = "Please select a bank";
    if (!accountHolderName.trim())
      newErrors.accountHolderName = "Please enter account holder name";
    if (!accountNumber.trim()) newErrors.accountNumber = "Please enter account number";
    if (!confirmAccountNumber.trim()) {
      newErrors.confirmAccountNumber = "Please confirm account number";
    } else if (accountNumber !== confirmAccountNumber) {
      newErrors.confirmAccountNumber = "Account numbers do not match";
    }
    if (!ifscCode.trim()) {
      newErrors.ifscCode = "Please enter IFSC code";
    } else if (!validateIFSC(ifscCode.toUpperCase())) {
      newErrors.ifscCode = "Invalid IFSC code format";
    }
    if (!branchName.trim()) newErrors.branchName = "Please enter branch name";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      showAlert("error", "Validation Error", "Please fill in all required fields correctly.");
      return;
    }

    try {
      setLoading(true);

      const getDriverId = await getData("driverid");
      const riderId = getDriverId || driverId;

      if (!riderId) {
        showAlert("error", "Error", "Driver ID not found. Please log in again.");
        return;
      }

      const data = {
        bank_name: bankName,
        account_number: accountNumber,
        ifsc_code: ifscCode?.toUpperCase(),
        branch_name: branchName,
        account_holder_name: accountHolderName,
        upi_id: upiId || undefined,
      };

      const response = await axios.post(
        `${API_URL_APP}/api/v1/add-bank-details/${riderId}`,
        data,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showAlert(
          "success",
          "Success!",
          "Bank details added successfully!",
          () =>
            navigation.reset({
              index: 0,
              routes: [{ name: "wait_screen", params: { driverId } }],
            })
        );
      } else {
        throw new Error(response.data.message || "Failed to add bank details");
      }
    } catch (error) {
      console.error("Error submitting bank details:", error.response?.data);
      let errorMessage = "Something went wrong. Please try again later.";
      if (error.response?.data?.message) errorMessage = error.response.data.message;
      else if (error.message) errorMessage = error.message;

      showAlert("error", "Error", errorMessage);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const renderProgressBar = (currentStep) => (
    <View style={styles.progressContainer}>
      {[1, 2, 3, 4].map((step) => (
        <View
          key={step}
          style={[
            styles.progressStep,
            currentStep >= step && styles.progressStepActive,
          ]}
        />
      ))}
    </View>
  );

  if (banksLoading) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <BackWithLogo />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading banks...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <BackWithLogo />
      {renderProgressBar(4)}

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Bank Account Details</Text>
          <Text style={styles.subtitle}>Enter your bank account information</Text>

          {/* Bank Name Searchable */}
          <Text style={styles.label}>Bank Name</Text>
          <TouchableOpacity
            style={styles.bankSelector}
            onPress={() => setSearchModalVisible(true)}
            disabled={loading}
          >
            <Text style={[styles.bankText, !bankName && styles.placeholderText]}>
              {bankName || "Tap to select your bank"}
            </Text>
            <Ionicons name="chevron-down" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
          {renderError("bankName")}

          {/* Account Holder Name */}
          <Text style={styles.label}>Account Holder Name</Text>
          <TextInput
            placeholder="Enter full name as per bank records"
            value={accountHolderName}
            onChangeText={(v) => {
              setAccountHolderName(v);
              clearFieldError("accountHolderName");
            }}
            style={styles.input}
            editable={!loading}
            placeholderTextColor={Colors.textSecondary}
          />
          {renderError("accountHolderName")}

          {/* Account Number */}
          <Text style={styles.label}>Account Number</Text>
          <TextInput
            placeholder="Enter account number"
            value={accountNumber}
            onChangeText={(v) => {
              setAccountNumber(v);
              clearFieldError("accountNumber");
            }}
            style={styles.input}
            keyboardType="number-pad"
            editable={!loading}
            placeholderTextColor={Colors.textSecondary}
          />
          {renderError("accountNumber")}

          {/* Confirm Account Number */}
          <Text style={styles.label}>Confirm Account Number</Text>
          <TextInput
            placeholder="Re-enter account number"
            value={confirmAccountNumber}
            onChangeText={(v) => {
              setConfirmAccountNumber(v);
              clearFieldError("confirmAccountNumber");
            }}
            style={styles.input}
            keyboardType="number-pad"
            editable={!loading}
            placeholderTextColor={Colors.textSecondary}
          />
          {renderError("confirmAccountNumber")}

          {/* IFSC Code */}
          <Text style={styles.label}>IFSC Code</Text>
          <TextInput
            placeholder="e.g. SBIN0001234"
            value={ifscCode}
            onChangeText={(v) => {
              setIfscCode(v.toUpperCase());
              clearFieldError("ifscCode");
            }}
            style={styles.input}
            autoCapitalize="characters"
            maxLength={11}
            editable={!loading}
            placeholderTextColor={Colors.textSecondary}
          />
          {renderError("ifscCode")}

          {/* Branch Name */}
          <Text style={styles.label}>Branch Name</Text>
          <TextInput
            placeholder="Enter branch name"
            value={branchName}
            onChangeText={(v) => {
              setBranchName(v);
              clearFieldError("branchName");
            }}
            style={styles.input}
            editable={!loading}
            placeholderTextColor={Colors.textSecondary}
          />
          {renderError("branchName")}



          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.nextButton, loading && styles.nextButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <Text style={styles.nextText}>Submit Bank Details</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Searchable Bank Modal */}
      <Modal
        visible={searchModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSearchModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Bank</Text>
              <TouchableOpacity onPress={() => setSearchModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <TextInput
              placeholder="Search bank..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.searchInput}
              autoFocus
              placeholderTextColor={Colors.textSecondary}
            />

            <FlatList
              data={filteredBanks}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.bankItem}
                  onPress={() => selectBank(item)}
                >
                  <Text style={styles.bankItemText}>{item}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No banks found</Text>
              }
              style={styles.bankList}
            />
          </View>
        </View>
      </Modal>
      <UniversalAlert/>
    </SafeAreaView>
  );
}

// === STYLES ===
const styles = {
  scrollContent: {
    padding: 20,
    backgroundColor: Colors.background,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 30,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.textPrimary,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: Colors.white,
    marginBottom: 6,
  },
  bankSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 16,
    backgroundColor: Colors.white,
    marginBottom: 6,
  },
  bankText: {
    fontSize: 16,
    color: Colors.textPrimary,
  },
  placeholderText: {
    color: Colors.textSecondary,
  },
  infoBox: {
    flexDirection: "row",
    backgroundColor: Colors.primaryLight || "#E3F2FD",
    padding: 12,
    borderRadius: 8,
    marginTop: 20,
    alignItems: "flex-start",
  },
  infoText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 13,
    color: "#fff",
    lineHeight: 18,
  },
  nextButton: {
    backgroundColor: Colors.primary,
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 20,
    marginBottom: 40,
  },
  nextButtonDisabled: {
    opacity: 0.6,
  },
  progressContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 8,
    marginTop: 12,
    marginBottom: 20,
  },
  progressStep: {
    flex: 1,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
  },
  progressStepActive: { backgroundColor: Colors.textPrimary },
  nextText: { color: Colors.white, fontSize: 18, fontWeight: "bold" },
  fieldError: {
    color: Colors.error,
    fontSize: 13,
    marginBottom: 8,
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.textPrimary,
  },
  searchInput: {
    margin: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    fontSize: 16,
    backgroundColor: Colors.white,
  },
  bankList: {
    paddingHorizontal: 16,
  },
  bankItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  bankItemText: {
    fontSize: 16,
    color: Colors.textPrimary,
  },
  emptyText: {
    textAlign: "center",
    padding: 20,
    color: Colors.textSecondary,
    fontSize: 16,
  },
};