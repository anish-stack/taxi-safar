import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  Modal,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import axios from "axios";
import loginStore from "../../store/auth.store";
import Layout from "../common/layout";
import useDriverStore from "../../store/driver.store";
import { API_URL_APP } from "../../constant/api";

export default function Withdraw() {
  const navigation = useNavigation();
  const route = useRoute();
  const availableBalance = route.params?.availableBalance || 0;
  const { token } = loginStore();
  const { driver, fetchDriverDetails } = useDriverStore();
  const BankDetails = driver?.BankDetails || {};

  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showBankModal, setShowBankModal] = useState(false);
  const [showBankForm, setShowBankForm] = useState(false);
  const [newBankDetails, setNewBankDetails] = useState({
    accountHolderName: "",
    accountNumber: "",
    ifscCode: "",
    bankName: "",
    branchName: "",
  });

  useEffect(() => {
    fetchDriverDetails();
  }, []);

  // Quick amount selection
  const quickAmounts = [500, 1000, 2000, 5000];

  const handleQuickAmount = (value) => {
    if (value <= availableBalance) {
      setAmount(value.toString());
      setError(null);
    } else {
      setError("Amount exceeds available balance");
    }
  };

  // When user clicks submit - show bank selection modal
  const handleProceedToBank = () => {
    // Validation
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }

    if (parseFloat(amount) > availableBalance) {
      Alert.alert("Error", "Amount exceeds available balance");
      return;
    }

    // Show bank selection modal
    setShowBankModal(true);
  };

  // User selects existing bank
  const handleUseExistingBank = async () => {
    setShowBankModal(false);

    Alert.alert(
      "Confirm Withdrawal",
      `Withdraw ₹${parseFloat(amount).toLocaleString("en-IN")} to ${
        BankDetails.bank_name
      } account ending in ${BankDetails.account_number?.slice(-4)}?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Confirm", onPress: () => submitWithdrawal(true) },
      ]
    );
  };

  // User wants to add new bank
  const handleAddNewBank = () => {
    setShowBankModal(false);
    setShowBankForm(true);
  };

  // Submit withdrawal with bank details
  const submitWithdrawal = async (useExisting = true, bankData = null) => {
    try {
      setLoading(true);
      setError(null);

      const payload = {
        driver_id: driver._id,
        amount: parseFloat(amount),
      };

      if (useExisting) {
        payload.bank_details_id = BankDetails._id;
      } else {
        payload.account_holder_name = bankData.accountHolderName;
        payload.account_number = bankData.accountNumber;
        payload.ifsc_code = bankData.ifscCode;
        payload.bank_name = bankData.bankName;
        payload.branch_name = bankData.branchName;
      }

      const response = await axios.post(
        `${API_URL_APP}/api/v1/withdrawals`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      Alert.alert("Success", "Withdrawal request submitted successfully!", [
        {
          text: "OK",
          onPress: () => {
            setAmount("");
            setNewBankDetails({
              accountHolderName: "",
              accountNumber: "",
              ifscCode: "",
              bankName: "",
              branchName: "",
            });
            navigation.goBack();
          },
        },
      ]);
    } catch (err) {
      console.error("Withdrawal error:", err);
      Alert.alert(
        "Error",
        err?.response?.data?.message || "Failed to process withdrawal"
      );
    } finally {
      setLoading(false);
    }
  };

  // Save new bank details and submit withdrawal
  const handleSubmitWithNewBank = () => {
    // Validation
    if (
      !newBankDetails.accountHolderName ||
      !newBankDetails.accountNumber ||
      !newBankDetails.ifscCode ||
      !newBankDetails.bankName
    ) {
      Alert.alert("Error", "Please fill all required fields");
      return;
    }

    // IFSC validation
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (!ifscRegex.test(newBankDetails.ifscCode)) {
      Alert.alert("Error", "Please enter a valid IFSC code");
      return;
    }

    Alert.alert(
      "Confirm Withdrawal",
      `Withdraw ₹${parseFloat(amount).toLocaleString("en-IN")} to ${
        newBankDetails.bankName
      } account ${newBankDetails.accountNumber}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: () => {
            submitWithdrawal(false, newBankDetails);
            setShowBankForm(false);
          },
        },
      ]
    );
  };

  return (
    <Layout scrollable={true} showHeader={true} title="Withdraw">
      <View style={styles.container}>
        {/* Available Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balanceAmount}>
            ₹{availableBalance.toLocaleString("en-IN")}
          </Text>
        </View>

        {/* Withdrawal Amount Card */}
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
          >
            <ScrollView
              contentContainerStyle={{ flexGrow: 1 }}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.withdrawCard}>
                <Text style={styles.withdrawTitle}>
                  Enter Withdrawal Amount
                </Text>

                <View style={styles.amountInputContainer}>
                  <Text style={styles.rupeeSymbol}>₹</Text>
                  <TextInput
                    style={styles.amountInput}
                    value={amount}
                    onChangeText={(text) => {
                      setAmount(text);
                      setError(null);
                    }}
                    placeholder="0"
                    placeholderTextColor="#CCC"
                    keyboardType="number-pad"
                    returnKeyType="done"
                    onSubmitEditing={() => {
                      Keyboard.dismiss();
                      if (!loading && parseFloat(amount) > 0) {
                        handleProceedToBank();
                      }
                    }}
                  />
                </View>

                {error && <Text style={styles.errorText}>{error}</Text>}

                {/* Quick Amount Buttons */}
                <Text style={styles.quickLabel}>Quick Select</Text>
                <View style={styles.quickAmounts}>
                  {quickAmounts.map((value) => (
                    <TouchableOpacity
                      key={value}
                      style={[
                        styles.quickBtn,
                        amount === value.toString() && styles.quickBtnActive,
                      ]}
                      onPress={() => handleQuickAmount(value)}
                    >
                      <Text
                        style={[
                          styles.quickBtnText,
                          amount === value.toString() &&
                            styles.quickBtnTextActive,
                        ]}
                      >
                        ₹{value}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  (!amount || parseFloat(amount) <= 0) &&
                    styles.submitBtnDisabled,
                ]}
                onPress={handleProceedToBank}
                disabled={loading || !amount || parseFloat(amount) <= 0}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>Proceed to Withdraw</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>

        {/* Info Note */}
        <View style={styles.infoNote}>
          <Ionicons name="information-circle-outline" size={20} color="#666" />
          <Text style={styles.infoNoteText}>
            Withdrawal will be processed within 24-48 hours
          </Text>
        </View>

        {/* Bank Selection Modal */}
        <Modal
          visible={showBankModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowBankModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Bank Account</Text>
                <TouchableOpacity onPress={() => setShowBankModal(false)}>
                  <Ionicons name="close" size={24} color="#000" />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalSubtitle}>
                Withdrawing ₹{parseFloat(amount).toLocaleString("en-IN")}
              </Text>

              {/* Existing Bank Option */}
              {BankDetails._id && (
                <TouchableOpacity
                  style={styles.bankOption}
                  onPress={handleUseExistingBank}
                >
                  <View style={styles.bankOptionContent}>
                    <MaterialCommunityIcons
                      name="bank"
                      size={24}
                      color="#000"
                    />
                    <View style={styles.bankOptionInfo}>
                      <Text style={styles.bankOptionTitle}>
                        {BankDetails.account_holder_name}
                      </Text>
                      <Text style={styles.bankOptionSubtitle}>
                        {BankDetails.bank_name} - XXXX{" "}
                        {BankDetails.account_number?.slice(-4)}
                      </Text>
                      {BankDetails.verified && (
                        <View style={styles.verifiedInline}>
                          <Ionicons
                            name="checkmark-circle"
                            size={14}
                            color="#4CAF50"
                          />
                          <Text style={styles.verifiedInlineText}>
                            Verified
                          </Text>
                        </View>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={24} color="#666" />
                  </View>
                </TouchableOpacity>
              )}

              {/* New Bank Option */}
              <TouchableOpacity
                style={styles.bankOption}
                onPress={handleAddNewBank}
              >
                <View style={styles.bankOptionContent}>
                  <MaterialCommunityIcons
                    name="bank-plus"
                    size={24}
                    color="#000"
                  />
                  <View style={styles.bankOptionInfo}>
                    <Text style={styles.bankOptionTitle}>
                      Use Different Bank Account
                    </Text>
                    <Text style={styles.bankOptionSubtitle}>
                      Add new bank details for this withdrawal
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={24} color="#666" />
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* New Bank Details Form Modal */}
        <Modal
          visible={showBankForm}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowBankForm(false)}
        >
          <View style={styles.modalOverlay}>
            <ScrollView style={styles.formModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add Bank Details</Text>
                <TouchableOpacity onPress={() => setShowBankForm(false)}>
                  <Ionicons name="close" size={24} color="#000" />
                </TouchableOpacity>
              </View>

              <View style={styles.formContainer}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    Account Holder Name <Text style={styles.required}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={newBankDetails.accountHolderName}
                    onChangeText={(text) =>
                      setNewBankDetails({
                        ...newBankDetails,
                        accountHolderName: text,
                      })
                    }
                    placeholder="Enter account holder name"
                    placeholderTextColor="#999"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    Account Number <Text style={styles.required}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={newBankDetails.accountNumber}
                    onChangeText={(text) =>
                      setNewBankDetails({
                        ...newBankDetails,
                        accountNumber: text,
                      })
                    }
                    placeholder="Enter account number"
                    placeholderTextColor="#999"
                    keyboardType="number-pad"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    IFSC Code <Text style={styles.required}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={newBankDetails.ifscCode}
                    onChangeText={(text) =>
                      setNewBankDetails({
                        ...newBankDetails,
                        ifscCode: text.toUpperCase(),
                      })
                    }
                    placeholder="Enter IFSC code"
                    placeholderTextColor="#999"
                    autoCapitalize="characters"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    Bank Name <Text style={styles.required}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={newBankDetails.bankName}
                    onChangeText={(text) =>
                      setNewBankDetails({ ...newBankDetails, bankName: text })
                    }
                    placeholder="Enter bank name"
                    placeholderTextColor="#999"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Branch Name</Text>
                  <TextInput
                    style={styles.input}
                    value={newBankDetails.branchName}
                    onChangeText={(text) =>
                      setNewBankDetails({
                        ...newBankDetails,
                        branchName: text,
                      })
                    }
                    placeholder="Enter branch name (optional)"
                    placeholderTextColor="#999"
                  />
                </View>

                <TouchableOpacity
                  style={styles.submitFormBtn}
                  onPress={handleSubmitWithNewBank}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.submitFormBtnText}>
                      Submit Withdrawal
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </Modal>
      </View>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  balanceCard: {
    backgroundColor: "#000",
    padding: 24,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: "center",
  },
  balanceLabel: {
    fontSize: 14,
    color: "#CCC",
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: "700",
    color: "#fff",
  },
  withdrawCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  withdrawTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
    marginBottom: 16,
  },
  amountInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#000",
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  rupeeSymbol: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000",
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 32,
    fontWeight: "700",
    color: "#000",
    paddingVertical: 16,
  },
  errorText: {
    fontSize: 12,
    color: "#F44336",
    marginBottom: 12,
  },
  quickLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginBottom: 12,
    marginTop: 8,
  },
  quickAmounts: {
    flexDirection: "row",
    gap: 10,
  },
  quickBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    alignItems: "center",
    backgroundColor: "#F8F8F8",
  },
  quickBtnActive: {
    backgroundColor: "#000",
    borderColor: "#000",
  },
  quickBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
  },
  quickBtnTextActive: {
    color: "#fff",
  },
  submitBtn: {
    backgroundColor: "#000",
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 16,
  },
  submitBtnDisabled: {
    backgroundColor: "#CCC",
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  infoNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    backgroundColor: "#F8F8F8",
    borderRadius: 8,
  },
  infoNoteText: {
    fontSize: 12,
    color: "#666",
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 70,
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000",
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
  },
  bankOption: {
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    backgroundColor: "#F8F8F8",
  },
  bankOptionContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  bankOptionInfo: {
    flex: 1,
  },
  bankOptionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#000",
    marginBottom: 4,
  },
  bankOptionSubtitle: {
    fontSize: 13,
    color: "#666",
  },
  verifiedInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  verifiedInlineText: {
    fontSize: 11,
    color: "#4CAF50",
    fontWeight: "600",
  },
  formModalContent: {
    flex: 1,
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  formContainer: {
    paddingBottom: 40,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
    marginBottom: 8,
  },
  required: {
    color: "#F44336",
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: "#000",
    backgroundColor: "#F8F8F8",
  },
  submitFormBtn: {
    backgroundColor: "#000",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  submitFormBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});
