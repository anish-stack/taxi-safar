import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Linking,
  Alert,
  Modal,
} from "react-native";
import axios from "axios";
import { API_URL_APP_CHAT } from "../../constant/api";
import loginStore from "../../store/auth.store";
import { Ionicons } from "@expo/vector-icons";
import io from "socket.io-client";
import useDriverStore from "../../store/driver.store";
import { SafeAreaView } from "react-native-safe-area-context";
import messaging from "@react-native-firebase/messaging";

const ChatBox = ({ route, navigation }) => {
  const { chat, role } = route.params;
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);

  const { token } = loginStore();
  const { driver, fetchDriverDetails } = useDriverStore();

  // State variables
  const [paymentLinkSent, setPaymentLinkSent] = useState(false);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [detailsSent, setDetailsSent] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [samneWalaDriver, setSamneWalaDriver] = useState(null);
  // Initialize Socket.IO connection
  useEffect(() => {
    fetchDriverDetails();
    socketRef.current = io(API_URL_APP_CHAT, {
      transports: ["websocket", "polling"],
    });

    socketRef.current.emit("driver_online", {
      driver_id: driver._id,
    });

    socketRef.current.emit("join_chat", {
      chatId: chat._id,
    });

    socketRef.current.on("new_message", (data) => {
      if (data.chatId === chat._id) {
        setMessages((prev) => {
          const exists = prev.some((msg) => msg._id === data.message._id);
          if (exists) return prev;
          return [...prev, data.message];
        });
        scrollToEnd();
      }
    });

    socketRef.current.on("user_typing", (data) => {
      if (data.driver_id !== driver._id) {
        setOtherUserTyping(data.isTyping);
      }
    });

    socketRef.current.on("error", (data) => {
      console.error("Socket error:", data.message);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Fetch initial messages
  const fetchMessages = async () => {
    try {
      const res = await axios.get(`${API_URL_APP_CHAT}/api/chat/${chat._id}`, {
        params: { driver_id: driver._id },
        headers: { Authorization: `Bearer ${token}` },
      });
      const isInitiator = role === "initiator";
      if (res.data) {
        setSamneWalaDriver(isInitiator ?  res.data.owner :res.data.init );
      } else {
        setSamneWalaDriver(null);
      }
      setMessages(res.data.chat.messages || []);

      const hasSentDetails = res.data.chat.messages?.some(
        (msg) =>
          msg.messageType === "driver_details" && msg.sender === driver._id
      );
      const hasSentPaymentLink = res.data.chat.messages?.some(
        (msg) => msg.messageType === "payment_link"
      );

      setPaymentLinkSent(hasSentPaymentLink);
      setDetailsSent(hasSentDetails);

      await markAsRead();
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    // Foreground message listener
    const unsubscribe = messaging().onMessage(async (remoteMessage) => {
      console.log("📩 New FCM message received in FOREGROUND", remoteMessage);
      await fetchMessages();
    });

    // Background + Quit state message handler
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      console.log("📩 New FCM message received in BACKGROUND", remoteMessage);
      await fetchMessages();
    });

    return unsubscribe;
  }, []);

  const generatePaymentLink = async (
    amount,
    customerName,
    customerContact,
    customerId,
    rideId
  ) => {
    try {
      const response = await axios.post(
        `${API_URL_APP_CHAT}/api/v1/create-payment-link`,
        {
          amount,
          customerName,
          customerContact,
          customerId,
          rideId,
        }
      );

      return response.data.paymentLink;
    } catch (error) {
      console.log("Payment Link Error:", error.response?.data || error);
      return null;
    }
  };

  const sendPaymentLink = async () => {
    const ride = chat?.ride_post_id || chat?.rideData;
    const commissionAmount = ride?.commissionAmount || 200;
    await fetchMessages();
    // Customer details
    const customerName = samneWalaDriver?.driver_name || "Customer";
    const customerContact =
      samneWalaDriver?.driver_contact_number || "9999999999";
    const customerId = samneWalaDriver?._id;

    // 1️⃣ Call backend to generate Razorpay link
    const paymentUrl = await generatePaymentLink(
      commissionAmount,
      customerName,
      customerContact,
      customerId,
      ride?._id
    );

    if (!paymentUrl) {
      alert("Failed to generate payment link");
      return;
    }

    // 2️⃣ Text message to send in chat
    const paymentText = `💳 Payment Request

Please pay the commission amount to confirm your booking.

Amount to Pay: ₹${commissionAmount}
👇 Click below to pay securely`;

    // 3️⃣ Send message through socket
    socketRef.current.emit("send_message", {
      chatId: chat._id,
      sender: driver._id,
      text: paymentText,
      messageType: "payment_link",
      paymentUrl: paymentUrl,
      amount: commissionAmount,
    });

    setPaymentLinkSent(true);
  };

  const markAsRead = async () => {
    try {
      await axios.put(
        `${API_URL_APP_CHAT}/api/chat/${chat._id}/read`,
        { driver_id: driver._id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  const sendMessage = () => {
    if (!text.trim()) return;

    const messageText = text.trim();
    setText("");

    socketRef.current.emit("send_message", {
      chatId: chat._id,
      sender: driver._id,
      text: messageText,
      messageType: "text",
    });
  };

  const sendDriverDetails = () => {
    const vehicle = driver?.current_vehicle_id;
    const photos = vehicle?.vehicle_photos || {};

    const frontUrl = photos?.front?.url || null;
    const backUrl = photos?.back?.url || null;
    const interiorUrl = photos?.interior?.url || null;

    const detailsText = `🚗 Driver Details  
━━━━━━━━━━━━━━━━━━  
👤 Name: ${driver?.driver_name || "N/A"}  
📞 Contact: ${driver?.driver_contact_number || "N/A"}  

🚙 Vehicle Details  
• Type: ${vehicle?.vehicle_type || "N/A"}  
• Number: ${vehicle?.vehicle_number || "N/A"}  
• Name: ${vehicle?.vehicle_name || "N/A"}  
• Fuel Type: ${vehicle?.fuel_type || "N/A"}  

🖼 Vehicle Photos  
• Front: ${frontUrl ? frontUrl : "N/A"}  
• Back: ${backUrl ? backUrl : "N/A"}  
• Interior: ${interiorUrl ? interiorUrl : "N/A"}  
`;

    socketRef.current.emit("send_message", {
      chatId: chat._id,
      sender: driver._id,
      text: detailsText,
      messageType: "driver_details",
      vehiclePhotos: {
        front: frontUrl,
        back: backUrl,
        interior: interiorUrl,
      },
    });

    setDetailsSent(true);
  };

  const handleTyping = (typing) => {
    if (socketRef.current) {
      socketRef.current.emit("typing", {
        chatId: chat._id,
        isTyping: typing,
      });
    }
  };

  const scrollToEnd = () => {
    setTimeout(() => {
      messagesEndRef?.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  useEffect(() => {
    scrollToEnd();
  }, [messages]);

  // Menu actions
  const handleMenuAction = (action) => {
    setMenuVisible(false);

    switch (action) {
      case "call":
        const phoneNumber =
          chat?.other_driver_id?.driver_contact_number ||
          chat?.other_driver_id?.phone ||
          "+1234567890";
        Linking.openURL(`tel:${phoneNumber}`);
        break;
      case "support":
        Alert.alert(
          "Taxi Support",
          "Contact our support team for assistance.",
          [
            {
              text: "Call Support",
              onPress: () => Linking.openURL("tel:+1234567890"),
            },
            { text: "Cancel", style: "cancel" },
          ]
        );
        break;
      case "refresh":
        setLoading(true);
        fetchMessages();
        break;
      case "back":
        navigation.goBack();
        break;
    }
  };

  // Link detection and handling
  const detectLinks = (text) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.match(urlRegex) || [];
  };

     let chatRole = role === "initiator";

  const getLinkInfo = (url) => {
    const lowerUrl = url.toLowerCase();

    if (lowerUrl.match(/\.(jpg|jpeg|png|gif|bmp|webp|svg)(\?.*)?$/i)) {
      return { type: "image", icon: "image-outline", color: "#000" };
    } else if (lowerUrl.match(/\.(mp4|avi|mov|wmv|flv|webm|mkv)(\?.*)?$/i)) {
      return { type: "video", icon: "videocam-outline", color: "#FF3B30" };
    } else if (lowerUrl.match(/\.(pdf)(\?.*)?$/i)) {
      return { type: "pdf", icon: "document-text-outline", color: "#FF9500" };
    } else {
      return { type: "link", icon: "link-outline", color: "#000" };
    }
  };

  const handleLinkPress = async (url) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Error", "Cannot open this link");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to open link");
      console.error("Error opening link:", error);
    }
  };

  const renderMessageText = (text, isMe, messageType, paymentUrl, amount) => {
    if (messageType === "payment_link" && paymentUrl) {
      const isInitiator = role === "initiator";

      return (
        <View style={{ gap: 12 }}>
          <Text
            style={[
              styles.messageText,
              isMe ? styles.myText : styles.otherText,
            ]}
          >
            {text}
          </Text>

          <TouchableOpacity
            onPress={() => handleLinkPress(paymentUrl)}
            style={[
              styles.payButton,
              isInitiator ? styles.payButtonActive : styles.payButtonSent,
            ]}
            disabled={!isInitiator}
          >
            <Ionicons
              name={isInitiator ? "card-outline" : "checkmark-circle-outline"}
              size={18}
              color="#fff"
            />
            <Text style={styles.payButtonText}>
              {isInitiator ? `Pay ₹${amount}` : "Payment Link Sent"}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    const links = detectLinks(text);
    if (links.length === 0) {
      return (
        <Text
          style={[styles.messageText, isMe ? styles.myText : styles.otherText]}
        >
          {text}
        </Text>
      );
    }

    const parts = [];
    let lastIndex = 0;

    links.forEach((link, index) => {
      const linkIndex = text.indexOf(link, lastIndex);
      if (linkIndex > lastIndex) {
        parts.push(
          <Text
            key={`text-${index}`}
            style={[
              styles.messageText,
              isMe ? styles.myText : styles.otherText,
            ]}
          >
            {text.substring(lastIndex, linkIndex)}
          </Text>
        );
      }

      const linkInfo = getLinkInfo(link);

      parts.push(
        <TouchableOpacity
          key={`link-${index}`}
          onPress={() => handleLinkPress(link)}
          style={styles.linkContainer}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.linkBadge,
              { backgroundColor: linkInfo.color + "15" },
            ]}
          >
            <Ionicons name={linkInfo.icon} size={14} color={linkInfo.color} />
            <Text style={[styles.linkText, { color: linkInfo.color }]}>
              {linkInfo.type.toUpperCase()}
            </Text>
          </View>
        </TouchableOpacity>
      );

      lastIndex = linkIndex + link.length;
    });

    if (lastIndex < text.length) {
      parts.push(
        <Text
          key="text-end"
          style={[styles.messageText, isMe ? styles.myText : styles.otherText]}
        >
          {text.substring(lastIndex)}
        </Text>
      );
    }

    return <View>{parts}</View>;
  };

  const renderRideCard = () => {
    const ride = chat?.ride_post_id || chat?.rideData;

    return (
      <View style={styles.rideCard}>
        <View style={styles.rideHeader}>
          <View style={styles.vehicleIconContainer}>
            <Ionicons name="car" size={24} color="#000" />
          </View>
          <View style={styles.rideHeaderInfo}>
            <Text style={styles.rideTitle}>
              {ride?.vehicleType || "Vehicle"}
            </Text>
           
          </View>
          <View style={styles.dateContainer}>
            <Ionicons name="calendar-outline" size={14} color="#666" />
            <Text style={styles.rideDate}>
              {new Date(ride?.pickupDate).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </Text>
          </View>
        </View>

        <View style={styles.ridePricing}>
          <View style={styles.priceCard}>
            <Text style={styles.priceAmount}>₹{ride?.totalAmount || 0}</Text>
            <Text style={styles.priceLabel}>Total</Text>
          </View>

          <View style={styles.priceDivider} />

          <View style={styles.priceCard}>
            <Text style={styles.priceAmount}>
              ₹{ride?.commissionAmount || 0}
            </Text>
            <Text style={styles.priceLabel}>Commission</Text>
          </View>

          <View style={styles.priceDivider} />

          <View style={styles.priceCard}>
            <Text style={[styles.priceAmount, styles.earningAmount]}>
              ₹{ride?.driverEarning || 0}
            </Text>
            <Text style={styles.priceLabel}>Your Earning</Text>
          </View>
        </View>

        <View style={styles.rideLocations}>
          <View style={styles.routeContainer}>
            <View style={styles.locationPoint}>
              <View style={styles.pickupDot} />
              <View style={styles.routeLine} />
              <View style={styles.dropDot} />
            </View>

            <View style={styles.locationsInfo}>
              <View style={styles.locationItem}>
                <Text style={styles.locationLabel}>PICKUP</Text>
                <Text style={styles.locationText} numberOfLines={2}>
                  {ride?.pickupAddress || "Pickup location"}
                </Text>
              </View>

              <View style={styles.tripInfoContainer}>
                <Text style={styles.tripText}>One Way • 60 km</Text>
              </View>

              <View style={styles.locationItem}>
                <Text style={styles.locationLabel}>DROP</Text>
                <Text style={styles.locationText} numberOfLines={2}>
                  {ride?.dropAddress || "Drop location"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {role === "ride_owner" && (
          <TouchableOpacity
            style={[
              styles.actionButton,
              paymentLinkSent && styles.disabledButton,
            ]}
            onPress={sendPaymentLink}
            disabled={paymentLinkSent}
            activeOpacity={0.8}
          >
            <Ionicons
              name={
                paymentLinkSent ? "checkmark-circle-outline" : "link-outline"
              }
              size={18}
              color="#fff"
            />
            <Text style={styles.actionButtonText}>
              {paymentLinkSent ? "Link Sent" : "Send Payment Link"}
            </Text>
          </TouchableOpacity>
        )}

        {role === "initiator" && (
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.secondaryButton,
                detailsSent && styles.disabledButton,
              ]}
              onPress={sendDriverDetails}
              disabled={detailsSent}
              activeOpacity={0.8}
            >
              <Ionicons
                name={
                  detailsSent
                    ? "checkmark-circle-outline"
                    : "information-circle-outline"
                }
                size={18}
                color={detailsSent ? "#999" : "#000"}
              />
              <Text
                style={[
                  styles.actionButtonText,
                  styles.secondaryButtonText,
                  detailsSent && styles.disabledButtonText,
                ]}
              >
                {detailsSent ? "Details Sent" : "Send Details"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton,
                !paymentLinkSent && styles.disabledButton,
              ]}
              onPress={() => {
                const paymentMessage = messages.find(
                  (msg) => msg.messageType === "payment_link" && msg.paymentUrl
                );
                if (paymentMessage?.paymentUrl) {
                  handleLinkPress(paymentMessage.paymentUrl);
                } else {
                  Alert.alert(
                    "No Payment Link",
                    "Waiting for ride owner to send payment link"
                  );
                }
              }}
              disabled={!paymentLinkSent}
              activeOpacity={0.8}
            >
              <Ionicons name="card-outline" size={18} color="#000" />
              <Text style={styles.actionButtonText}>
                {paymentLinkSent
                  ? `Pay ₹${
                      chat?.ride_post_id?.commissionAmount ||
                      chat?.rideData?.commissionAmount ||
                      200
                    }`
                  : "Waiting for Link"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const renderMessage = ({ item }) => {
    const isMe = item.sender === driver._id;
    const isDriverDetails = item.messageType === "driver_details";
    const isPaymentLink = item.messageType === "payment_link";
    const isPaymentComplete = item.messageType === "Payment_Complete";

    if (isPaymentComplete) {
      // Determine message based on role
      const botMessage =
        role === "ride_owner"
          ? "आपका कमीशन आपके वॉलेट में ऐड कर दिया गया है। राइड कम्पलीट होने के 24 घंटे में आपकी अमाउंट अनलॉक करके आपके अकाउंट में भेज दी जाएगी।"
          : item.text; // Show DB message for initiator (person who paid)

      return (
        <View style={styles.botMessageContainer}>
          <View style={styles.botHeader}>
            <View style={styles.botIconContainer}>
              <Ionicons name="checkmark-circle" size={20} color="#34C759" />
            </View>
            <Text style={styles.botName}>Taxi Safar Bot</Text>
          </View>
          <View style={styles.botBubble}>
            <Text style={styles.botMessageText}>{botMessage}</Text>
            <Text style={styles.botBubbleTime}>{formatTime(item.sentAt)}</Text>
          </View>
        </View>
      );
    }

    return (
      <View
        style={[
          styles.messageContainer,
          isMe ? styles.myMessageContainer : styles.otherMessageContainer,
        ]}
      >
        <View
          style={[
            styles.bubble,
            isMe ? styles.myBubble : styles.otherBubble,
            isDriverDetails && styles.detailsBubble,
            isPaymentLink && styles.paymentBubble,
          ]}
        >
          {renderMessageText(
            item.text,
            isMe,
            item.messageType,
            item.paymentUrl,
            item.amount
          )}
          <Text
            style={[
              styles.bubbleTime,
              isMe ? styles.myBubbleTime : styles.otherBubbleTime,
            ]}
          >
            {formatTime(item.sentAt)}
          </Text>
        </View>
      </View>
    );
  };

  const renderMenu = () => (
    <Modal
      visible={menuVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setMenuVisible(false)}
    >
      <TouchableOpacity
        style={styles.menuOverlay}
        activeOpacity={1}
        onPress={() => setMenuVisible(false)}
      >
        <View style={styles.menuContainer}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleMenuAction("call")}
          >
            <Ionicons name="call-outline" size={20} color="#333" />
            <Text style={styles.menuText}>Call</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleMenuAction("support")}
          >
            <Ionicons name="help-circle-outline" size={20} color="#333" />
            <Text style={styles.menuText}>Taxi Support</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleMenuAction("refresh")}
          >
            <Ionicons name="refresh-outline" size={20} color="#333" />
            <Text style={styles.menuText}>Refresh Chat</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleMenuAction("back")}
          >
            <Ionicons name="arrow-back-outline" size={20} color="#333" />
            <Text style={styles.menuText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.loadingText}>Loading conversation...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const otherDriver = chat?.other_driver_id;
  const driverName =
    otherDriver?.driver_name || otherDriver?.name || "Unknown Driver";
  const avatarUri =
    otherDriver?.profile_image ||
    otherDriver?.avatar ||
    "https://images.pexels.com/photos/1040881/pexels-photo-1040881.jpeg?auto=compress&cs=tinysrgb&w=150";

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>

        <Image source={{ uri: avatarUri }} style={styles.headerAvatar} />

        <View style={styles.headerInfo}>
          <Text style={styles.headerName} numberOfLines={1}>
          Chat With {samneWalaDriver?.driver_name}
          </Text>
          {otherUserTyping ? (
            <Text style={styles.typingHeader}>typing...</Text>
          ) : (
            <Text style={styles.headerStatus}>
              {role === "ride_owner"
                ? "Ride Owner"
                : role === "initiator"
                ? "You Initiated"
                : "Active"}
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.menuButton}
          activeOpacity={0.7}
          onPress={() => setMenuVisible(true)}
        >
          <Ionicons name="ellipsis-vertical" size={20} color="#333" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <FlatList
          data={messages}
          ref={messagesEndRef}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.messagesList}
          ListHeaderComponent={renderRideCard}
          renderItem={renderMessage}
          onContentSizeChange={scrollToEnd}
          showsVerticalScrollIndicator={false}
        />

        <View style={styles.inputContainer}>
          {otherUserTyping && (
            <View style={styles.typingIndicator}>
              <Text style={styles.typingText}>typing...</Text>
            </View>
          )}

          <View style={styles.inputBar}>
            <TextInput
              style={styles.input}
              placeholder="Type a message..."
              placeholderTextColor="#999"
              value={text}
              onChangeText={(value) => {
                setText(value);
                handleTyping(value.length > 0);
              }}
              onBlur={() => handleTyping(false)}
              multiline
              maxLength={1000}
            />

            <TouchableOpacity
              onPress={sendMessage}
              style={[
                styles.sendButton,
                text.trim() && styles.sendButtonActive,
              ]}
              disabled={!text.trim()}
              activeOpacity={0.7}
            >
              <Ionicons
                name="send"
                size={20}
                color={text.trim() ? "#ffffff" : "#999"}
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {renderMenu()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
  keyboardView: {
    flex: 1,
  },

  // Add these to your existing styles object
  botMessageContainer: {
    alignItems: "center",
    marginVertical: 8,
  },
  botHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 6,
  },
  botIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
  },
  botName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
  },
  botBubble: {
    backgroundColor: "#F0FFF4",
    padding: 12,
    borderRadius: 16,
    maxWidth: "85%",
    borderWidth: 1,
    borderColor: "#C6F6D5",
  },
  botMessageText: {
    fontSize: 15,
    color: "#2D3748",
    lineHeight: 20,
    textAlign: "center",
  },
  botBubbleTime: {
    fontSize: 10,
    color: "#718096",
    marginTop: 4,
    textAlign: "center",
  },
  // Header Styles
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 17,
    fontWeight: "600",
    color: "#333",
  },
  headerStatus: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },
  typingHeader: {
    fontSize: 13,
    color: "#000",
    marginTop: 2,
    fontStyle: "italic",
  },
  menuButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },

  // Menu Styles
  menuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: 100,
    paddingRight: 16,
  },
  menuContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    paddingVertical: 8,
    minWidth: 160,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuText: {
    fontSize: 16,
    color: "#333",
    marginLeft: 12,
    fontWeight: "500",
  },

  messagesList: {
    padding: 16,
    paddingBottom: 8,
  },

  // Ride Card Styles
  rideCard: {
    backgroundColor: "#F8F9FA",
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  rideHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  vehicleIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  rideHeaderInfo: {
    flex: 1,
  },
  rideTitle: {
    fontSize: 18,
    textTransform: "capitalize",
    fontWeight: "700",
    color: "#333",
    marginBottom: 4,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FF9500",
    marginRight: 6,
  },
  rideStatus: {
    fontSize: 12,
    color: "#FF9500",
    fontWeight: "600",
  },
  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  rideDate: {
    fontSize: 11,
    color: "#666",
    fontWeight: "500",
    marginLeft: 4,
  },

  // Pricing Section
  ridePricing: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  priceCard: {
    flex: 1,
    alignItems: "center",
  },
  priceAmount: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginBottom: 2,
  },
  earningAmount: {
    color: "#000",
  },
  priceLabel: {
    fontSize: 10,
    color: "#666",
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  priceDivider: {
    width: 1,
    backgroundColor: "#E5E5EA",
    marginHorizontal: 12,
  },

  // Route Section
  rideLocations: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  routeContainer: {
    flexDirection: "row",
  },
  locationPoint: {
    alignItems: "center",
    marginRight: 12,
    paddingTop: 4,
  },
  pickupDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#000",
  },
  routeLine: {
    width: 2,
    flex: 1,
    backgroundColor: "#E5E5EA",
    marginVertical: 8,
  },
  dropDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#333",
  },
  locationsInfo: {
    flex: 1,
  },
  locationItem: {
    marginBottom: 8,
  },
  locationLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#999",
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  locationText: {
    fontSize: 14,
    color: "#333",
    lineHeight: 18,
    fontWeight: "500",
  },
  tripInfoContainer: {
    alignItems: "center",
    paddingVertical: 8,
  },
  tripText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },

  // Action Buttons
  actionButton: {
    flexDirection: "row",
    backgroundColor: "#000",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonsRow: {
    flexDirection: "row",
    gap: 8,
  },
  secondaryButton: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#000",
    flex: 1,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
    marginLeft: 6,
  },
  secondaryButtonText: {
    color: "#000",
  },
  disabledButton: {
    backgroundColor: "#F2F2F7",
    borderColor: "#F2F2F7",
  },
  disabledButtonText: {
    color: "#999",
  },

  // Message Styles
  messageContainer: {
    marginVertical: 2,
  },
  myMessageContainer: {
    alignItems: "flex-end",
  },
  otherMessageContainer: {
    alignItems: "flex-start",
  },
  bubble: {
    padding: 12,
    borderRadius: 18,
    maxWidth: "80%",
  },
  myBubble: {
    backgroundColor: "#000",
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: "#E5E5EA",
    borderBottomLeftRadius: 4,
  },
  detailsBubble: {
    backgroundColor: "#F0F9FF",
    borderWidth: 1,
    borderColor: "#B3D9FF",
  },
  paymentBubble: {
    backgroundColor: "#FFF5F5",
    borderWidth: 1,
    borderColor: "#FFE0E0",
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  myText: {
    color: "#333",
  },
  otherText: {
    color: "#333",
  },
  bubbleTime: {
    fontSize: 10,
    marginTop: 4,
    fontWeight: "400",
  },
  myBubbleTime: {
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "right",
  },
  otherBubbleTime: {
    color: "#999",
    textAlign: "left",
  },

  // Link Styles
  linkContainer: {
    marginVertical: 4,
  },
  linkBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    gap: 4,
    alignSelf: "flex-start",
  },
  linkText: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.5,
  },

  // Payment Button Styles
  payButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  payButtonActive: {
    backgroundColor: "#000",
  },
  payButtonSent: {
    backgroundColor: "#34C759",
  },
  payButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },

  // Input Container
  inputContainer: {
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#E5E5EA",
  },
  typingIndicator: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  typingText: {
    fontSize: 12,
    color: "#000",
    fontStyle: "italic",
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: "#F2F2F7",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    fontSize: 16,
    maxHeight: 100,
    color: "#333",
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#E5E5EA",
  },
  sendButtonActive: {
    backgroundColor: "#000",
  },
});

export default ChatBox;
