// screens/Jobs.js
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import axios from "axios";
import { API_URL_APP } from "../../constant/api";
import loginStore from "../../store/auth.store";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

const Jobs = () => {
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
      job.skills?.some((s) => s.toLowerCase().includes(query)) ||
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
      <TouchableOpacity
        style={styles.card}
        onPress={() => openJobModal(job)}
        activeOpacity={0.95}
      >
        <View style={styles.cardHeader}>
          {job.company?.logo?.url ? (
            <Image source={{ uri: job.company.logo.url }} style={styles.logo} />
          ) : (
            <View style={styles.logoPlaceholder}>
              <Text style={styles.logoText}>
                {job.company?.name?.[0]?.toUpperCase() || "C"}
              </Text>
            </View>
          )}
          <View style={styles.featuredBadge}>
            {job.is_featured && (
              <Text style={styles.featuredText}>Featured</Text>
            )}
          </View>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.jobTitle} numberOfLines={2}>
            {job.title}
          </Text>
          <Text style={styles.companyName}>
            {job.company?.name || "Unknown Company"}
          </Text>

          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={16} color="#666" />
            <Text style={styles.locationText} numberOfLines={1}>
              {job.location?.address || "Location not specified"}
            </Text>
          </View>

          <View style={styles.tagsContainer}>
            <View style={styles.tag}>
              <Text style={styles.tagText}>
                {job.job_type.replace("_", " ").charAt(0).toUpperCase() +
                  job.job_type.slice(1).replace("_", " ")}
              </Text>
            </View>
            <View style={[styles.tag, styles.categoryTag]}>
              <Text style={styles.tagText}>
                {job.driver_category.replace("_", " ").replace("driver", "")}{" "}
                Driver
              </Text>
            </View>
          </View>

          <View style={styles.cardFooter}>
            <Text style={styles.salary}>{salaryText}</Text>
            <Text style={styles.posted}>
              {daysAgo === 0 ? "Today" : `${daysAgo}d ago`}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
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
        <Text style={styles.headerTitle}>Find Driver Jobs</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate("driver-job-create")}
        >
          <Ionicons name="add-circle-outline" size={28} color="#EF4444" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons
          name="search"
          size={20}
          color="#888"
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search jobs, companies, skills..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
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
            <Ionicons name="briefcase-outline" size={64} color="#ccc" />
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
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={28} color="#666" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Job Details</Text>
              <View style={{ width: 28 }} />
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
                    <Text style={styles.modalJobTitle}>
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
                    <Ionicons name="cash-outline" size={20} color="#16a34a" />
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
                    <Ionicons name="time-outline" size={20} color="#EF4444" />
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
                    <Ionicons name="car-outline" size={20} color="#3b82f6" />
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
                      size={20}
                      color="#8b5cf6"
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
                    <Ionicons name="location" size={18} color="#EF4444" />{" "}
                    Location
                  </Text>
                  <Text style={styles.sectionText}>
                    {selectedJob.location?.address}
                  </Text>
                </View>

                {/* Skills */}
                {selectedJob.skills && selectedJob.skills.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                      <Ionicons name="star" size={18} color="#f59e0b" />{" "}
                      Required Skills
                    </Text>
                    <View style={styles.skillsContainer}>
                      {selectedJob.skills.map((skill, i) => (
                        <View key={i} style={styles.skillTag}>
                          <Text style={styles.skillText}>{skill}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Description */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    <Ionicons
                      name="document-text-outline"
                      size={18}
                      color="#6366f1"
                    />{" "}
                    Description
                  </Text>
                  <Text style={styles.descriptionText}>
                    {selectedJob.description}
                  </Text>
                </View>

                {/* Apply Button */}
                <TouchableOpacity style={styles.applyButton}>
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
  container: { flex: 1, backgroundColor: "#f9fafb" },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  loadingText: {
    marginTop: 12,
    textTransform: "capitalize",
    fontSize: 16,
    color: "#666",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 18,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: "#111" },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    margin: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchIcon: { marginRight: 10 },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    textTransform: "capitalize",
    fontSize: 16,
  },

  listContent: { paddingHorizontal: 16, paddingBottom: 20 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginVertical: 8,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  cardHeader: {
    position: "relative",
  },
  logo: {
    width: "100%",
    height: 100,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  logoPlaceholder: {
    width: "100%",
    height: 100,
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  logoText: { color: "#fff", fontSize: 36, fontWeight: "bold" },
  featuredBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "#fbbf24",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  featuredText: { color: "#fff", fontSize: 11, fontWeight: "bold" },

  cardBody: { padding: 16 },
  jobTitle: { fontSize: 18, fontWeight: "700", color: "#111", marginBottom: 4 },
  companyName: {
    fontSize: 15,
    color: "#EF4444",
    fontWeight: "600",
    marginBottom: 8,
  },
  locationRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  locationText: { fontSize: 14, color: "#555", marginLeft: 6, flex: 1 },
  tagsContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
    flexWrap: "wrap",
  },
  tag: {
    backgroundColor: "#fee2e2",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  categoryTag: { backgroundColor: "#dbeafe" },
  tagText: { fontSize: 12, fontWeight: "600", color: "#991b1b" },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  salary: { fontSize: 17, fontWeight: "bold", color: "#16a34a" },
  posted: { fontSize: 13, color: "#888" },

  emptyContainer: { alignItems: "center", marginTop: 80 },
  emptyText: { fontSize: 18, fontWeight: "600", color: "#666", marginTop: 16 },
  emptySub: { fontSize: 14, color: "#999" },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "95%",
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  modalTitle: { fontSize: 18, fontWeight: "bold" },

  modalCompanyHeader: {
    flexDirection: "row",
    padding: 20,
    paddingBottom: 16,
  },
  modalLogo: {
    width: 70,
    height: 70,
    borderRadius: 16,
    marginRight: 16,
  },
  modalLogoPlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 16,
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  modalLogoText: { color: "#fff", fontSize: 28, fontWeight: "bold" },
  modalCompanyInfo: { flex: 1, justifyContent: "center" },
  modalJobTitle: { fontSize: 20, fontWeight: "bold", color: "#111" },
  modalCompanyName: {
    textTransform: "capitalize",
    fontSize: 16,
    color: "#EF4444",
    marginTop: 4,
  },

  infoGrid: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 16,
    marginBottom: 20,
  },
  infoItem: { flex: 1 },
  infoLabel: { fontSize: 13, color: "#666", marginTop: 6 },
  infoValue: { fontSize: 15, fontWeight: "600", color: "#111", marginTop: 4 },

  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionTitle: {
    textTransform:"capitalize",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#111",
  },
  sectionText: { fontSize: 15, color: "#444", lineHeight: 22 },
  descriptionText: { fontSize: 15, color: "#444", lineHeight: 24 },

  skillsContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  skillTag: {
    backgroundColor: "#ecfdf5",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#86efac",
  },
  skillText: { color: "#166534", fontSize: 13, fontWeight: "600" },

  applyButton: {
    backgroundColor: "#000",
    marginHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  applyButtonText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
});

export default Jobs;
