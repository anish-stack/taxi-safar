import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Image,
  ScrollView,
  Modal,
  ActivityIndicator,
  Alert,
  FlatList,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import axios from "axios";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import * as Application from "expo-application";
import { Colors } from "../../../constant/ui";
import BackWithLogo from "../../common/back_with_logo";
import { API_URL_APP } from "../../../constant/api";
import { useRoute } from "@react-navigation/native";
import { getData } from "../../../utils/storage";
import { UniversalAlert } from "../../common/UniversalAlert";
import useSettings from "../../../hooks/Settings";

export default function AddVehicle({ navigation }) {
  const route = useRoute();
  const { driverId } = route.params || {};
  const VEHICLE_TYPES = ["Mini", "Sedan", "SUV", "Premium"];

  const { data, fetchSettings } = useSettings({ autoFetch: true });

  // RC States
  const [rcNumber, setRcNumber] = useState("DL4CBE0478");
  const [rcData, setRcData] = useState(null);
  const [isRcVerified, setIsRcVerified] = useState(false);
  const [isVerifyingRc, setIsVerifyingRc] = useState(false);

  // Aadhaar States
  const [ownerAadhaar, setOwnerAadhaar] = useState("");
  const [showAadhaarModal, setShowAadhaarModal] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [showNameMismatchAlert, setShowNameMismatchAlert] = useState(false);
  const [isOwnerAadhaarFlow, setIsOwnerAadhaarFlow] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [aadhaarRequestId, setAadhaarRequestId] = useState(null);
  const [timer, setTimer] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const otpRefs = useRef([]);

  // Form States
  const [vehicleType, setVehicleType] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [dates, setDates] = useState({
    regDate: null,
    insuranceExpiry: null,
    permitExpiry: null,
  });

  // <CHANGE> Added 6 document fields for comprehensive vehicle documentation
  const [docs, setDocs] = useState({
    rcBook: null,
    insurance: null,
    permit: null,
    vehicleFront: null,
    vehicleBack: null,
    vehicleInterior: null,
  });

  // <CHANGE> Added demo modal state for showing sample photos
  const [demoModal, setDemoModal] = useState({
    visible: false,
    image: null,
    title: "",
  });

  // <CHANGE> Demo images mapping
  const DEMO_IMAGES = {
    vehicleFront: require("../../../assets/demo/front.jpg"),
    vehicleBack: require("../../../assets/demo/back.jpg"),
    vehicleInterior: require("../../../assets/demo/interior.jpg"),
  };

  const isByPass =
    data?.data?.ByPassApi === true || data?.ByPassApi === true ? true : false;

  const [showDatePicker, setShowDatePicker] = useState({
    key: null,
    visible: false,
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Alert
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    type: "success",
    title: "",
    message: "",
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
    (async () => {
      await ImagePicker.requestCameraPermissionsAsync();
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    })();
  }, []);

  useEffect(() => {
    if (timer > 0) {
      const id = setInterval(() => setTimer((t) => t - 1), 1000);
      return () => clearInterval(id);
    }
  }, [timer]);

  useEffect(() => {
    if (rcData) {
      checkDriverAadhaarMatch();
    }
  }, [rcData]);

  const checkDriverAadhaarMatch = async () => {
    try {
      const stored = await getData("aadhaar_verified_data");
      if (!stored) {
        setIsOwnerAadhaarFlow(true);
        setShowAadhaarModal(true);
        return;
      }

      const parsed = JSON.parse(stored);
      const driverName = parsed.data?.full_name?.toLowerCase().trim();
      const rcOwnerName = rcData.owner_name?.toLowerCase().trim();

      if (
        driverName &&
        rcOwnerName &&
        (driverName.includes(rcOwnerName) || rcOwnerName.includes(driverName))
      ) {
        showAlert("success", "Verified", "You're the vehicle owner!");
        return;
      }

      setShowNameMismatchAlert(true);
    } catch {
      setIsOwnerAadhaarFlow(true);
      setShowAadhaarModal(true);
    }
  };

  const handleNameMismatchResponse = (isMyVehicle) => {
    setShowNameMismatchAlert(false);
    if (!isMyVehicle) {
      setIsOwnerAadhaarFlow(true);
      setShowAadhaarModal(true);
    } else {
      showAlert("success", "Proceeding", "Continuing as vehicle owner");
    }
  };

  const handleVerifyRC = async () => {
    fetchSettings();
    if (!rcNumber.trim()) return showAlert("error", "Invalid", "Enter RC number");

    setIsVerifyingRc(true);
    const deviceId = await Application.getAndroidId();

    try {
      const res = await axios.post(`${API_URL_APP}/api/v1/rc-verify`, {
        rcNumber: rcNumber.toUpperCase().trim(),
        isByPass,
        deviceId,
      });

      if (res.data.success) {
        const data = res.data.rcData;

        if (
          data.vehicle_category?.includes("2W") ||
          data.vehicle_category?.includes("MOTORCYCLE")
        ) {
          return showAlert(
            "error",
            "Invalid Vehicle",
            "Only four-wheelers allowed"
          );
        }

        setRcData(data);

        // <CHANGE> Auto-fill form from RC data
        fillFormFromRC(data);

        setIsRcVerified(true);
        showAlert("success", "RC Verified", "Vehicle details loaded");
      } else {
        showAlert("error", "Failed", res.data.message || "Invalid RC");
      }
    } catch (err) {
      if (err.response?.data?.rcData) {
        setRcData(err.response.data.rcData);
      }
      showAlert(
        "error",
        "Error",
        err.response?.data?.message || "RC verification failed"
      );
    } finally {
      setIsVerifyingRc(false);
    }
  };

  // <CHANGE> Auto-fill form data from RC information
  const fillFormFromRC = async (rcInfo) => {
    // Set vehicle number
    setVehicleNumber(rcInfo.rc_number || "");

    // Set dates from RC data
    if (rcInfo.registration_date) {
      setDates((prev) => ({ ...prev, regDate: rcInfo.registration_date }));
    }

    if (rcInfo.insurance_upto) {
      setDates((prev) => ({
        ...prev,
        insuranceExpiry: rcInfo.insurance_upto,
      }));
    }
  };

  const handleGenerateAadhaarOTP = async () => {
    if (!/^\d{12}$/.test(ownerAadhaar)) {
      return showAlert(
        "error",
        "Invalid Aadhaar",
        "Enter 12-digit Aadhaar number"
      );
    }

    setIsVerifying(true);
    const deviceId = await Application.getAndroidId();

    try {
      const res = await axios.post(
        `${API_URL_APP}/api/v1/send-otp-on-aadhar`,
        {
          aadhaarNumber: ownerAadhaar,
          device_id: deviceId,
        }
      );

      if (res.data.success) {
        setAadhaarRequestId(res.data.request_id);
        setShowAadhaarModal(false);
        setShowOtpModal(true);
        setTimer(30);
        setOtp(["", "", "", "", "", ""]);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        showAlert("error", "Failed", res.data.message);
      }
    } catch (err) {
      showAlert(
        "error",
        "Error",
        err.response?.data?.message || "Failed to send OTP"
      );
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerifyAadhaarOtp = async () => {
    const otpValue = otp.join("");
    if (otpValue.length !== 6)
      return showAlert("error", "Invalid OTP", "Enter 6 digits");

    setIsVerifying(true);
    const deviceId = await Application.getAndroidId();

    try {
      const res = await axios.post(`${API_URL_APP}/api/v1/verify-otp-on-aadhar`, {
        request_id: aadhaarRequestId,
        otp: otpValue,
        deviceId,
        aadhaarNumber: ownerAadhaar,
      });

      if (res.data.success) {
        const aadhaarName = res.data.aadhaarData?.full_name?.toLowerCase().trim();
        const rcOwnerName = rcData?.owner_name?.toLowerCase().trim();

        if (
          aadhaarName &&
          rcOwnerName &&
          (aadhaarName.includes(rcOwnerName) || rcOwnerName.includes(aadhaarName))
        ) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setShowOtpModal(false);
          showAlert("success", "Success!", "Aadhaar verified successfully!");
        } else {
          showAlert(
            "error",
            "Name Mismatch",
            `RC Owner: ${rcData.owner_name}\nAadhaar: ${res.data.aadhaarData.full_name}`
          );
        }
      } else {
        showAlert("error", "Invalid OTP", res.data.message);
      }
    } catch (err) {
      showAlert(
        "error",
        "Error",
        err.response?.data?.message || "Verification failed"
      );
    } finally {
      setIsVerifying(false);
    }
  };

  // <CHANGE> Enhanced image picker with camera and gallery support
  const pickImage = async (key, source = "library") => {
    try {
      let result;

      if (source === "camera") {
        result = await ImagePicker.launchCameraAsync({
          quality: 0.8,
          allowsEditing: true,
          aspect: [4, 3],
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          quality: 0.8,
          allowsEditing: true,
          aspect: [4, 3],
        });
      }

      if (!result.canceled && result.assets[0]) {
        const { uri } = result.assets[0];
        setDocs((prev) => ({
          ...prev,
          [key]: { uri, name: uri.split("/").pop(), mimeType: "image/jpeg" },
        }));

        setErrors((prev) => {
          const e = { ...prev };
          delete e[key];
          return e;
        });

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      showAlert("error", "Error", "Failed to pick image");
    }
  };

  // <CHANGE> Show camera/gallery options
  const showImagePickerOptions = (key) => {
    Alert.alert("Choose Photo Source", "Select how to upload the photo", [
      {
        text: "Camera",
        onPress: () => pickImage(key, "camera"),
      },
      {
        text: "Gallery",
        onPress: () => pickImage(key, "library"),
      },
      {
        text: "View Demo",
        onPress: () => showDemoImage(key),
      },
      { text: "Cancel", onPress: () => {}, style: "cancel" },
    ]);
  };

  // <CHANGE> Show demo image modal
  const showDemoImage = (field) => {
    if (DEMO_IMAGES[field]) {
      setDemoModal({
        visible: true,
        image: DEMO_IMAGES[field],
        title: getDocLabel(field),
      });
    }
  };

  // <CHANGE> Get document labels
  const getDocLabel = (field) => {
    const labels = {
      rcBook: "RC Book (Detail Page)",
      insurance: "Insurance Certificate",
      permit: "Permit Document",
      vehicleFront: "Front Photo",
      vehicleBack: "Back Photo",
      vehicleInterior: "Interior (Seat Covers)",
    };
    return labels[field] || field;
  };

  const validateForm = () => {
    const e = {};
    if (!vehicleType) e.vehicleType = "Select vehicle type";
    if (!dates.permitExpiry) e.permitExpiry = "Select permit expiry";
    if (!docs.permit) e.permit = "Upload permit";
    if (!docs.vehicleFront) e.vehicleFront = "Upload front photo";
    if (!docs.vehicleBack) e.vehicleBack = "Upload back photo";
    if (!docs.vehicleInterior) e.vehicleInterior = "Upload interior photo";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm())
      return showAlert("error", "Incomplete", "Fill all required fields");

    setLoading(true);
    const riderId = driverId || (await getData("driverid"));
    const formData = new FormData();

    formData.append("vehicleType", vehicleType);
    formData.append("vehicleNumber", vehicleNumber.toUpperCase());
    formData.append("registrationDate", dates.regDate);
    formData.append("insuranceExpiry", dates.insuranceExpiry);
    formData.append("permitExpiry", dates.permitExpiry);

    if (rcData) formData.append("rcData", JSON.stringify(rcData));

    // <CHANGE> Add all document uploads
    ["rcBook", "insurance", "permit", "vehicleFront", "vehicleBack", "vehicleInterior"].forEach((k) => {
      if (docs[k]) {
        formData.append(k, {
          uri: docs[k].uri,
          type: docs[k].mimeType,
          name: docs[k].name,
        });
      }
    });

    try {
      const res = await axios.post(
        `${API_URL_APP}/api/v1/add-vehicle-details/${riderId}`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      if (res.data.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showAlert("success", "Success!", "Vehicle added successfully!", () => {
          navigation.navigate("bankAdd", {
            driverId: res.data.driverId || riderId,
          });
        });
      }
    } catch (err) {
      showAlert(
        "error",
        "Failed",
        err.response?.data?.message || "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  };

  const renderError = (field) => {
    return errors[field] ? (
      <Text style={styles.error}>{errors[field]}</Text>
    ) : null;
  };

  // <CHANGE> Document upload section with camera/gallery options
  const renderDocumentUpload = (field) => {
    const isPhoto = ["vehicleFront", "vehicleBack", "vehicleInterior"].includes(
      field
    );
    return (
      <View key={field} style={styles.docItem}>
        <View style={styles.docHeader}>
          <Text style={styles.docLabel}>{getDocLabel(field)}</Text>
          {docs[field] && (
            <View style={styles.uploadedBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#10b981" />
              <Text style={styles.uploadedText}>Uploaded</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.uploadBox,
            errors[field] && styles.uploadBoxError,
            docs[field] && styles.uploadBoxFilled,
          ]}
          onPress={() => showImagePickerOptions(field)}
        >
          {docs[field] ? (
            <Image source={{ uri: docs[field].uri }} style={styles.uploadImg} />
          ) : (
            <View style={styles.uploadPlaceholder}>
              <Ionicons name="cloud-upload-outline" size={32} color="#999" />
              <Text style={styles.uploadHint}>Tap to upload</Text>
              <Text style={styles.uploadSubHint}>Camera or Gallery</Text>
            </View>
          )}
        </TouchableOpacity>

        {renderError(field)}
      </View>
    );
  };

  return (
    <>
      <BackWithLogo />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Add Your Vehicle</Text>

        {!isRcVerified ? (
          <View style={styles.card}>
            <Text style={styles.label}>RC Number</Text>
            <View style={styles.row}>
              <TextInput
                style={styles.input}
                placeholder="DL01AB1234"
                value={rcNumber}
                onChangeText={setRcNumber}
                autoCapitalize="characters"
              />
              <TouchableOpacity
                style={styles.verifyBtn}
                onPress={handleVerifyRC}
                disabled={isVerifyingRc}
              >
                {isVerifyingRc ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.verifyText}>Verify</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={24} color="#10b981" />
              <Text style={styles.verifiedText}>RC Verified</Text>
            </View>

            <Text style={styles.section}>Vehicle Type</Text>
            <View style={styles.pickerBox}>
              <Picker selectedValue={vehicleType} onValueChange={setVehicleType}>
                <Picker.Item label="Select Type" value="" />
                {VEHICLE_TYPES.map((t) => (
                  <Picker.Item key={t} label={t} value={t} />
                ))}
              </Picker>
            </View>
            {errors.vehicleType && (
              <Text style={styles.error}>{errors.vehicleType}</Text>
            )}

            <Text style={styles.label}>Vehicle Number</Text>
            <TextInput
              style={styles.input}
              value={vehicleNumber}
              editable={false}
            />

            <Text style={styles.label}>Permit Expiry</Text>
            <TouchableOpacity
              style={styles.dateBox}
              onPress={() =>
                setShowDatePicker({ key: "permitExpiry", visible: true })
              }
            >
              <Text
                style={!dates.permitExpiry && styles.placeholder}
              >
                {dates.permitExpiry
                  ? new Date(dates.permitExpiry).toLocaleDateString("en-GB")
                  : "Select Date"}
              </Text>
              <Ionicons name="calendar" size={20} color={Colors.primary} />
            </TouchableOpacity>
            {errors.permitExpiry && (
              <Text style={styles.error}>{errors.permitExpiry}</Text>
            )}

            {/* <CHANGE> Documents section with all 6 document fields */}
            <Text style={styles.section}>Documents</Text>
            <View style={styles.docsGrid}>
              {["rcBook", "insurance", "permit"].map((field) =>
                renderDocumentUpload(field)
              )}
            </View>

            {/* <CHANGE> Vehicle photos section with grid layout */}
            <Text style={styles.section}>Vehicle Photos</Text>
            <View style={styles.photoGrid}>
              {["vehicleFront", "vehicleBack", "vehicleInterior"].map(
                (field) => renderDocumentUpload(field)
              )}
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, loading && { opacity: 0.7 }]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>Submit & Continue</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* <CHANGE> Demo Image Modal */}
      <Modal
        visible={demoModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setDemoModal({ visible: false, image: null, title: "" })
        }
      >
        <View style={styles.modalOverlay}>
          <View style={styles.demoModalCard}>
            <View style={styles.demoHeader}>
              <Text style={styles.demoTitle}>{demoModal.title}</Text>
              <TouchableOpacity
                onPress={() =>
                  setDemoModal({ visible: false, image: null, title: "" })
                }
              >
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>

            {demoModal.image && (
              <Image
                source={demoModal.image}
                style={styles.demoImage}
                resizeMode="contain"
              />
            )}

            <Text style={styles.demoHint}>
              This is an example of a properly formatted photo. Make sure your
              photo is clear and follows this format.
            </Text>

            <TouchableOpacity
              style={styles.demoCloseBtn}
              onPress={() =>
                setDemoModal({ visible: false, image: null, title: "" })
              }
            >
              <Text style={styles.demoCloseBtnText}>Got It</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Name Mismatch Modal */}
      <Modal visible={showNameMismatchAlert} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Ionicons
              name="alert-circle"
              size={60}
              color="#f59e0b"
              style={{ alignSelf: "center" }}
            />
            <Text style={styles.modalTitle}>Name Mismatch Detected</Text>
            <Text style={{ textAlign: "center", marginVertical: 16, color: "#666" }}>
              RC Owner:{" "}
              <Text style={{ fontWeight: "bold" }}>{rcData?.owner_name}</Text>
            </Text>
            <Text style={{ textAlign: "center", marginBottom: 24 }}>
              Is this your vehicle?
            </Text>
            <View style={styles.btnRow}>
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: "#10b981" }]}
                onPress={() => handleNameMismatchResponse(true)}
              >
                <Text style={styles.btnText}>Yes, it's mine</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => handleNameMismatchResponse(false)}
              >
                <Text style={styles.btnText}>No, different owner</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Aadhaar Modal */}
      <Modal visible={showAadhaarModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Ionicons
              name="card-outline"
              size={64}
              color={Colors.primary}
              style={{ alignSelf: "center", marginBottom: 20 }}
            />
            <Text style={styles.modalTitle}>
              {isOwnerAadhaarFlow ? "Verify Owner Aadhaar" : "Verify Your Aadhaar"}
            </Text>
            {isOwnerAadhaarFlow && rcData && (
              <View style={styles.ownerInfoBox}>
                <Text style={styles.ownerInfoText}>
                  RC Owner:{" "}
                  <Text style={{ fontWeight: "700" }}>{rcData.owner_name}</Text>
                </Text>
              </View>
            )}
            <Text style={styles.inputLabel}>Aadhaar Number</Text>
            <TextInput
              placeholder="1234 5678 9012"
              placeholderTextColor="#aaa"
              value={ownerAadhaar.replace(/(\d{4})(\d{4})(\d{4})/, "$1 $2 $3")}
              onChangeText={(text) => {
                const digits = text.replace(/\D/g, "").slice(0, 12);
                setOwnerAadhaar(digits);
              }}
              keyboardType="numeric"
              maxLength={14}
              style={styles.aadhaarInput}
              autoFocus
            />
            <View style={styles.btnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setShowAadhaarModal(false);
                  setOwnerAadhaar("");
                }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  ownerAadhaar.length !== 12 && { opacity: 0.5 },
                ]}
                onPress={handleGenerateAadhaarOTP}
                disabled={ownerAadhaar.length !== 12 || isVerifying}
              >
                {isVerifying ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.btnText}>Send OTP</Text>
                )}
              </TouchableOpacity>
            </View>
            <Text style={styles.hintText}>
              OTP will be sent to mobile linked with Aadhaar
            </Text>
          </View>
        </View>
      </Modal>

      {/* OTP Modal */}
      <Modal visible={showOtpModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Enter OTP</Text>
            <View style={styles.otpRow}>
              {otp.map((_, i) => (
                <TextInput
                  key={i}
                  ref={(ref) => (otpRefs.current[i] = ref)}
                  value={otp[i]}
                  onChangeText={(v) => {
                    if (/^\d?$/.test(v)) {
                      const newOtp = [...otp];
                      newOtp[i] = v;
                      setOtp(newOtp);
                      if (v && i < 5) otpRefs.current[i + 1]?.focus();
                    }
                  }}
                  onKeyPress={({ nativeEvent }) => {
                    if (
                      nativeEvent.key === "Backspace" &&
                      !otp[i] &&
                      i > 0
                    ) {
                      otpRefs.current[i - 1]?.focus();
                    }
                  }}
                  keyboardType="numeric"
                  maxLength={1}
                  style={styles.otpBox}
                />
              ))}
            </View>
            <Text style={{ textAlign: "center", marginVertical: 16 }}>
              {timer > 0 ? (
                `Resend in ${timer}s`
              ) : (
                <TouchableOpacity onPress={handleGenerateAadhaarOTP}>
                  <Text style={{ color: Colors.primary, fontWeight: "600" }}>
                    Resend OTP
                  </Text>
                </TouchableOpacity>
              )}
            </Text>
            <View style={styles.btnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setShowOtpModal(false);
                  setShowAadhaarModal(true);
                }}
              >
                <Text style={styles.cancelBtnText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleVerifyAadhaarOtp}
                disabled={isVerifying}
              >
                {isVerifying ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnText}>Verify</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {showDatePicker.visible && (
        <DateTimePicker
          mode="date"
          value={new Date()}
          minimumDate={new Date()}
          onChange={(e, date) => {
            if (e.type === "set" && date) {
              setDates((prev) => ({
                ...prev,
                [showDatePicker.key]: date.toISOString().split("T")[0],
              }));
            }
            setShowDatePicker({ key: null, visible: false });
          }}
        />
      )}

      <UniversalAlert
        visible={alertVisible}
        {...alertConfig}
        onClose={() => setAlertVisible(false)}
      />
    </>
  );
}

// <CHANGE> Enhanced styles with grid layouts and improved document upload UI
const styles = {
  container: {
    padding: 20,
    backgroundColor: "#f9f9f9",
    paddingBottom: 80,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    color: "#222",
  },
  card: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 16,
    elevation: 5,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 16,
    backgroundColor: "#fff",
    fontSize: 16,
  },
  verifyBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    marginLeft: 12,
  },
  verifyText: {
    color: "#fff",
    fontWeight: "600",
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#d1fae5",
    padding: 14,
    borderRadius: 12,
    marginVertical: 16,
  },
  verifiedText: {
    color: "#065f46",
    fontWeight: "600",
    marginLeft: 8,
    fontSize: 16,
  },
  section: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 24,
    marginBottom: 12,
    color: "#222",
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 8,
    color: "#333",
  },
  pickerBox: {
    borderWidth: 1.5,
    borderColor: "#ddd",
    borderRadius: 12,
    backgroundColor: "#fff",
    marginBottom: 8,
  },
  dateBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#ddd",
    borderRadius: 12,
    backgroundColor: "#fff",
    alignItems: "center",
  },
  placeholder: {
    color: "#aaa",
  },

  // <CHANGE> Document and photo grid styles
  docsGrid: {
    marginBottom: 24,
  },
  photoGrid: {
    marginBottom: 24,
  },
  docItem: {
    marginBottom: 20,
  },
  docHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  docLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  uploadedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  uploadedText: {
    fontSize: 12,
    color: "#10b981",
    fontWeight: "600",
  },
  uploadBox: {
    height: 140,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#ddd",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fafafa",
  },
  uploadBoxError: {
    borderColor: "#ef4444",
  },
  uploadBoxFilled: {
    borderStyle: "solid",
    borderColor: "#e5e7eb",
  },
  uploadImg: {
    width: "100%",
    height: "100%",
    borderRadius: 10,
  },
  uploadPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  uploadHint: {
    color: "#666",
    fontSize: 15,
    fontWeight: "600",
    marginTop: 8,
  },
  uploadSubHint: {
    color: "#999",
    fontSize: 13,
    marginTop: 4,
  },

  // <CHANGE> Demo modal styles
  demoModalCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 28,
    elevation: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  demoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  demoTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#222",
  },
  demoImage: {
    width: "100%",
    height: 300,
    borderRadius: 12,
    marginBottom: 16,
  },
  demoHint: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 20,
  },
  demoCloseBtn: {
    backgroundColor: Colors.primary,
    padding: 14,
    borderRadius: 30,
    alignItems: "center",
  },
  demoCloseBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },

  submitBtn: {
    backgroundColor: Colors.primary,
    padding: 18,
    borderRadius: 30,
    alignItems: "center",
    marginTop: 30,
  },
  submitText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "bold",
  },
  error: {
    color: "red",
    fontSize: 13,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 28,
    elevation: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 16,
    color: "#222",
  },
  ownerInfoBox: {
    backgroundColor: "#f0fdf4",
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#86efac",
  },
  ownerInfoText: {
    textAlign: "center",
    color: "#166534",
    fontSize: 15,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  aadhaarInput: {
    borderWidth: 2,
    borderColor: Colors.primary + "40",
    backgroundColor: "#f8faff",
    borderRadius: 12,
    padding: 18,
    fontSize: 22,
    fontWeight: "600",
    letterSpacing: 6,
    textAlign: "center",
    color: "#1e40af",
  },
  hintText: {
    textAlign: "center",
    color: "#6b7280",
    fontSize: 13,
    marginTop: 20,
    fontStyle: "italic",
  },
  cancelBtn: {
    flex: 1,
    padding: 14,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: 30,
    alignItems: "center",
  },
  cancelBtnText: {
    color: Colors.primary,
    fontWeight: "600",
    fontSize: 15,
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    padding: 14,
    borderRadius: 30,
    alignItems: "center",
  },
  btnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
  btnRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  otpRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 20,
  },
  otpBox: {
    width: 50,
    height: 50,
    borderWidth: 2,
    borderColor: "#ddd",
    borderRadius: 12,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "bold",
  },
};