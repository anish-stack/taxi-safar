import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Image,
  TextInput,
  Modal,
  ScrollView,
  Dimensions,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import axios from "axios";
import { API_URL_APP } from "../../constant/api";
import loginStore from "../../store/auth.store";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

const MyJobsPosted = () => {
  const navigation = useNavigation();
  const { token } = loginStore();

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedJob, setSelectedJob] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const fetchJobs = async () => {
    try {
      const res = await axios.get(`${API_URL_APP}/api/v1/driver-jobs`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: 50, status: "active" },
      });
      setJobs(res.data.data || []);
      // console.log(res.data.data)
    } catch (error) {
      console.log("Error fetching jobs:", error);
      setJobs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchJobs();
  };

  const filteredJobs = jobs.filter((job) => {
    const query = searchQuery.toLowerCase();
    return (
      job.title?.toLowerCase().includes(query) ||
      job.company?.name?.toLowerCase().includes(query) ||
      job.location?.address?.toLowerCase().includes(query) ||
      job.driver_category?.toLowerCase().includes(query)
    );
  });

  const openJobModal = (job) => {
    setSelectedJob(job);
    setModalVisible(true);
  };

  const JobCard = ({ job }) => {
    const salaryText =
      job.salary?.min && job.salary?.max
        ? `₹${job.salary.min.toLocaleString()} - ₹${job.salary.max.toLocaleString()}`
        : job.salary?.min
        ? `₹${job.salary.min.toLocaleString()}+`
        : "Competitive";

    const daysAgo = Math.floor(
      (new Date() - new Date(job.createdAt)) / (1000 * 60 * 60 * 24)
    );

    return (
      <View style={styles.card}>
        {/* Top Section with Logo and Details */}
        <View style={styles.cardTopSection}>
          {/* Logo */}
          {/* <View style={styles.logoContainer}>
            {job.company?.logo?.url ? (
              <Image source={{ uri: job.company.logo.url }} style={styles.logo} />
            ) : (
              <View style={styles.logoPlaceholder}>
                <Text style={styles.logoText}>
                  {job.company?.name?.[0]?.toUpperCase() || "C"}
                </Text>
              </View>
            )}
          </View> */}

          {/* Details Section */}
          <View style={styles.detailsSection}>
            <View style={styles.detailsTop}>
              <View style={styles.detailsTextContainer}>
                <View style={{display:"flex",flexDirection:"row", justifyContent:"space-between"}}>
                   <Text style={styles.jobTitle} numberOfLines={2}>
                  {job.title}
                </Text>
                <Image
                source={{uri:"https://res.cloudinary.com/dqjoc7ajw/image/upload/v1765647542/images/rsqlo7dvofyz22ggpd4p.png"}}
                width={50}
              height={50}
              style={{position:"absolute",top:0,right:0}}

                />
                </View>
                <Text style={styles.companyName}>
                  {job.company?.name || "Unknown Company"}
                </Text>

                <View style={styles.locationRow}>
                  <Ionicons name="location-outline" size={14} color="#6B7280" />
                  <Text style={styles.locationText} numberOfLines={1}>
                    {job.location?.address || "Location not specified"}
                  </Text>
                </View>

                <View style={styles.metaRow}>
                  <Text style={styles.salary}>{salaryText}</Text>
                  <Text style={styles.posted}>
                    {daysAgo === 0 ? "Today" : `${daysAgo}d ago`}
                  </Text>
                </View>
              </View>

              {job.is_featured && (
                <View style={styles.featuredBadge}>
                  <Text style={styles.featuredText}>Featured</Text>
                </View>
              )}
            </View>

            {/* Bottom Buttons */}
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.viewButton}
                onPress={() => openJobModal(job)}
                activeOpacity={0.7}
              >
                <Text style={styles.viewButtonText}>View</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.callButton}
                onPress={()=>Linking.openURL(`tel:${job.driverId?.driver_contact_number}`)}
                activeOpacity={0.7}
              >
                <Text style={styles.callButtonText}>Call Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#EF4444" />
        <Text style={styles.loadingText}>Finding jobs for you...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>All Driver Post Jobs</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate("driver-job-create")}
          activeOpacity={0.7}
        >
          <Ionicons name="add-circle-outline" size={26} color="#EF4444" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons
          name="search"
          size={18}
          color="#9CA3AF"
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search jobs, companies..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#9CA3AF"
        />
      </View>

      {/* Jobs List */}
      <FlatList
        data={filteredJobs}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => <JobCard job={item} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#EF4444"]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="briefcase-outline" size={56} color="#D1D5DB" />
            <Text style={styles.emptyText}>No jobs available</Text>
            <Text style={styles.emptySub}>Pull down to refresh</Text>
          </View>
        }
      />

      {/* Job Details Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity 
                onPress={() => setModalVisible(false)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={26} color="#6B7280" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Job Details</Text>
              <View style={{ width: 26 }} />
            </View>

            {selectedJob && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Company Header */}
                <View style={styles.modalCompanyHeader}>
                  {selectedJob.company?.logo?.url ? (
                    <Image
                      source={{ uri: selectedJob.company.logo.url }}
                      style={styles.modalLogo}
                    />
                  ) : (
                    <View style={styles.modalLogoPlaceholder}>
                      <Text style={styles.modalLogoText}>
                        {selectedJob.company?.name?.[0]?.toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={styles.modalCompanyInfo}>
                    <Text style={styles.modalJobTitle} numberOfLines={2}>
                      {selectedJob.title}
                    </Text>
                    <Text style={styles.modalCompanyName}>
                      {selectedJob.company?.name}
                    </Text>
                  </View>
                </View>

                {/* Info Grid */}
                <View style={styles.infoGrid}>
                  <View style={styles.infoItem}>
                    <Ionicons name="cash-outline" size={18} color="#10B981" />
                    <Text style={styles.infoLabel}>Salary</Text>
                    <Text style={styles.infoValue}>
                      {selectedJob.salary?.min
                        ? `₹${selectedJob.salary.min.toLocaleString()} - ₹${(
                            selectedJob.salary.max ||
                            selectedJob.salary.min * 1.5
                          ).toLocaleString()}`
                        : "Not disclosed"}
                    </Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Ionicons name="time-outline" size={18} color="#EF4444" />
                    <Text style={styles.infoLabel}>Job Type</Text>
                    <Text style={styles.infoValue}>
                      {selectedJob.job_type
                        .replace("_", " ")
                        .charAt(0)
                        .toUpperCase() +
                        selectedJob.job_type.slice(1).replace("_", " ")}
                    </Text>
                  </View>
                </View>

                <View style={styles.infoGrid}>
                  <View style={styles.infoItem}>
                    <Ionicons name="car-outline" size={18} color="#3B82F6" />
                    <Text style={styles.infoLabel}>Category</Text>
                    <Text style={styles.infoValue}>
                      {selectedJob.driver_category
                        .replace("_", " ")
                        .replace("driver", "")}{" "}
                      Driver
                    </Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Ionicons
                      name="calendar-outline"
                      size={18}
                      color="#8B5CF6"
                    />
                    <Text style={styles.infoLabel}>Valid Till</Text>
                    <Text style={styles.infoValue}>
                      {new Date(selectedJob.valid_till).toLocaleDateString(
                        "en-IN"
                      )}
                    </Text>
                  </View>
                </View>

                {/* Location */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    <Ionicons name="location" size={16} color="#EF4444" />{" "}
                    Location
                  </Text>
                  <Text style={styles.sectionText}>
                    {selectedJob.location?.address}
                  </Text>
                </View>

                {/* Description */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    <Ionicons
                      name="document-text-outline"
                      size={16}
                      color="#6366F1"
                    />{" "}
                    Description
                  </Text>
                  <Text style={styles.descriptionText}>
                    {selectedJob.description}
                  </Text>
                </View>

                {/* Apply Button */}
                <TouchableOpacity 
                  style={styles.applyButton}
                  activeOpacity={0.85}
                                  onPress={()=>Linking.openURL(`tel:${selectedJob.driverId?.driver_contact_number}`)}

                >
                  <Text style={styles.applyButtonText}>Call Now</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#fff" 
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    fontFamily: "SFProDisplay-Medium",
    color: "#6B7280",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderColor: "#F3F4F6",
  },
  headerTitle: { 
    fontSize: 20, 
    fontFamily: "SFProDisplay-Bold",
    color: "#111827" 
  },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    margin: 14,
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    paddingVertical: 11,
    fontSize: 14,
    fontFamily: "SFProDisplay-Regular",
    color: "#111827",
  },

  listContent: { 
    paddingHorizontal: 14, 
    paddingBottom: 16 
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginVertical: 6,
    overflow: "hidden",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  cardTopSection: {
    flexDirection: "row",
    padding: 12,
  },
  logoContainer: {
    marginRight: 12,
  },
  logo: {
    width: 90,
    height: 110,
    borderRadius: 12,
  },
  logoPlaceholder: {
    width: 90,
    height: 110,
    backgroundColor: "#1F2937",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
  },
  logoText: { 
    color: "#fff", 
    fontSize: 32, 
    fontFamily: "SFProDisplay-Bold" 
  },
  detailsSection: {
    flex: 1,
    justifyContent: "space-between",
  },
  detailsTop: {
    flex: 1,
  },
  detailsTextContainer: {
    flex: 1,
  },
  featuredBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: "#F59E0B",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  featuredText: { 
    color: "#fff", 
    fontSize: 10, 
    fontFamily: "SFProDisplay-Bold" 
  },
  jobTitle: { 
    fontSize: 16, 
    fontFamily: "SFProDisplay-Bold",
    color: "#111827", 
    marginBottom: 3,
    lineHeight: 20,
  },
  companyName: {
    fontSize: 13,
    color: "#EF4444",
    fontFamily: "SFProDisplay-Semibold",
    marginBottom: 6,
  },
  locationRow: { 
    flexDirection: "row", 
    alignItems: "center", 
    marginBottom: 6,
  },
  locationText: { 
    fontSize: 12, 
    fontFamily: "SFProDisplay-Regular",
    color: "#6B7280", 
    marginLeft: 4, 
    flex: 1 
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 2,
  },
  salary: { 
    fontSize: 14, 
    fontFamily: "SFProDisplay-Bold",
    color: "#10B981" 
  },
  posted: { 
    fontSize: 11, 
    fontFamily: "SFProDisplay-Regular",
    color: "#9CA3AF" 
  },
  buttonRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  viewButton: {
    flex: 1,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#1F2937",
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: "center",
  },
  viewButtonText: {
    fontSize: 17,
    fontFamily: "SFProDisplay-Semibold",
    color: "#1F2937",
  },
  callButton: {
    flex: 1,
    backgroundColor: "#000",
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: "center",
  },
  callButtonText: {
    fontSize: 17,
    fontFamily: "SFProDisplay-Bold",
    color: "#fff",
  },

  emptyContainer: { 
    alignItems: "center", 
    marginTop: 70 
  },
  emptyText: { 
    fontSize: 16, 
    fontFamily: "SFProDisplay-Semibold",
    color: "#6B7280", 
    marginTop: 12 
  },
  emptySub: { 
    fontSize: 13, 
    fontFamily: "SFProDisplay-Regular",
    color: "#9CA3AF",
    marginTop: 4,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "90%",
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderColor: "#F3F4F6",
  },
  modalTitle: { 
    fontSize: 16, 
    fontFamily: "SFProDisplay-Bold",
    color: "#111827",
  },

  modalCompanyHeader: {
    flexDirection: "row",
    padding: 16,
    paddingBottom: 12,
  },
  modalLogo: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginRight: 12,
  },
  modalLogoPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: "#1F2937",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  modalLogoText: { 
    color: "#fff", 
    fontSize: 24, 
    fontFamily: "SFProDisplay-Bold" 
  },
  modalCompanyInfo: { 
    flex: 1, 
    justifyContent: "center" 
  },
  modalJobTitle: { 
    fontSize: 17, 
    fontFamily: "SFProDisplay-Bold",
    color: "#111827",
    lineHeight: 22,
  },
  modalCompanyName: {
    fontSize: 14,
    color: "#EF4444",
    fontFamily: "SFProDisplay-Semibold",
    marginTop: 3,
  },

  infoGrid: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  infoItem: { flex: 1 },
  infoLabel: { 
    fontSize: 12, 
    fontFamily: "SFProDisplay-Regular",
    color: "#6B7280", 
    marginTop: 5 
  },
  infoValue: { 
    fontSize: 14, 
    fontFamily: "SFProDisplay-Semibold",
    color: "#111827", 
    marginTop: 3 
  },

  section: { 
    paddingHorizontal: 16, 
    marginBottom: 20 
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "SFProDisplay-Bold",
    marginBottom: 8,
    color: "#111827",
  },
  sectionText: { 
    fontSize: 14, 
    fontFamily: "SFProDisplay-Regular",
    color: "#4B5563", 
    lineHeight: 20 
  },
  descriptionText: { 
    fontSize: 14, 
    fontFamily: "SFProDisplay-Regular",
    color: "#4B5563", 
    lineHeight: 22 
  },

  applyButton: {
    backgroundColor: "#000",
    marginHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
  },
  applyButtonText: { 
    color: "#fff", 
    fontSize: 15, 
    fontFamily: "SFProDisplay-Bold" 
  },
});

export default MyJobsPosted;