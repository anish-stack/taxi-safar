import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Image,
  ScrollView,
  Alert,
  Platform,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import axios from "axios";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../../constant/ui";
import BackWithLogo from "../../common/back_with_logo";
import { API_URL_APP } from "../../../constant/api";
import { useRoute } from "@react-navigation/native";
import { getData } from "../../../utils/storage";

export default function AddVehicle({ navigation }) {
  const route = useRoute();
  const { driverId } = route.params || {};

  // Vehicle types
  const VEHICLE_TYPES = ["Mini", "Sedan", "SUV", "Premium"];

  // State
  const [brands, setBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [vehicleNames, setVehicleNames] = useState([]);
  const [vehicleName, setVehicleName] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [dates, setDates] = useState({
    regDate: null,
    validity: null,
    insuranceExpiry: null,
    permitExpiry: null,
  });
  const [docs, setDocs] = useState({
    rcFront: null,
    rcBack: null,
    insurance: null,
    permit: null,
  });
  const [showDatePicker, setShowDatePicker] = useState({ key: null, visible: false });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [brandsLoading, setBrandsLoading] = useState(true);

  // Fetch brands on mount
  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    try {
      setBrandsLoading(true);
      const res = await axios.get(`${API_URL_APP}/api/v1/vehicles/get-all-brands`);

      if (res.data.success && Array.isArray(res.data.data)) {
        setBrands(res.data.data);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error) {
      console.error("Error fetching brands:", error);
      Alert.alert(
        "Error",
        "Failed to load brands. Please check your connection and try again.",
        [{ text: "Retry", onPress: fetchBrands }, { text: "Cancel" }]
      );
    } finally {
      setBrandsLoading(false);
    }
  };

  const handleBrandSelect = (brand) => {
    setSelectedBrand(brand);
    clearFieldError("brand");

    if (Array.isArray(brand.vehicleNames)) {
      setVehicleNames(brand.vehicleNames);
    } else if (typeof brand.vehicleNames === "string") {
      setVehicleNames(brand.vehicleNames.split(",").map((v) => v.trim()));
    } else {
      setVehicleNames([]);
    }

    // Reset vehicle name when brand changes
    setVehicleName("");
  };

  const pickDocument = async (field) => {
    Alert.alert(`Upload ${getDocLabel(field)}`, "Choose source", [
      {
        text: "Camera",
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== "granted") {
            Alert.alert("Permission Required", "Camera access is needed.");
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
            allowsEditing: true,
          });
          if (!result.canceled) {
            const uri = result.assets[0].uri;
            setDocs((prev) => ({
              ...prev,
              [field]: { uri, name: `${field}.jpg`, mimeType: "image/jpeg" },
            }));
            clearFieldError(field);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        },
      },
      {
        text: "Gallery",
        onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== "granted") {
            Alert.alert("Permission Denied", "Gallery access is required.");
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
            allowsEditing: true,
          });
          if (!result.canceled) {
            const uri = result.assets[0].uri;
            setDocs((prev) => ({
              ...prev,
              [field]: { uri, name: `${field}.jpg`, mimeType: "image/jpeg" },
            }));
            clearFieldError(field);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const getDocLabel = (field) => {
    const labels = {
      rcFront: "Front Side of RC Book",
      rcBack: "Back Side of RC Book",
      insurance: "Vehicle Insurance",
      permit: "1 Year Permit Document",
    };
    return labels[field];
  };

  const handleDateChange = (event, selectedDate) => {
    if (event.type === "set" && selectedDate) {
      const formatted = selectedDate.toISOString().split("T")[0];
      setDates((prev) => ({ ...prev, [showDatePicker.key]: formatted }));
      clearFieldError(showDatePicker.key);
    }
    setShowDatePicker({ key: null, visible: false });
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
    errors[field] ? <Text style={styles.fieldError}>{errors[field]}</Text> : null;

  const validateForm = () => {
    const newErrors = {};

    if (!selectedBrand) newErrors.brand = "Please select a brand";
    if (!vehicleName) newErrors.vehicleName = "Please select vehicle name";
    if (!vehicleType) newErrors.vehicleType = "Please select vehicle type";
    if (!vehicleNumber.trim()) newErrors.vehicleNumber = "Please enter vehicle number";
    if (!dates.regDate) newErrors.regDate = "Please select registration date";
    if (!dates.validity) newErrors.validity = "Please select validity";
    if (!dates.insuranceExpiry) newErrors.insuranceExpiry = "Please select insurance expiry";
    if (!dates.permitExpiry) newErrors.permitExpiry = "Please select permit expiry";
    if (!docs.rcFront) newErrors.rcFront = "Please upload RC front";
    if (!docs.rcBack) newErrors.rcBack = "Please upload RC back";
    if (!docs.insurance) newErrors.insurance = "Please upload insurance";
    if (!docs.permit) newErrors.permit = "Please upload permit";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert("Validation Error", "Please fill in all required fields");
      return;
    }
      setLoading(true);

      const getDriverId = await getData("driverid");
      const riderId = getDriverId || driverId;

    try {

      if (!riderId) {
        Alert.alert("Error", "Driver ID not found. Please log in again.");
        return;
      }

      // Prepare FormData
      const formData = new FormData();
      formData.append("brandId", selectedBrand._id);
      formData.append("vehicle_brand", selectedBrand?.brandName);
      formData.append("vehicleName", vehicleName);
      formData.append("vehicleType", vehicleType);
      formData.append("vehicleNumber", vehicleNumber.toUpperCase());
      formData.append("registrationDate", dates.regDate);
      formData.append("registrationValidity", dates.validity);
      formData.append("insuranceExpiry", dates.insuranceExpiry);
      formData.append("permitExpiry", dates.permitExpiry);

      // Append documents
      Object.keys(docs).forEach((key) => {
        if (docs[key]) {
          formData.append(key, {
            uri: docs[key].uri,
            type: docs[key].mimeType,
            name: docs[key].name,
          });
        }
      });

      // API call
      const response = await axios.post(
        `${API_URL_APP}/api/v1/add-vehicle-details/${riderId}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.data.success) {
        const driverId = response.data.driverId || riderId;
        
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        Alert.alert("Success", "Vehicle registered successfully!", [
          {
            text: "OK",
            onPress: () => {
              setTimeout(() => {
                navigation.navigate("bankAdd", { driverId });
              }, 200);
            },
          },
        ]);
      } else {
        throw new Error(response.data.message || "Failed to register vehicle");
      }

    } catch (error) {
      console.error("Error submitting vehicle:", error.response?.data);

      let errorMessage = "Failed to register vehicle. Please try again.";

      if (error.response) {
        errorMessage = error.response.data?.message || errorMessage;
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert("Error", errorMessage);
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

  if (brandsLoading) {
    return (
      <>
        <BackWithLogo />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading brands...</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <BackWithLogo />
      {renderProgressBar(3)}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Vehicle Registration</Text>
        <Text style={styles.subtitle}>Enter your vehicle details</Text>

        {/* Brand Grid */}
        <View>
          <Text style={styles.label}>Select Brand</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.brandGrid}>
              {brands.map((brand) => (
                <TouchableOpacity
                  key={brand._id}
                  onPress={() => handleBrandSelect(brand)}
                  style={[
                    styles.brandBox,
                    selectedBrand?._id === brand._id && styles.brandBoxSelected,
                  ]}
                  disabled={loading}
                >
                  <Image
                    source={{ uri: brand.brandLogo?.url }}
                    style={styles.brandLogo}
                    resizeMode="contain"
                  />
                  <Text style={styles.brandName}>{brand.brandName}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
        {renderError("brand")}

        {/* Vehicle Name Picker */}
        <Text style={styles.label}>Vehicle Name</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={vehicleName}
            onValueChange={(itemValue) => {
              setVehicleName(itemValue);
              clearFieldError("vehicleName");
            }}
            style={styles.picker}
            enabled={!loading && vehicleNames.length > 0}
          >
            <Picker.Item label="Select vehicle" value="" />
            {vehicleNames.map((v, i) => (
              <Picker.Item key={i} label={v} value={v} />
            ))}
          </Picker>
        </View>
        {renderError("vehicleName")}

        {/* Vehicle Type Picker */}
        <Text style={styles.label}>Vehicle Type</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={vehicleType}
            onValueChange={(itemValue) => {
              setVehicleType(itemValue);
              clearFieldError("vehicleType");
            }}
            style={styles.picker}
            enabled={!loading}
          >
            <Picker.Item label="Select vehicle type" value="" />
            {VEHICLE_TYPES.map((type) => (
              <Picker.Item key={type} label={type} value={type} />
            ))}
          </Picker>
        </View>
        {renderError("vehicleType")}

        {/* Vehicle Number */}
        <Text style={styles.label}>Vehicle Number</Text>
        <TextInput
          placeholder="e.g. AN01J 8844"
          value={vehicleNumber}
          onChangeText={(v) => {
            setVehicleNumber(v.toUpperCase());
            clearFieldError("vehicleNumber");
          }}
          style={styles.input}
          autoCapitalize="characters"
          editable={!loading}
        />
        {renderError("vehicleNumber")}

        {/* Date Fields */}
        {[
          { key: "regDate", label: "Registration Date" },
          { key: "validity", label: "Registration Validity" },
          { key: "insuranceExpiry", label: "Insurance Expiry" },
          { key: "permitExpiry", label: "Permit Expiry" },
        ].map(({ key, label }) => (
          <View key={key}>
            <Text style={styles.label}>{label}</Text>
            <TouchableOpacity
              style={styles.input}
              onPress={() => setShowDatePicker({ key, visible: true })}
              disabled={loading}
            >
              <Text
                style={[styles.dateText, !dates[key] && styles.placeholder]}
              >
                {dates[key]
                  ? new Date(dates[key]).toLocaleDateString("en-GB")
                  : "dd-mm-yyyy"}
              </Text>
              <Ionicons
                name="calendar-outline"
                size={20}
                color={Colors.primary}
                style={styles.calendarIcon}
              />
            </TouchableOpacity>
            {renderError(key)}
          </View>
        ))}

        {showDatePicker.visible && (
          <DateTimePicker
            mode="date"
            value={
              dates[showDatePicker.key]
                ? new Date(dates[showDatePicker.key])
                : new Date()
            }
            minimumDate={
              showDatePicker.key === "regDate" ? undefined : new Date()
            }
            onChange={handleDateChange}
          />
        )}

        {/* Document Uploads */}
        {[
          { field: "rcFront", label: "Front Side of RC Book" },
          { field: "rcBack", label: "Back Side of RC Book" },
          { field: "insurance", label: "Vehicle Insurance" },
          { field: "permit", label: "1 Year Permit Document" },
        ].map(({ field, label }) => (
          <View key={field}>
            <Text style={styles.label}>Upload {label}</Text>
            <TouchableOpacity
              style={styles.uploadBox}
              onPress={() => pickDocument(field)}
              disabled={loading}
            >
              {docs[field] ? (
                <Image
                  source={{ uri: docs[field].uri }}
                  style={styles.uploadPreview}
                />
              ) : (
                <>
                  <Ionicons
                    name="cloud-upload-outline"
                    size={28}
                    color={Colors.textSecondary}
                  />
                  <Text style={styles.uploadText}>Tap to upload</Text>
                </>
              )}
            </TouchableOpacity>
            {renderError(field)}
          </View>
        ))}

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.nextButton, loading && styles.nextButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <Text style={styles.nextText}>Submit Vehicle</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}

// === STYLES ===
const styles = {
  scrollContent: { padding: 20, backgroundColor: Colors.background },
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
    position: "relative",
  },
  dateText: { color: Colors.textPrimary },
  placeholder: { color: Colors.placeholder },
  calendarIcon: { position: "absolute", right: 16, top: 16 },
  pickerContainer: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    backgroundColor: Colors.white,
    marginBottom: 6,
  },
  picker: { height: 50 },
  brandGrid: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
  },
  brandBox: {
    width: 100,
    height: 100,
    borderRadius: 10,
    backgroundColor: "#fff",
    marginRight: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  brandBoxSelected: {
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  brandLogo: {
    width: 60,
    height: 40,
    marginBottom: 5,
  },
  brandName: {
    fontSize: 13,
    color: "#333",
  },
  uploadBox: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    backgroundColor: Colors.white,
    marginBottom: 6,
    minHeight: 100,
    justifyContent: "center",
  },
  uploadPreview: { width: "100%", height: 120, borderRadius: 8 },
  uploadText: { marginTop: 8, color: Colors.textSecondary, fontSize: 14 },
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
};