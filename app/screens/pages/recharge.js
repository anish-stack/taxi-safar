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
      setCustomAmount(Number(amount));
    } else {
      setCustomAmount(0);
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

      // Pass detailed error message to caller
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

      // Pass error up to caller
      throw new Error(
        err.response?.data?.message ||
          "Failed to verify payment. Please contact support."
      );
    }
  };

  const handleRecharge = async () => {
    const amount = selectedAmount || customAmount;

    if (!amount || amount < 100) {
      showAlert("warning", "Invalid Amount", "Minimum recharge amount is ₹100");
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
        theme: { color: "#DC2626" },
        modal: {
          ondismiss: () => {
            // user closed Razorpay popup
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
            `₹${amount} has been added to your wallet`,
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
          // user cancelled = code 2
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

  const finalAmount = selectedAmount || customAmount || 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
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
            ₹{driver?.wallet?.balance || 0}
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
                setCustomAmount(amt);
              }}
            >
              <Text
                style={[
                  styles.amountText,
                  selectedAmount === amt && styles.amountTextSelected,
                ]}
              >
                ₹{amt}
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
            placeholder="100 minimum"
            keyboardType="numeric"
            value={String(customAmount)}
            onChangeText={(text) => {
              const num = text.replace(/[^0-9]/g, "");
              setCustomAmount(num);
              setSelectedAmount(null);
            }}
          />
        </View>

        {/* Pay Button */}
        <TouchableOpacity
          style={[
            styles.payButton,
            finalAmount < 100 || loading ? styles.payButtonDisabled : null,
          ]}
          onPress={handleRecharge}
          disabled={finalAmount < 100 || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.payButtonText}>
              Pay ₹{finalAmount > 0 ? finalAmount : "0"}
            </Text>
          )}
        </TouchableOpacity>

        <Text style={styles.note}>
          100% secure • Instant credit • Refundable if not used
        </Text>
      </ScrollView>

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
    backgroundColor: "#DC2626",
    margin: 16,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
  },
  balanceLabel: { color: "#FFF", fontSize: 16, opacity: 0.9 },
  balanceAmount: {
    color: "#FFF",
    fontSize: 40,
    fontWeight: "bold",
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
    backgroundColor: "#DC2626",
    borderColor: "#DC2626",
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
  payButton: {
    backgroundColor: "#DC2626",
    margin: 16,
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
