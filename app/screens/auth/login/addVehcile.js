import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Image,
  ScrollView,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Alert,
  Platform,
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
import { SafeAreaView } from "react-native-safe-area-context";
import { scale, verticalScale, moderateScale } from "react-native-size-matters";

const MAX_FILE_SIZE = 2 * 1024 * 1024;

export default function AddVehicle({ navigation }) {
  const route = useRoute();
  const { driverId, fromAll, mobile } = route.params || {};
  const VEHICLE_TYPES = ["Mini", "Sedan", "SUV", "Invoa Crysta Premium"];

  const { data, fetchSettings } = useSettings({ autoFetch: true });

  const [rcNumber, setRcNumber] = useState("");
  const [rcData, setRcData] = useState(null);
  const [isRcVerified, setIsRcVerified] = useState(false);
  const [isVerifyingRc, setIsVerifyingRc] = useState(false);

  const [vehicleType, setVehicleType] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [dates, setDates] = useState({
    regDate: null,
    insuranceExpiry: null,
    permitExpiry: null,
  });

  const [docs, setDocs] = useState({
    rcFront: null,
    rcBack: null,
    insurance: null,
    permit: null,
    vehicleFront: null,
    vehicleBack: null,
    vehicleInterior: null,
  });

  const [demoModal, setDemoModal] = useState({
    visible: false,
    image: null,
    title: "",
  });

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
        if (onPrimaryPress) {
          onPrimaryPress();
        }
        setAlertVisible(false);
      },
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
    if (rcData?.rc_number) {
      setVehicleNumber(rcData.rc_number || "");
    }
  }, [rcData]);

  const handleVerifyRC = async () => {
    fetchSettings();

    if (!rcNumber.trim()) {
      return showAlert("error", "Invalid", "Enter RC number");
    }

    setIsVerifyingRc(true);

    const deviceId = await Application.getAndroidId();

    try {
      const res = await axios.post(`${API_URL_APP}/api/v1/rc-verify`, {
        rcNumber: rcNumber.toUpperCase().trim(),
        isByPass,
        driverId,
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
        fillFormFromRC(data);
        setIsRcVerified(true);

        showAlert("success", "RC Verified", "Vehicle details loaded");
      }
    } catch (err) {
      const errorData = err.response?.data;

      if (errorData?.rcData) {
        setRcData(errorData.rcData);
      }

      showAlert(
        "error",
        "Verification Failed",
        errorData?.message || "Failed to verify RC"
      );
    } finally {
      setIsVerifyingRc(false);
    }
  };

  const fillFormFromRC = async (rcInfo) => {
    setVehicleNumber(rcInfo.rc_number || "");

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

  const getFileSize = async (uri) => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      return blob.size;
    } catch (error) {
      return 0;
    }
  };

  const pickImage = async (key, source = "library") => {
    try {
      let result;

      const options = {
        quality: 0.8,
        allowsEditing: false,
      };

      if (source === "camera") {
        result = await ImagePicker.launchCameraAsync(options);
      } else {
        result = await ImagePicker.launchImageLibraryAsync(options);
      }

      if (!result.canceled && result.assets[0]) {
        const { uri } = result.assets[0];

        const fileSize = await getFileSize(uri);

        if (fileSize > MAX_FILE_SIZE) {
          return showAlert(
            "error",
            "File Too Large",
            "Image size must be less than 2MB. Please select a smaller image or compress it."
          );
        }

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

  const showImagePickerOptions = (key, hasDemo = false) => {
    const options = [
      {
        text: "Camera",
        onPress: () => pickImage(key, "camera"),
      },
      {
        text: "Gallery",
        onPress: () => pickImage(key, "library"),
      },
    ];

    if (hasDemo) {
      options.push({
        text: "View Demo",
        onPress: () => showDemoImage(key),
      });
    }

    options.push({ text: "Cancel", onPress: () => {}, style: "cancel" });

    Alert.alert(
      "Choose Photo Source",
      "Select how to upload the photo",
      options
    );
  };

  const showDemoImage = (field) => {
    if (DEMO_IMAGES[field]) {
      setDemoModal({
        visible: true,
        image: DEMO_IMAGES[field],
        title: getDocLabel(field),
      });
    }
  };

  const getDocLabel = (field) => {
    const labels = {
      rcFront: "RC Front",
      rcBack: "RC Back",
      insurance: "Insurance Certificate",
      permit: "Authorization 1Year Permit",
      vehicleFront: "Vehicle Front Photo",
      vehicleBack: "Vehicle Back Photo",
      vehicleInterior: "Interior (Seat Covers)",
    };
    return labels[field] || field;
  };

  const validateForm = () => {
    const e = {};
    if (!vehicleType) e.vehicleType = "Select vehicle type";
    if (!dates.permitExpiry) e.permitExpiry = "Select permit expiry";
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

    [
      "rcFront",
      "rcBack",
      "insurance",
      "permit",
      "vehicleFront",
      "vehicleBack",
      "vehicleInterior",
    ].forEach((k) => {
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
        if (fromAll) {
          showAlert(
            "success",
            "Success!",
            "Vehicle added successfully!",
            () => {
              navigation.goBack();
            }
          );
        } else {
          showAlert(
            "success",
            "Success!",
            "Vehicle added successfully!",
            () => {
              navigation.navigate("bankAdd", {
                driverId: res.data.driverId || riderId,
              });
            }
          );
        }
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
      <Text style={styles.errorText}>{errors[field]}</Text>
    ) : null;
  };

  const renderDocumentUpload = (field, hasDemo = false) => {
    return (
      <View style={styles.docUploadContainer}>
        <View style={styles.docHeader}>
          <Text style={styles.docLabel}>{getDocLabel(field)}</Text>
          {docs[field] && (
            <View style={styles.uploadedBadge}>
              <Ionicons
                name="checkmark-circle"
                size={scale(10)}
                color="#10b981"
              />
              <Text style={styles.uploadedText}>Uploaded</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.uploadBox,
            errors[field] && styles.uploadBoxError,
            docs[field] && styles.uploadBoxSuccess,
          ]}
          onPress={() => showImagePickerOptions(field, hasDemo)}
        >
          {docs[field] ? (
            <Image
              source={{ uri: docs[field].uri }}
              style={styles.uploadedImage}
            />
          ) : (
            <View style={styles.uploadPlaceholder}>
              <Ionicons
                name="cloud-upload-outline"
                size={moderateScale(40)}
                color="#9ca3af"
              />
              <Text style={styles.uploadHintText}>Tap to upload</Text>
              <Text style={styles.uploadSubText}>
                Camera or Gallery (Max 2MB)
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {renderError(field)}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <BackWithLogo isLogo={false} title={"Add Your Vehicle"} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {!isRcVerified ? (
          <View style={styles.rcCard}>
            <View style={styles.rcIconContainer}>
              <Ionicons
                name="car-outline"
                size={moderateScale(48)}
                color={Colors.primary}
              />
            </View>
            <Text style={styles.rcTitle}>Verify RC Number</Text>
            <Text style={styles.rcSubtitle}>
              Enter your vehicle's registration number
            </Text>

            <Text style={styles.inputLabel}>RC Number</Text>
            <View style={styles.rcInputRow}>
              <TextInput
                style={styles.rcInput}
                placeholder="DL01AB1234"
                value={rcNumber}
                onChangeText={setRcNumber}
                autoCapitalize="characters"
                placeholderTextColor="#9ca3af"
              />
              <TouchableOpacity
                style={[
                  styles.verifyButton,
                  isVerifyingRc && styles.verifyButtonDisabled,
                ]}
                onPress={handleVerifyRC}
                disabled={isVerifyingRc}
              >
                {isVerifyingRc ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.verifyButtonText}>Verify</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            <View style={styles.verifiedCard}>
              <Ionicons
                name="shield-checkmark"
                size={moderateScale(32)}
                color="#10b981"
              />
              <View style={styles.verifiedTextContainer}>
                <Text style={styles.verifiedTitle}>RC Verified</Text>
                <Text style={styles.verifiedSubtitle}>
                  Vehicle details loaded successfully
                </Text>
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Vehicle Information</Text>

              <Text style={styles.inputLabel}>Vehicle Type</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={vehicleType}
                  onValueChange={setVehicleType}
                  style={styles.picker}
                >
                  <Picker.Item label="Select Vehicle Type" value="" />
                  {VEHICLE_TYPES.map((type) => (
                    <Picker.Item key={type} label={type} value={type} />
                  ))}
                </Picker>
              </View>
              {renderError("vehicleType")}

              <Text style={styles.inputLabel}>Vehicle Number</Text>
              <TextInput
                style={[styles.textInput, styles.disabledInput]}
                value={vehicleNumber}
                editable={false}
              />

              <Text style={styles.inputLabel}>
                Authorization 1Year Permit Expiry Date
              </Text>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() =>
                  setShowDatePicker({ key: "permitExpiry", visible: true })
                }
              >
                <Text
                  style={
                    !dates.permitExpiry
                      ? styles.placeholderText
                      : styles.dateText
                  }
                >
                  {dates.permitExpiry
                    ? new Date(dates.permitExpiry).toLocaleDateString("en-GB")
                    : "Select Date"}
                </Text>
                <Ionicons
                  name="calendar-outline"
                  size={moderateScale(22)}
                  color={Colors.primary}
                />
              </TouchableOpacity>
              {renderError("permitExpiry")}
            </View>

            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>RC Book Photos</Text>
              <View style={styles.rcPhotosGrid}>
                <View style={styles.halfWidth}>
                  {renderDocumentUpload("rcFront", false)}
                </View>
                <View style={styles.halfWidth}>
                  {renderDocumentUpload("rcBack", false)}
                </View>
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Additional Documents</Text>
              {renderDocumentUpload("insurance", false)}
              {renderDocumentUpload("permit", false)}
            </View>

            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Vehicle Photos</Text>
              <Text style={styles.sectionSubtitle}>
                Clear photos help us verify your vehicle faster
              </Text>
              {renderDocumentUpload("vehicleFront", true)}
              {renderDocumentUpload("vehicleBack", true)}
              {renderDocumentUpload("vehicleInterior", true)}
            </View>

            <TouchableOpacity
              style={[
                styles.submitButton,
                loading && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Text style={styles.submitButtonText}>Submit & Continue</Text>
                  <Ionicons
                    name="arrow-forward"
                    size={moderateScale(20)}
                    color="#fff"
                  />
                </>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      <Modal
        visible={demoModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setDemoModal({ visible: false, image: null, title: "" })
        }
      >
        <View style={styles.modalOverlay}>
          <View style={styles.demoModalContainer}>
            <View style={styles.demoModalHeader}>
              <Text style={styles.demoModalTitle}>{demoModal.title}</Text>
              <TouchableOpacity
                onPress={() =>
                  setDemoModal({ visible: false, image: null, title: "" })
                }
                style={styles.closeButton}
              >
                <Ionicons
                  name="close-circle"
                  size={moderateScale(32)}
                  color="#6b7280"
                />
              </TouchableOpacity>
            </View>

            {demoModal.image && (
              <Image
                source={demoModal.image}
                style={styles.demoImage}
                resizeMode="contain"
              />
            )}

            <View style={styles.demoHintContainer}>
              <Ionicons
                name="information-circle"
                size={moderateScale(24)}
                color={Colors.primary}
              />
              <Text style={styles.demoHintText}>
                This is an example of a properly formatted photo. Ensure your
                photo is clear, well-lit, and follows this format.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.demoCloseButton}
              onPress={() =>
                setDemoModal({ visible: false, image: null, title: "" })
              }
            >
              <Text style={styles.demoCloseButtonText}>Got It</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {showDatePicker.visible && (
        <DateTimePicker
          mode="date"
          value={new Date()}
          minimumDate={new Date()}
          onChange={(event, selectedDate) => {
            if (event.type === "set" && selectedDate) {
              setDates((prev) => ({
                ...prev,
                [showDatePicker.key]: selectedDate.toISOString().split("T")[0],
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
    </SafeAreaView>
  );
}


const styles = {
  safeArea: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  scrollContent: {
    padding: scale(20),
    paddingBottom: verticalScale(40),
  },

  rcCard: {
    backgroundColor: "#fff",
    borderRadius: moderateScale(20),
    padding: scale(28),
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  rcIconContainer: {
    alignSelf: "center",
    backgroundColor: Colors.primary + "15",
    width: moderateScale(80),
    height: moderateScale(80),
    borderRadius: moderateScale(40),
    justifyContent: "center",
    alignItems: "center",
    marginBottom: verticalScale(16),
  },
  rcTitle: {
    fontSize: moderateScale(22),
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
    marginBottom: verticalScale(8),
  },
  rcSubtitle: {
    fontSize: moderateScale(15),
    color: "#6b7280",
    textAlign: "center",
    marginBottom: verticalScale(24),
  },
  inputLabel: {
    fontSize: moderateScale(15),
    fontWeight: "600",
    color: "#374151",
    marginBottom: verticalScale(8),
  },
  rcInputRow: {
    flexDirection: "row",
    gap: scale(12),
  },
  rcInput: {
    flex: 1,
    borderWidth: 2,
    borderColor: "#e5e7eb",
    borderRadius: moderateScale(14),
    padding: scale(16),
    fontSize: moderateScale(16),
    color: "#111827",
    backgroundColor: "#f9fafb",
  },
  verifyButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: scale(28),
    paddingVertical: verticalScale(16),
    borderRadius: moderateScale(14),
    justifyContent: "center",
    alignItems: "center",
    minWidth: scale(100),
  },
  verifyButtonDisabled: {
    opacity: 0.6,
  },
  verifyButtonText: {
    color: "#fff",
    fontSize: moderateScale(16),
    fontWeight: "700",
  },

  verifiedCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#d1fae5",
    padding: scale(18),
    borderRadius: moderateScale(16),
    marginBottom: verticalScale(24),
    borderWidth: 2,
    borderColor: "#a7f3d0",
  },
  verifiedTextContainer: {
    marginLeft: scale(12),
    flex: 1,
  },
  verifiedTitle: {
    fontSize: moderateScale(17),
    fontWeight: "700",
    color: "#065f46",
  },
  verifiedSubtitle: {
    fontSize: moderateScale(14),
    color: "#047857",
    marginTop: verticalScale(2),
  },

  formSection: {
    backgroundColor: "#fff",
    borderRadius: moderateScale(16),
    padding: scale(20),
    marginBottom: verticalScale(20),
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  sectionTitle: {
    fontSize: moderateScale(19),
    fontWeight: "700",
    color: "#111827",
    marginBottom: verticalScale(6),
  },
  sectionSubtitle: {
    fontSize: moderateScale(14),
    color: "#6b7280",
    marginBottom: verticalScale(16),
  },
  pickerContainer: {
    borderWidth: 2,
    borderColor: "#e5e7eb",
    borderRadius: moderateScale(14),
    backgroundColor: "#f9fafb",
    marginBottom: verticalScale(8),
    overflow: "hidden",
  },
  picker: {
    height: verticalScale(50),
  },
  textInput: {
    borderWidth: 2,
    borderColor: "#e5e7eb",
    borderRadius: moderateScale(14),
    padding: scale(16),
    fontSize: moderateScale(16),
    color: "#111827",
    backgroundColor: "#f9fafb",
    marginBottom: verticalScale(16),
  },
  disabledInput: {
    backgroundColor: "#f3f4f6",
    color: "#6b7280",
  },
  datePickerButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#e5e7eb",
    borderRadius: moderateScale(14),
    padding: scale(16),
    backgroundColor: "#f9fafb",
    marginBottom: verticalScale(8),
  },
  placeholderText: {
    color: "#9ca3af",
    fontSize: moderateScale(16),
  },
  dateText: {
    color: "#111827",
    fontSize: moderateScale(16),
    fontWeight: "500",
  },

  rcPhotosGrid: {
    flexDirection: "row",
    gap: scale(12),
  },
  halfWidth: {
    flex: 1,
  },

  docUploadContainer: {
    marginBottom: verticalScale(20),
  },
  docHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: verticalScale(10),
  },
  docLabel: {
    fontSize: moderateScale(15),
    fontWeight: "600",
    color: "#374151",
  },
  uploadedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(6),
    backgroundColor: "#d1fae5",
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
    borderRadius: moderateScale(20),
  },
  uploadedText: {
    fontSize: moderateScale(8),
    color: "#065f46",
    fontWeight: "600",
  },
  uploadBox: {
    height: verticalScale(160),
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#d1d5db",
    borderRadius: moderateScale(16),
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fafafa",
    overflow: "hidden",
  },
  uploadBoxError: {
    borderColor: "#ef4444",
    backgroundColor: "#fef2f2",
  },
  uploadBoxSuccess: {
    borderStyle: "solid",
    borderColor: "#10b981",
    backgroundColor: "#fff",
  },
  uploadedImage: {
    width: "100%",
    height: "100%",
  },
  uploadPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  uploadHintText: {
    fontSize: moderateScale(15),
    fontWeight: "600",
    color: "#6b7280",
    marginTop: verticalScale(10),
  },
  uploadSubText: {
    fontSize: moderateScale(13),
    color: "#9ca3af",
    marginTop: verticalScale(4),
  },
  errorText: {
    color: "#ef4444",
    fontSize: moderateScale(13),
    marginTop: verticalScale(6),
    fontWeight: "500",
  },

  submitButton: {
    backgroundColor: Colors.primary,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: scale(10),
    padding: scale(18),
    borderRadius: moderateScale(16),
    marginTop: verticalScale(10),
    elevation: 4,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: moderateScale(17),
    fontWeight: "700",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    padding: scale(16),
  },

  demoModalContainer: {
    backgroundColor: "#fff",
    borderRadius: moderateScale(24),
    padding: scale(24),
    maxHeight: "85%",
  },
  demoModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: verticalScale(20),
  },
  demoModalTitle: {
    fontSize: moderateScale(20),
    fontWeight: "700",
    color: "#111827",
    flex: 1,
  },
  closeButton: {
    padding: scale(4),
  },
  demoImage: {
    width: "100%",
    height: verticalScale(320),
    borderRadius: moderateScale(16),
    marginBottom: verticalScale(20),
  },
  demoHintContainer: {
    flexDirection: "row",
    backgroundColor: Colors.primary + "10",
    padding: scale(16),
    borderRadius: moderateScale(12),
    gap: scale(12),
    marginBottom: verticalScale(20),
  },
  demoHintText: {
    flex: 1,
    fontSize: moderateScale(14),
    color: "#374151",
    lineHeight: moderateScale(20),
  },
  demoCloseButton: {
    backgroundColor: Colors.primary,
    padding: scale(16),
    borderRadius: moderateScale(14),
    alignItems: "center",
  },
  demoCloseButtonText: {
    color: "#fff",
    fontSize: moderateScale(16),
    fontWeight: "700",
  },
};
