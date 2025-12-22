// screens/wallet/RechargeScreen.js
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft } from "lucide-react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import RazorpayCheckout from "react-native-razorpay";
import axios from "axios";

import { API_URL_APP } from "../../constant/api";
import loginStore from "../../store/auth.store";
import {
  UniversalAlert,
  PaymentConfirmationModal,
} from "../common/UniversalAlert";
import useDriverStore from "../../store/driver.store";

const PRESET_AMOUNTS = [500, 1000, 2000, 3000, 4000, 5000];
const MIN_RECHARGE_AMOUNT = 100;
const MAX_RECHARGE_AMOUNT = 30000;

export default function RechargeScreen() {
  const navigation = useNavigation();
  const { token } = loginStore();
  const route = useRoute();
  const { amount } = route.params || 0;
  const { driver, fetchDriverDetails } = useDriverStore();

  const [selectedAmount, setSelectedAmount] = useState(null);
  const [customAmount, setCustomAmount] = useState("");
  const [loading, setLoading] = useState(false);

  // Alert States
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    type: "success",
    title: "",
    message: "",
    primaryButton: "OK",
    onPrimaryPress: () => setAlertVisible(false),
  });

  const showAlert = (type, title, message, onClose = null) => {
    setAlertConfig({
      type,
      title,
      message,
      primaryButton: "OK",
      onPrimaryPress: onClose || (() => setAlertVisible(false)),
    });
    setAlertVisible(true);
  };

  useEffect(() => {
    if (amount && Number(amount) > 0) {
      // Check if amount exceeds max limit
      if (Number(amount) > MAX_RECHARGE_AMOUNT) {
        setCustomAmount(MAX_RECHARGE_AMOUNT);
        showAlert(
          "warning",
          "Amount Adjusted",
          `Maximum recharge amount is ₹${MAX_RECHARGE_AMOUNT.toLocaleString()}`
        );
      } else {
        setCustomAmount(Number(amount));
      }
    } else {
      setCustomAmount("");
    }
  }, [amount]);

  const createOrder = async (orderAmount) => {
    try {
      const res = await axios.post(
        `${API_URL_APP}/api/v1/wallet/add-amount`,
        { amount: Number(orderAmount) },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!res.data.success) {
        throw new Error(res.data.message || "Failed to create order");
      }

      return res.data.data;
    } catch (err) {
      console.log("Create Order Error:", err.response?.data || err.message);

      throw new Error(
        err.response?.data?.message ||
          "Unable to create payment order. Please try again."
      );
    }
  };

  const verifyPayment = async (paymentData) => {
    try {
      const res = await axios.post(
        `${API_URL_APP}/api/v1/wallet/verify-payment`,
        paymentData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!res.data.success) {
        throw new Error(res.data.message || "Payment verification failed");
      }
      fetchDriverDetails();
      return res.data;
    } catch (err) {
      console.log("Verify Payment Error:", err.response?.data || err.message);

      throw new Error(
        err.response?.data?.message ||
          "Failed to verify payment. Please contact support."
      );
    }
  };

  const handleRecharge = async () => {
    const amount = selectedAmount || Number(customAmount);

    // Validate amount range
    if (!amount || amount < MIN_RECHARGE_AMOUNT) {
      showAlert(
        "warning",
        "Invalid Amount",
        `Minimum recharge amount is ₹${MIN_RECHARGE_AMOUNT}`
      );
      return;
    }

    if (amount > MAX_RECHARGE_AMOUNT) {
      showAlert(
        "warning",
        "Amount Exceeds Limit",
        `Maximum recharge amount is ₹${MAX_RECHARGE_AMOUNT.toLocaleString()}. Please enter a lower amount.`
      );
      return;
    }

    setLoading(true);

    try {
      // 🚀 Step 1 — Create order
      const order = await createOrder(amount);

      const options = {
        description: "Add money to TaxiSafar wallet",
        currency: "INR",
        key: order.key,
        amount: order.amount * 100,
        name: "TaxiSafar Driver",
        order_id: order.orderId,
        theme: { color: "#000" },
        modal: {
          ondismiss: () => {
            setLoading(false);
          },
        },
      };

      try {
        // 🚀 Step 2 — Open Razorpay modal
        const data = await RazorpayCheckout.open(options);

        try {
          // 🚀 Step 3 — Verify payment
          await verifyPayment({
            razorpay_order_id: data.razorpay_order_id,
            razorpay_payment_id: data.razorpay_payment_id,
            razorpay_signature: data.razorpay_signature,
          });

          showAlert(
            "success",
            "Recharge Successful!",
            `₹${amount.toLocaleString()} has been added to your wallet`,
            () => navigation.goBack()
          );
        } catch (verifyError) {
          console.log("Verify Error:", verifyError);
          fetchDriverDetails();
          showAlert(
            "error",
            "Verification Failed",
            "Payment done but verification failed. Please contact support."
          );
        }
      } catch (rzpError) {
        console.log("Razorpay Error:", rzpError);

        if (rzpError.code !== 2) {
          showAlert(
            "error",
            "Payment Failed",
            rzpError.description || "Transaction was not completed"
          );
        }
      }
    } catch (orderError) {
      console.log("Order Creation Error:", orderError);

      showAlert(
        "error",
        "Failed to Start Payment",
        orderError.message || "Please try again"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCustomAmountChange = (text) => {
    const num = text.replace(/[^0-9]/g, "");
    const numValue = Number(num);

    // If user enters more than max, cap it at max
    if (numValue > MAX_RECHARGE_AMOUNT) {
      setCustomAmount(MAX_RECHARGE_AMOUNT.toString());
      showAlert(
        "warning",
        "Maximum Limit Reached",
        `You can recharge up to ₹${MAX_RECHARGE_AMOUNT.toLocaleString()} at a time`
      );
    } else {
      setCustomAmount(num);
    }
    
    setSelectedAmount(null);
  };

  const finalAmount = selectedAmount || Number(customAmount) || 0;
  const isValidAmount = finalAmount >= MIN_RECHARGE_AMOUNT && finalAmount <= MAX_RECHARGE_AMOUNT;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 20 }}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <ArrowLeft size={28} color="#000" />
            </TouchableOpacity>
            <Text style={styles.title}>Add Money to Wallet</Text>
            <View style={{ width: 28 }} />
          </View>

          {/* Balance Card */}
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Current Balance</Text>
            <Text style={styles.balanceAmount}>
              ₹{(driver?.wallet?.balance || 0).toLocaleString()}
            </Text>
          </View>

          {/* Preset Amounts */}
          <Text style={styles.sectionTitle}>Select Amount</Text>
          <View style={styles.amountGrid}>
            {PRESET_AMOUNTS.map((amt) => (
              <TouchableOpacity
                key={amt}
                style={[
                  styles.amountBtn,
                  selectedAmount === amt && styles.amountBtnSelected,
                ]}
                onPress={() => {
                  setSelectedAmount(amt);
                  setCustomAmount(amt.toString());
                }}
              >
                <Text
                  style={[
                    styles.amountText,
                    selectedAmount === amt && styles.amountTextSelected,
                  ]}
                >
                  ₹{amt.toLocaleString()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Custom Amount */}
          <Text style={styles.sectionTitle}>Or Enter Custom Amount</Text>
          <View style={styles.customInput}>
            <Text style={styles.rupee}>₹</Text>
            <TextInput
              style={styles.input}
              placeholder={`${MIN_RECHARGE_AMOUNT} - ${MAX_RECHARGE_AMOUNT.toLocaleString()}`}
              keyboardType="numeric"
              value={customAmount}
              onChangeText={handleCustomAmountChange}
              maxLength={5} // Max 5 digits (30000)
            />
          </View>

          {/* Amount Range Info */}
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              💡 Recharge between ₹{MIN_RECHARGE_AMOUNT} - ₹{MAX_RECHARGE_AMOUNT.toLocaleString()}
            </Text>
          </View>

          {/* Pay Button */}
          <TouchableOpacity
            style={[
              styles.payButton,
              (!isValidAmount || loading) && styles.payButtonDisabled,
            ]}
            onPress={handleRecharge}
            disabled={!isValidAmount || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.payButtonText}>
                Pay ₹{finalAmount > 0 ? finalAmount.toLocaleString() : "0"}
              </Text>
            )}
          </TouchableOpacity>

          <Text style={styles.note}>
            100% secure • Instant credit • Refundable if not used
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Universal Alert */}
      <UniversalAlert
        visible={alertVisible}
        onClose={() => setAlertVisible(false)}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        primaryButton={alertConfig.primaryButton}
        onPrimaryPress={alertConfig.onPrimaryPress}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#fff",
  },
  title: { fontSize: 20, fontWeight: "bold", color: "#111827" },
  balanceCard: {
    backgroundColor: "#fff",
    margin: 16,
    borderColor: "#000",
    borderWidth: 1,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
  },
  balanceLabel: {
    color: "#000",
    fontWeight: "800",
    fontSize: 16,
    opacity: 0.9,
  },
  balanceAmount: {
    color: "#000",
    fontSize: 40,
    fontWeight: "800",
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 12,
    color: "#374151",
  },
  amountGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    gap: 12,
  },
  amountBtn: {
    width: "30%",
    backgroundColor: "#F3F4F6",
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  amountBtnSelected: {
    backgroundColor: "#000",
    borderColor: "#000",
  },
  amountText: { fontSize: 18, fontWeight: "bold", color: "#374151" },
  amountTextSelected: { color: "#FFF" },
  customInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    marginHorizontal: 16,
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 60,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
  },
  rupee: { fontSize: 28, fontWeight: "bold", color: "#374151" },
  input: { flex: 1, fontSize: 20, marginLeft: 8, color: "#000" },
  infoBox: {
    backgroundColor: "#FFF9E6",
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FFE066",
  },
  infoText: {
    fontSize: 13,
    color: "#856404",
    textAlign: "center",
  },
  payButton: {
    backgroundColor: "#000",
    margin: 16,
    marginTop: 24,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
  },
  payButtonDisabled: { opacity: 0.6 },
  payButtonText: { color: "#FFF", fontSize: 18, fontWeight: "bold" },
  note: {
    textAlign: "center",
    color: "#6B7280",
    fontSize: 14,
    marginHorizontal: 16,
    marginBottom: 30,
  },
});