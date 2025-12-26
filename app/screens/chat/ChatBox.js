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
  ScrollView,
  ActivityIndicator,
  Image,
  Linking,
  Alert,
  Modal,
  Share,
  Dimensions,
} from "react-native";
import axios from "axios";
import { API_URL_APP, API_URL_APP_CHAT } from "../../constant/api";
import loginStore from "../../store/auth.store";
import { Ionicons } from "@expo/vector-icons";
import io from "socket.io-client";
import useDriverStore from "../../store/driver.store";
import { SafeAreaView } from "react-native-safe-area-context";
import messaging from "@react-native-firebase/messaging";
import DriverPostCard from "../Reserve/DriverPostCard";
import { scale, verticalScale, moderateScale } from "react-native-size-matters";
import { formatDate, formatTime12Hour } from "../../utils/utils";

const { width: screenWidth } = Dimensions.get("window");

const ChatBox = ({ route, navigation }) => {
  const { role } = route.params;
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);

  // console.log("route.params.chat ",route.params.chat )
  const { token } = loginStore();
  const { driver, fetchDriverDetails } = useDriverStore();
  const [chat, setChat] = useState(route.params.chat || {});
  const [chatId, setChatId] = useState({});

  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [company, setCompany] = useState(null);
  // State variables
  const [paymentLinkSent, setPaymentLinkSent] = useState(false);
  const [paymentLinkLoading, setPaymentLinkLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [sendingDetails, setSendingDetails] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [detailsSent, setDetailsSent] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [samneWalaDriver, setSamneWalaDriver] = useState(null);
  const [error, setError] = useState(null);

  // console.log(chat)
  useEffect(() => {
    fetchDriverDetails();
    socketRef.current = io(API_URL_APP_CHAT, {
      transports: ["websocket", "polling"],
    });

    socketRef.current.emit("driver_online", {
      driver_id: driver._id,
    });

    socketRef.current.emit("join_chat", {
      chatId: route.params.chat ? route.params.chat?._id : chatId,
    });

    socketRef.current.on("new_message", (data) => {
      if (data.chatId === chatId) {
        setMessages((prev) => {
          // अगर optimistic message है (temp ID), तो replace करो real से
          const exists = prev.find((msg) => msg._id === data.message._id);
          if (exists) return prev;

          // Remove optimistic if same content (optional safety)
          return [...prev.filter((msg) => !msg.isOptimistic), data.message];
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
      setError("Connection error occurred");
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const fetchCompanyDriver = async (companyDriverId) => {
    try {
      const response = await axios.get(
        `${API_URL_APP}/api/v1/company-details/${companyDriverId}`
      );
      setCompany(response.data.data);
      return response.data.data;
    } catch (error) {
      setCompany(null);
      console.log(
        "❌ Company Driver fetch error:",
        error?.response?.data || error.message
      );
    }
  };

  const fetchMessages = async () => {
    try {
      setError(null);

      const res = await axios.get(`${API_URL_APP_CHAT}/api/chat/${chat._id}`, {
        params: { driver_id: driver._id },
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });

      const isInitiator = role === "initiator";

      if (res.data) {
        console.log("res.data.owner", res.data.owner);
        console.log("res.data.init", res.data.init);
        setSamneWalaDriver(isInitiator ? res.data.owner : res.data.init);
        await fetchCompanyDriver(
          isInitiator ? res.data.owner?._id : res.data.init?._id
        );
      } else {
        setSamneWalaDriver(null);
      }
      console.log("Fetched chat data:", res.data.chat._id);
      setChatId(res.data.chat._id);

      const ride = res.data.chat.ride_post_id || res.data.chat.rideData;
      setChat(ride);
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

      // ⏱️ Mark as read AFTER 4 seconds

      await markAsRead(res.data.chat._id);
    } catch (error) {
      setError("Failed to load messages. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const retryFetchMessages = () => {
    setRefreshing(true);
    fetchMessages();
  };

  useEffect(() => {
    const unsubscribe = messaging().onMessage(async (remoteMessage) => {
      await fetchMessages();
    });

    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
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
        },
        { timeout: 15000 }
      );

      return response.data.paymentLink;
    } catch (error) {
      throw new Error("Payment link generation failed");
    }
  };

  const sendPaymentLink = async () => {
    try {
      setPaymentLinkLoading(true);
      setError(null);

      const ride = chat?.ride_post_id || chat?.rideData || chat;
      const commissionAmount = ride?.commissionAmount || 200;

      await fetchMessages();

      const customerName = samneWalaDriver?.driver_name || "Customer";
      const customerContact =
        samneWalaDriver?.driver_contact_number || "9999999999";
      const customerId = samneWalaDriver?._id;

      const paymentUrl = await generatePaymentLink(
        commissionAmount,
        customerName,
        customerContact,
        customerId,
        ride?._id
      );

      if (!paymentUrl) {
        throw new Error("Payment link generation failed");
      }

      const paymentText = `💳 Payment Request

Please pay the commission amount to confirm your booking.

Amount to Pay: ₹${commissionAmount}
👇 Click below to pay securely`;

      socketRef.current.emit("send_message", {
        chatId: chatId,
        sender: driver._id,
        text: paymentText,
        messageType: "payment_link",
        paymentUrl,
        amount: commissionAmount,
      });

      setPaymentLinkSent(true);
      await fetchMessages();
    } catch (error) {
      setError("Failed to send payment link. Please try again.");
      Alert.alert("Error", "Failed to send payment link. Please try again.");
    } finally {
      setPaymentLinkLoading(false);
    }
  };

  const markAsRead = async (chatId) => {
    try {
      console.log("Marking messages as read for chat:", chatId);
      const actualChatId = typeof chatId === "object" ? chatId?._id : chatId;

      if (!actualChatId) return;

      const res = await axios.put(
        `${API_URL_APP_CHAT}/api/chat/${actualChatId}/read`,
        { driver_id: driver._id },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log("✅ mark messages as read", res.data);
    } catch (error) {
      console.log(
        "❌ Failed to mark messages as read",
        error.response?.data || error.message
      );
    }
  };

  const sendMessage = async () => {
    if (!text.trim() || sendingMessage) return;

    const messageText = text.trim();
    const tempId = Date.now().toString(); // temporary ID

    // Optimistic update: तुरंत local messages में add करो
    const optimisticMessage = {
      _id: tempId,
      sender: driver._id,
      text: messageText,
      messageType: "text",
      sentAt: new Date().toISOString(),
      isOptimistic: true, // flag to identify temporary message
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setText("");
    setSendingMessage(true);
    scrollToEnd();

    try {
      socketRef.current.emit("send_message", {
        chatId: chatId,
        sender: driver._id,
        text: messageText,
        messageType: "text",
      });
      await retryFetchMessages();
    } catch (error) {
      // If failed, remove optimistic message and show error
      setMessages((prev) => prev.filter((msg) => msg._id !== tempId));
      setError("Failed to send message. Please try again.");
    } finally {
      setSendingMessage(false);
    }
  };

  const sendDriverDetails = async () => {
    if (sendingDetails || detailsSent) return;

    setSendingDetails(true);

    // Optimistic message
    const tempId = Date.now().toString();
    const detailsText = `🚗 Driver Details  
━━━━━━━━━━━━━━━━━━  
👤 Name: ${driver.driver_name || "N/A"}  
📞 Contact: ${driver.driver_contact_number || "N/A"}  

🚙 Vehicle Details  
• Number: ${vehicle.vehicle_number || "N/A"}  
• Name: ${vehicle.vehicle_name || "N/A"}  
• Fuel Type: ${vehicle.fuel_type || "N/A"}  
`;

    const photoUrls = Object.values(vehiclePhotos).filter(Boolean);

    const optimisticMessage = {
      _id: tempId,
      sender: driver._id,
      text: detailsText,
      messageType: "driver_details",
      vehiclePhotos: vehiclePhotos,
      sentAt: new Date().toISOString(),
      isOptimistic: true,
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setDetailsSent(true); // तुरंत disable कर दो button
    scrollToEnd();

    try {
      socketRef.current.emit("send_message", {
        chatId,
        sender: driver._id,
        text: detailsText,
        messageType: "driver_details",
        vehiclePhotos: vehiclePhotos,
      });
      await retryFetchMessages();
    } catch (error) {
      // Rollback if failed
      await retryFetchMessages();

      setMessages((prev) => prev.filter((msg) => msg._id !== tempId));
      setDetailsSent(false);
      setError("Failed to send details.");
    } finally {
      setSendingDetails(false);
    }
  };
  const AskForPaymentLink = async () => {
    if (detailsSent) {
      const detailsText =
        "💰 Please send the payment link at your earliest convenience.";

      socketRef.current.emit("send_message", {
        chatId: chatId,
        sender: driver._id,
        text: detailsText,
        messageType: "payment-link-message",
      });
      fetchMessages();
    } else {
      Alert.alert("Please send Details First");
    }
  };

  const shareBookingDetails = async () => {
    try {
      const rideData = chat?.ride_post_id || chat;
      const vehicleType = (rideData?.vehicleType || "").toLowerCase();

      const vehicleMap = {
        mini: { name: "Maruti WagonR", capacity: 4 },
        sedan: { name: "Maruti Swift Dzire", capacity: 4 },
        suv: { name: "Maruti Ertiga / Innova", capacity: 6 },
      };

      const vehicleInfo = vehicleMap[vehicleType] || {
        name: "Any Available Vehicle",
        capacity: "As per availability",
      };

const shareText = `*Taxi Safar Driver App – Booking Details*
━━━━━━━━━━━━━━━━━━━━━━━━

⏰ *Pickup Date & Time*
   ${formatDate(rideData?.pickupDate)} Time: ${formatTime12Hour(
  rideData?.pickupTime
)}

🚕 *Vehicle Type*
   • *${vehicleType.toUpperCase()} - ${vehicleInfo.name}*

*• Pickup:*
• ${rideData?.pickupAddress || "N/A"}

*Category:* ${rideData?.tripCategory || "One Way Drop"}

*• Drop:*
• ${rideData?.dropAddress || "N/A"}

• Distance: ${distance || "N/A"} km
• Duration: ${duration || "N/A"} Hour

💰 *Fare Details*
• Total Fare:  *₹${Number(
  rideData?.totalAmount || 0
).toLocaleString()}*
• Commission:  *₹${Number(
  rideData?.commissionAmount || 0
).toLocaleString()}*
• Driver Earning:  *₹${Number(
  rideData?.driverEarning || 0
).toLocaleString()}*

*Contact Details*
• ${rideData?.companyName || "Vicky Cab Service"} ${
  rideData?.companyPhone || "941 2222 322"
}

*Booking ID*
${shortBookingId || "N/A"}

*Thank you for choosing Taxi Safar*
📲 Download the *Taxi Safar Driver App*
For More Intercity Bookings & Regular Trips
🚖 Safe & Happy Journey!

*Taxi Safar Driver App Link*
https://play.google.com/store/apps/details?id=com.taxisafr.driver`;


      await Share.share({
        title: "Taxi Safar Booking Details",
        message: shareText,
      });
    } catch (error) {
      console.error("Share booking details error:", error);
    }
  };

  const handleTyping = (typing) => {
    if (socketRef.current) {
      socketRef.current.emit("typing", {
        chatId: chatId,
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

    const interval = setInterval(() => {
      console.log("🔄 Auto-fetching messages...");
      fetchMessages();
    }, 2000); 
    return () => clearInterval(interval);
  }, [token, navigation]);

  useEffect(() => {
    scrollToEnd();
  }, [messages]);

  useEffect(() => {
    scrollToEnd();
  }, [messages]);

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
        retryFetchMessages();
        break;
      case "back":
        navigation.goBack();
        break;
    }
  };

  const detectLinks = (text) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.match(urlRegex) || [];
  };

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

  const handleLinkPress = async (url, allLinks) => {
    try {
      const linkInfo = getLinkInfo(url);

      if (linkInfo.type === "image") {
        const imageLinks = allLinks.filter(
          (link) => getLinkInfo(link).type === "image"
        );
        const currentIndex = imageLinks.indexOf(url);

        setSelectedImages(imageLinks);
        setCurrentImageIndex(currentIndex);
        setImageModalVisible(true);
        return;
      }

      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Error", "Cannot open this link");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to open link");
    }
  };

  const extractImageUrlsFromText = (data) => {
    // Ensure we are working with a string
    const text = data?.text;
    if (typeof text !== "string") return [];

    // Match image URLs
    const imageUrlRegex = /(https?:\/\/[^\s]+?\.(jpg|jpeg|png|webp|gif))/gi;
    const matches = text.match(imageUrlRegex);

    return matches || [];
  };

  // Updated renderMessageText function - Replace the existing one
  const renderMessageText = (
    text,
    isMe,
    messageType,
    paymentUrl,
    amount,
    vehiclePhotos,
    extractImageUrlsFromText
  ) => {
    if (messageType === "payment_link" && paymentUrl) {
      const isInitiator = role === "initiator";

      return (
        <View style={{ gap: scale(12) }}>
          <Text
            style={[
              styles.messageText,
              isMe ? styles.myText : styles.otherText,
            ]}
          >
            {text}
          </Text>

          <TouchableOpacity
            onPress={() => handleLinkPress(paymentUrl, [paymentUrl])}
            style={[
              styles.payButton,
              isInitiator ? styles.payButtonActive : styles.payButtonSent,
            ]}
            disabled={!isInitiator}
          >
            <Ionicons
              name={isInitiator ? "card-outline" : "checkmark-circle-outline"}
              size={scale(18)}
              color="#fff"
            />
            <Text style={styles.payButtonText}>
              {isInitiator ? `Pay ` : "Payment Link Sent"}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (messageType === "driver_details" && vehiclePhotos) {
      // Convert object values to array and filter out empty URLs
      const photoUrls = Object.values(vehiclePhotos).filter(Boolean);

      return (
        <View style={{ gap: scale(8) }}>
          {/* Message text */}
          {text ? (
            <Text
              style={[
                styles.messageText,
                isMe ? styles.myText : styles.otherText,
              ]}
            >
              {text}
            </Text>
          ) : null}

          {/* Vehicle photos section */}
          {photoUrls.length > 0 && (
            <TouchableOpacity
              style={styles.viewAllPhotosButton}
              onPress={() => {
                setSelectedImages(photoUrls);
                setCurrentImageIndex(0);
                setImageModalVisible(true);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="images-outline" size={scale(18)} color="#000" />
              <Text style={styles.viewAllPhotosText}>
                View All Vehicle Photos ({photoUrls.length})
              </Text>
              <Ionicons name="chevron-forward" size={scale(16)} color="#000" />
            </TouchableOpacity>
          )}
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
          onPress={() => handleLinkPress(link, links)}
          style={styles.linkContainer}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.linkBadge,
              { backgroundColor: linkInfo.color + "15" },
            ]}
          >
            <Ionicons
              name={linkInfo.icon}
              size={scale(14)}
              color={linkInfo.color}
            />
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

  const renderImageModal = () => (
    <Modal
      visible={imageModalVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setImageModalVisible(false)}
    >
      <View style={styles.imageModalOverlay}>
        <TouchableOpacity
          style={styles.imageModalClose}
          onPress={() => setImageModalVisible(false)}
          activeOpacity={0.8}
        >
          <Ionicons name="close" size={scale(28)} color="#fff" />
        </TouchableOpacity>

        <View style={styles.imageCounter}>
          <Text style={styles.imageCounterText}>
            {currentImageIndex + 1} / {selectedImages.length}
          </Text>
        </View>

        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) => {
            const newIndex = Math.round(
              event.nativeEvent.contentOffset.x /
                event.nativeEvent.layoutMeasurement.width
            );
            setCurrentImageIndex(newIndex);
          }}
          contentOffset={{ x: currentImageIndex * screenWidth, y: 0 }}
        >
          {selectedImages.map((imageUrl, index) => (
            <View key={index} style={styles.imageSlide}>
              <Image
                source={{ uri: imageUrl }}
                style={styles.fullScreenImage}
                resizeMode="contain"
              />
            </View>
          ))}
        </ScrollView>

        {selectedImages.length > 1 && (
          <>
            {currentImageIndex > 0 && (
              <TouchableOpacity
                style={[styles.imageNavButton, styles.imageNavLeft]}
                onPress={() => setCurrentImageIndex((prev) => prev - 1)}
                activeOpacity={0.8}
              >
                <Ionicons name="chevron-back" size={scale(32)} color="#fff" />
              </TouchableOpacity>
            )}

            {currentImageIndex < selectedImages.length - 1 && (
              <TouchableOpacity
                style={[styles.imageNavButton, styles.imageNavRight]}
                onPress={() => setCurrentImageIndex((prev) => prev + 1)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="chevron-forward"
                  size={scale(32)}
                  color="#fff"
                />
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </Modal>
  );

  const renderRideCard = () => {
    const ride = chat?.ride_post_id || chat;

    return (
      <View style={styles.rideCardContainer}>
        <DriverPostCard trip={ride} />

        {role === "ride_owner" && (
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.primaryButton,
              (paymentLinkSent || paymentLinkLoading) && styles.disabledButton,
            ]}
            onPress={sendPaymentLink}
            disabled={paymentLinkSent || paymentLinkLoading}
            activeOpacity={0.8}
          >
            {paymentLinkLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons
                name={
                  paymentLinkSent ? "checkmark-circle-outline" : "link-outline"
                }
                size={scale(18)}
                color="#fff"
              />
            )}
            <Text style={[styles.actionButtonText, { color: "#fff" }]}>
              {paymentLinkLoading
                ? "Generating Link..."
                : paymentLinkSent
                ? "Link Sent"
                : "Send Payment Link"}
            </Text>
          </TouchableOpacity>
        )}

        {role === "initiator" && (
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.secondaryButton,
                (detailsSent || sendingDetails) && styles.disabledButton,
              ]}
              onPress={sendDriverDetails}
              disabled={detailsSent || sendingDetails}
              activeOpacity={0.8}
            >
              {sendingDetails ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Ionicons
                  name={
                    detailsSent
                      ? "checkmark-circle-outline"
                      : "information-circle-outline"
                  }
                  size={scale(18)}
                  color={detailsSent ? "#999" : "#000"}
                />
              )}
              <Text
                style={[
                  styles.actionButtonText,
                  styles.secondaryButtonText,
                  (detailsSent || sendingDetails) && styles.disabledButtonText,
                ]}
              >
                {sendingDetails
                  ? "Sending..."
                  : detailsSent
                  ? "Details Sent"
                  : "Send Details"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.secondaryButton,
                !detailsSent && styles.disabledButton,
              ]}
              onPress={AskForPaymentLink}
              disabled={!detailsSent}
              activeOpacity={0.8}
            >
              <Ionicons
                name={detailsSent ? "cash-outline" : "checkmark-circle-outline"}
                size={scale(18)}
                color={detailsSent ? "#000" : "#999"}
              />
              <Text
                style={[styles.actionButtonText, styles.secondaryButtonText]}
              >
                Request Payment Link
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.primaryButton,
                !paymentLinkSent && styles.disabledButton,
              ]}
              onPress={() => {
                const paymentMessage = messages.find(
                  (msg) => msg.messageType === "payment_link" && msg.paymentUrl
                );
                if (paymentMessage?.paymentUrl) {
                  handleLinkPress(paymentMessage.paymentUrl, [
                    paymentMessage.paymentUrl,
                  ]);
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
              <Ionicons
                name="card-outline"
                size={scale(18)}
                color={paymentLinkSent ? "#fff" : "#999"}
              />
              <Text
                style={[
                  styles.actionButtonText,
                  { color: paymentLinkSent ? "#fff" : "#999" },
                ]}
              >
                {paymentLinkSent
                  ? `Pay ₹${
                      chat?.ride_post_id?.commissionAmount ||
                      chat?.rideData?.commissionAmount ||
                      chat?.commissionAmount ||
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
      const botMessage =
        role === "ride_owner"
          ? "Aapka commission aapke wallet me add ho chuka hai 😊 Ride complete hone ke 24 ghante ke andar amount unlock hoke seedha aapke account me transfer kar di jayegi."
          : item.text;

      return (
        <View style={styles.botMessageContainer}>
          <View style={styles.botHeader}>
            <View style={styles.botIconContainer}>
              <Ionicons
                name="checkmark-circle"
                size={moderateScale(20)}
                color="#34C759"
              />
            </View>
            <Text style={styles.botName}>Taxi Safar Bot</Text>
          </View>
          <View style={styles.botBubble}>
            <Text style={styles.botMessageText}>{botMessage}</Text>
            <Text style={styles.botBubbleTime}>{formatTime(item.sentAt)}</Text>
          </View>

          <TouchableOpacity
            style={styles.backToRideButton}
            onPress={() => navigation.replace("MyTrip")}
            activeOpacity={0.8}
          >
            <Ionicons
              name="arrow-back-circle-outline"
              size={moderateScale(20)}
              color="#007AFF"
            />
            <Text style={styles.backToRideButtonText}>Back To Ride</Text>
          </TouchableOpacity>
        </View>
      );
    }

    {
      item.isOptimistic && (
        <ActivityIndicator
          size="small"
          color={isMe ? "#fff" : "#000"}
          style={{ marginTop: 5 }}
        />
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
            item.amount,
            item?.vehiclePhotos, // Pass vehiclePhotos here
            extractImageUrlsFromText
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
            <Ionicons name="call-outline" size={scale(20)} color="#333" />
            <Text style={styles.menuText}>Call</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleMenuAction("support")}
          >
            <Ionicons
              name="help-circle-outline"
              size={scale(20)}
              color="#333"
            />
            <Text style={styles.menuText}>Taxi Support</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleMenuAction("refresh")}
          >
            <Ionicons name="refresh-outline" size={scale(20)} color="#333" />
            <Text style={styles.menuText}>Refresh Chat</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleMenuAction("back")}
          >
            <Ionicons name="arrow-back-outline" size={scale(20)} color="#333" />
            <Text style={styles.menuText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const renderErrorState = () => (
    <View style={styles.errorContainer}>
      <Ionicons name="alert-circle-outline" size={scale(48)} color="#FF3B30" />
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={retryFetchMessages}>
        <Ionicons name="refresh-outline" size={scale(20)} color="#fff" />
        <Text style={styles.retryButtonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.loadingText}>Loading conversation...</Text>
          {refreshing && (
            <Text style={styles.refreshingText}>Refreshing...</Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  if (error && messages.length === 0) {
    return (
      <SafeAreaView style={styles.container}>{renderErrorState()}</SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={scale(24)} color="#333" />
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <Text style={styles.headerName} numberOfLines={1}>
            Chat With{" "}
            {role === "initiator"
              ? company?.company_name
              : samneWalaDriver?.driver_name || "Driver"}
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
          <Ionicons name="ellipsis-vertical" size={scale(20)} color="#333" />
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
          <TouchableOpacity onPress={() => setError(null)}>
            <Ionicons name="close" size={scale(16)} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

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
          refreshing={refreshing}
          onRefresh={retryFetchMessages}
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
              editable={!sendingMessage}
            />

            <TouchableOpacity
              onPress={sendMessage}
              style={[
                styles.sendButton,
                text.trim() && !sendingMessage && styles.sendButtonActive,
              ]}
              disabled={!text.trim() || sendingMessage}
              activeOpacity={0.7}
            >
              {sendingMessage ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons
                  name="send"
                  size={scale(20)}
                  color={text.trim() && !sendingMessage ? "#ffffff" : "#999"}
                />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {renderMenu()}
      {renderImageModal()}
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
    paddingHorizontal: scale(20),
  },
  loadingText: {
    marginTop: verticalScale(16),
    fontSize: moderateScale(16),
    color: "#666",
    fontWeight: "500",
  },
  refreshingText: {
    marginTop: verticalScale(8),
    fontSize: moderateScale(14),
    color: "#999",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: scale(20),
  },
  errorText: {
    fontSize: moderateScale(16),
    color: "#666",
    textAlign: "center",
    marginVertical: verticalScale(16),
  },
  retryButton: {
    flexDirection: "row",
    backgroundColor: "#FF3B30",
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(12),
    borderRadius: scale(8),
    alignItems: "center",
  },
  retryButtonText: {
    color: "#fff",
    fontSize: moderateScale(16),
    fontWeight: "600",
    marginLeft: scale(8),
  },
  errorBanner: {
    backgroundColor: "#FF3B30",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(8),
  },
  errorBannerText: {
    color: "#fff",
    fontSize: moderateScale(14),
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },

  // Bot message styles
  botMessageContainer: {
    alignItems: "center",
    marginVertical: verticalScale(8),
  },
  botHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: verticalScale(8),
    gap: scale(6),
  },
  botIconContainer: {
    width: scale(24),
    height: scale(24),
    borderRadius: scale(12),
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
  },
  botName: {
    fontSize: moderateScale(12),
    fontWeight: "600",
    color: "#666",
  },
  botBubble: {
    backgroundColor: "#F0FFF4",
    padding: scale(12),
    borderRadius: scale(16),
    maxWidth: "85%",
    borderWidth: 1,
    borderColor: "#C6F6D5",
  },
  botMessageText: {
    fontSize: moderateScale(15),
    color: "#2D3748",
    lineHeight: moderateScale(20),
    textAlign: "center",
  },
  botBubbleTime: {
    fontSize: moderateScale(10),
    color: "#718096",
    marginTop: verticalScale(4),
    textAlign: "center",
  },

  // Header styles
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
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
    width: scale(40),
    height: scale(40),
    justifyContent: "center",
    alignItems: "center",
    marginRight: scale(8),
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: moderateScale(17),
    fontWeight: "600",
    color: "#333",
  },
  headerStatus: {
    fontSize: moderateScale(13),
    color: "#666",
    marginTop: verticalScale(2),
  },
  typingHeader: {
    fontSize: moderateScale(13),
    color: "#000",
    marginTop: verticalScale(2),
    fontStyle: "italic",
  },
  menuButton: {
    width: scale(40),
    height: scale(40),
    justifyContent: "center",
    alignItems: "center",
  },

  // Menu styles
  menuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: verticalScale(100),
    paddingRight: scale(16),
  },
  menuContainer: {
    backgroundColor: "#ffffff",
    borderRadius: scale(12),
    paddingVertical: verticalScale(8),
    minWidth: scale(160),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
  },
  menuText: {
    fontSize: moderateScale(16),
    color: "#333",
    marginLeft: scale(12),
    fontWeight: "500",
  },

  // Messages list
  messagesList: {
    padding: scale(16),
    paddingBottom: verticalScale(8),
  },

  // Ride card container
  rideCardContainer: {
    marginBottom: verticalScale(24),
  },

  // Image modal styles
  imageModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  imageModalClose: {
    position: "absolute",
    top: verticalScale(50),
    right: scale(20),
    zIndex: 10,
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  imageCounter: {
    position: "absolute",
    top: verticalScale(50),
    left: scale(20),
    zIndex: 10,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(8),
    borderRadius: scale(20),
  },
  imageCounterText: {
    color: "#fff",
    fontSize: moderateScale(14),
    fontWeight: "600",
  },
  imageSlide: {
    width: screenWidth,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  fullScreenImage: {
    width: "90%",
    height: "70%",
  },
  imageNavButton: {
    position: "absolute",
    top: "50%",
    width: scale(50),
    height: scale(50),
    borderRadius: scale(25),
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  imageNavLeft: {
    left: scale(20),
  },
  imageNavRight: {
    right: scale(20),
  },

  // Action buttons
  actionButton: {
    flexDirection: "row",
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(16),
    borderRadius: scale(12),
    alignItems: "center",
    justifyContent: "center",
    marginBottom: verticalScale(8),
  },
  primaryButton: {
    backgroundColor: "#000",
  },
  secondaryButton: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#000",
  },
  actionButtonsContainer: {
    gap: verticalScale(8),
  },
  actionButtonText: {
    fontSize: moderateScale(14),
    fontWeight: "600",
    marginLeft: scale(6),
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

  // Message styles
  messageContainer: {
    marginVertical: verticalScale(2),
    marginTop: verticalScale(12),
  },
  myMessageContainer: {
    alignItems: "flex-end",
  },
  otherMessageContainer: {
    alignItems: "flex-start",
  },
  bubble: {
    padding: scale(12),
    borderRadius: scale(18),
    maxWidth: "80%",
  },
  myBubble: {
    borderBottomRightRadius: scale(4),
  },
  otherBubble: {
    backgroundColor: "#E5E5EA",
    borderBottomLeftRadius: scale(4),
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
    fontSize: moderateScale(16),
    // lineHeight: moderateScale(10),
  },
  myText: {
    color: "#000",
  },
  otherText: {
    color: "#000",
  },
  bubbleTime: {
    fontSize: moderateScale(10),
    marginTop: verticalScale(4),
    fontWeight: "400",
  },
  myBubbleTime: {
    color: "#000",
    textAlign: "right",
  },
  otherBubbleTime: {
    color: "#000",
    textAlign: "left",
  },

  // Link styles
  linkContainer: {
    marginVertical: verticalScale(4),
  },
  linkBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: verticalScale(4),
    paddingHorizontal: scale(8),
    borderRadius: scale(6),
    gap: scale(4),
    alignSelf: "flex-start",
  },
  linkText: {
    fontSize: moderateScale(10),
    fontWeight: "600",
    color: "#000",
    letterSpacing: 0.5,
  },

  // Payment button styles
  payButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: verticalScale(10),
    paddingHorizontal: scale(16),
    borderRadius: scale(12),
    gap: scale(8),
  },
  payButtonActive: {
    backgroundColor: "#000",
  },
  payButtonSent: {
    backgroundColor: "#34C759",
  },
  payButtonText: {
    color: "#fff",
    fontSize: moderateScale(14),
    fontWeight: "600",
  },

  // Input container
  inputContainer: {
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#E5E5EA",
  },
  typingIndicator: {
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(8),
    paddingBottom: verticalScale(4),
  },
  typingText: {
    fontSize: moderateScale(12),
    color: "#000",
    fontStyle: "italic",
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
    gap: scale(8),
  },
  input: {
    flex: 1,
    backgroundColor: "#F2F2F7",
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(10),
    borderRadius: scale(20),
    fontSize: moderateScale(16),
    maxHeight: verticalScale(100),
    color: "#333",
  },
  sendButton: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#E5E5EA",
  },
  sendButtonActive: {
    backgroundColor: "#000",
  },
  backToRideButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E3F2FD",
    flex: 1,
    width: "100%",
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(20),
    borderRadius: moderateScale(12),
    marginTop: verticalScale(12),
    borderWidth: 1,
    borderColor: "#90CAF9",
  },
  backToRideButtonText: {
    fontSize: moderateScale(15),
    fontWeight: "600",
    color: "#007AFF",
    marginLeft: scale(8),
  },
  viewAllPhotosButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8F8F8",
    paddingVertical: verticalScale(10),
    paddingHorizontal: scale(12),
    borderRadius: scale(8),
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  viewAllPhotosText: {
    flex: 1,
    fontSize: moderateScale(11),
    fontWeight: "600",
    color: "#000",
    marginLeft: scale(8),
  },
});

export default ChatBox;
