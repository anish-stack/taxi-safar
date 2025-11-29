import React, { useEffect, useState, useCallback } from "react";
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

const { width, height } = Dimensions.get("window");

// Filter Options
const JOB_TYPES = [
  { label: "Full Time", value: "full_time" },
  { label: "Part Time", value: "part_time" },
  { label: "Contract", value: "contract" },
  { label: "Temporary", value: "temporary" },
];

const DRIVER_CATEGORIES = [
  { label: "Car", value: "car_driver" },
  { label: "Truck", value: "truck_driver" },
  { label: "Bus", value: "bus_driver" },
  { label: "Delivery", value: "delivery_driver" },
  { label: "Bike", value: "bike_driver" },
];

const MyJobsPosted = () => {
  const navigation = useNavigation();
  const { token } = loginStore();

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedJob, setSelectedJob] = useState(null);
  const [jobModalVisible, setJobModalVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Filter States
  const [showMyJobs, setShowMyJobs] = useState(false);
  const [selectedJobType, setSelectedJobType] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Temporary filter states (for modal)
  const [tempJobType, setTempJobType] = useState(null);
  const [tempCategory, setTempCategory] = useState(null);

  // Calculate active filters count
  const activeFiltersCount = [selectedJobType, selectedCategory].filter(Boolean).length;

  // Fetch Jobs with Filters
  const fetchJobs = async (pageNum = 1, append = false) => {
    try {
      if (pageNum === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const params = {
        page: pageNum,
        limit: 20,
        show: showMyJobs ? "all" : undefined,
        search: searchQuery.trim() || undefined,
        job_type: selectedJobType || undefined,
        driver_category: selectedCategory || undefined,
      };

      const res = await axios.get(`${API_URL_APP}/api/v1/driver-jobs`, {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });

      const newJobs = res.data.data || [];
      const pagination = res.data.pagination || {};

      if (append) {
        setJobs((prev) => [...prev, ...newJobs]);
      } else {
        setJobs(newJobs);
      }

      setTotalPages(pagination.pages || 1);
      setHasMore(pageNum < (pagination.pages || 1));
      setPage(pageNum);
    } catch (error) {
      console.log("Error fetching jobs:", error.response?.data || error.message);
      if (!append) setJobs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  // Debounced fetch on filter/search change
  useEffect(() => {
    setPage(1);
    setJobs([]);
    const delay = setTimeout(() => {
      fetchJobs(1, false);
    }, 500);

    return () => clearTimeout(delay);
  }, [searchQuery, showMyJobs, selectedJobType, selectedCategory]);

  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    fetchJobs(1, false);
  };

  const loadMore = () => {
    if (!loadingMore && hasMore && !loading) {
      fetchJobs(page + 1, true);
    }
  };

  const openJobModal = (job) => {
    setSelectedJob(job);
    setJobModalVisible(true);
  };

  const openFilterModal = () => {
    setTempJobType(selectedJobType);
    setTempCategory(selectedCategory);
    setFilterModalVisible(true);
  };

  const applyFilters = () => {
    setSelectedJobType(tempJobType);
    setSelectedCategory(tempCategory);
    setFilterModalVisible(false);
  };

  const resetFilters = () => {
    setTempJobType(null);
    setTempCategory(null);
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setSelectedJobType(null);
    setSelectedCategory(null);
  };

  // Job Card Component
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
          {job.is_featured && (
            <View style={styles.featuredBadge}>
              <Text style={styles.featuredText}>Featured</Text>
            </View>
          )}
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
                {job.driver_category.replace("_", " ").replace("driver", "")} Driver
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

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#EF4444" />
        <Text style={styles.footerText}>Loading more jobs...</Text>
      </View>
    );
  };

  if (loading && jobs.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#EF4444" />
        <Text style={styles.loadingText}>Loading jobs...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {showMyJobs ? "My Posted Jobs" : "Available Driver Jobs"}
        </Text>
        <TouchableOpacity onPress={() => navigation.navigate("driver-job-create")}>
          <Ionicons name="add-circle-outline" size={30} color="#EF4444" />
        </TouchableOpacity>
      </View>

      {/* Toggle: All Jobs vs My Jobs */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[styles.toggleBtn, !showMyJobs && styles.toggleActive]}
          onPress={() => setShowMyJobs(false)}
        >
          <Text style={[styles.toggleText, !showMyJobs && styles.toggleTextActive]}>
            All Jobs
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, showMyJobs && styles.toggleActive]}
          onPress={() => setShowMyJobs(true)}
        >
          <Text style={[styles.toggleText, showMyJobs && styles.toggleTextActive]}>
            My Posted Jobs
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search jobs, companies, skills..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={24} color="#EF4444" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filter Button */}
      <View style={styles.filterButtonRow}>
        <TouchableOpacity style={styles.filterButton} onPress={openFilterModal}>
          <Ionicons name="options-outline" size={20} color="#EF4444" />
          <Text style={styles.filterButtonText}>Filters</Text>
          {activeFiltersCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        {activeFiltersCount > 0 && (
          <TouchableOpacity style={styles.clearButton} onPress={clearAllFilters}>
            <Text style={styles.clearButtonText}>Clear All</Text>
          </TouchableOpacity>
        )}

        <View style={styles.resultCount}>
          <Text style={styles.resultText}>
            {jobs.length} {jobs.length === 1 ? "job" : "jobs"}
          </Text>
        </View>
      </View>

      {/* Jobs List */}
      <FlatList
        data={jobs}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => <JobCard job={item} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#EF4444"]} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="briefcase-outline" size={70} color="#ccc" />
            <Text style={styles.emptyText}>
              {showMyJobs ? "You haven't posted any jobs yet" : "No jobs found"}
            </Text>
            <Text style={styles.emptySub}>
              {showMyJobs ? "Tap + to post your first job" : "Try adjusting filters"}
            </Text>
          </View>
        }
      />

      {/* Filter Modal */}
      <Modal
        visible={filterModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.filterModalContent}>
            <View style={styles.filterModalHeader}>
              <Text style={styles.filterModalTitle}>Filters</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <Ionicons name="close" size={28} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.filterModalBody} showsVerticalScrollIndicator={false}>
              {/* Job Type Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>
                  <Ionicons name="briefcase" size={18} color="#EF4444" /> Job Type
                </Text>
                <View style={styles.filterOptions}>
                  {JOB_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type.value}
                      style={[
                        styles.filterOption,
                        tempJobType === type.value && styles.filterOptionActive,
                      ]}
                      onPress={() =>
                        setTempJobType(tempJobType === type.value ? null : type.value)
                      }
                    >
                      <View
                        style={[
                          styles.filterRadio,
                          tempJobType === type.value && styles.filterRadioActive,
                        ]}
                      >
                        {tempJobType === type.value && (
                          <View style={styles.filterRadioInner} />
                        )}
                      </View>
                      <Text
                        style={[
                          styles.filterOptionText,
                          tempJobType === type.value && styles.filterOptionTextActive,
                        ]}
                      >
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Driver Category Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>
                  <Ionicons name="car" size={18} color="#EF4444" /> Driver Category
                </Text>
                <View style={styles.filterOptions}>
                  {DRIVER_CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat.value}
                      style={[
                        styles.filterOption,
                        tempCategory === cat.value && styles.filterOptionActive,
                      ]}
                      onPress={() =>
                        setTempCategory(tempCategory === cat.value ? null : cat.value)
                      }
                    >
                      <View
                        style={[
                          styles.filterRadio,
                          tempCategory === cat.value && styles.filterRadioActive,
                        ]}
                      >
                        {tempCategory === cat.value && (
                          <View style={styles.filterRadioInner} />
                        )}
                      </View>
                      <Text
                        style={[
                          styles.filterOptionText,
                          tempCategory === cat.value && styles.filterOptionTextActive,
                        ]}
                      >
                        {cat.label} Driver
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={styles.filterModalFooter}>
              <TouchableOpacity style={styles.resetButton} onPress={resetFilters}>
                <Text style={styles.resetButtonText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyButton} onPress={applyFilters}>
                <Text style={styles.applyButtonText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Job Details Modal */}
      <Modal
        visible={jobModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setJobModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setJobModalVisible(false)}>
                <Ionicons name="close" size={28} color="#666" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Job Details</Text>
              <View style={{ width: 28 }} />
            </View>

            {selectedJob && (
              <ScrollView showsVerticalScrollIndicator={false} style={{ paddingBottom: 20 }}>
                <View style={styles.modalCompanyHeader}>
                  {selectedJob.company?.logo?.url ? (
                    <Image
                      source={{ uri: selectedJob.company.logo.url }}
                      style={styles.modalLogo}
                    />
                  ) : (
                    <View style={styles.modalLogoPlaceholder}>
                      <Text style={styles.modalLogoText}>
                        {selectedJob.company?.name?.[0]?.toUpperCase() || "C"}
                      </Text>
                    </View>
                  )}
                  <View style={styles.modalCompanyInfo}>
                    <Text style={styles.modalJobTitle}>{selectedJob.title}</Text>
                    <Text style={styles.modalCompanyName}>{selectedJob.company?.name}</Text>
                  </View>
                </View>

                <View style={styles.infoGrid}>
                  <View style={styles.infoItem}>
                    <Ionicons name="cash-outline" size={22} color="#16a34a" />
                    <Text style={styles.infoLabel}>Salary</Text>
                    <Text style={styles.infoValue}>
                      {selectedJob.salary?.min
                        ? `₹${selectedJob.salary.min.toLocaleString()} - ₹${(
                            selectedJob.salary.max || selectedJob.salary.min * 1.5
                          ).toLocaleString()}`
                        : "Not disclosed"}
                    </Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Ionicons name="time-outline" size={22} color="#EF4444" />
                    <Text style={styles.infoLabel}>Job Type</Text>
                    <Text style={styles.infoValue}>
                      {selectedJob.job_type.replace("_", " ").charAt(0).toUpperCase() +
                        selectedJob.job_type.slice(1).replace("_", " ")}
                    </Text>
                  </View>
                </View>

                <View style={styles.infoGrid}>
                  <View style={styles.infoItem}>
                    <Ionicons name="car-outline" size={22} color="#3b82f6" />
                    <Text style={styles.infoLabel}>Category</Text>
                    <Text style={styles.infoValue}>
                      {selectedJob.driver_category.replace("_", " ").replace("driver", "")}{" "}
                      Driver
                    </Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Ionicons name="calendar-outline" size={22} color="#8b5cf6" />
                    <Text style={styles.infoLabel}>Valid Till</Text>
                    <Text style={styles.infoValue}>
                      {new Date(selectedJob.valid_till).toLocaleDateString("en-IN")}
                    </Text>
                  </View>
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    <Ionicons name="location" size={18} color="#EF4444" /> Location
                  </Text>
                  <Text style={styles.sectionText}>{selectedJob.location?.address}</Text>
                </View>

                {selectedJob.skills && selectedJob.skills.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                      <Ionicons name="star" size={18} color="#f59e0b" /> Required Skills
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

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    <Ionicons name="document-text-outline" size={18} color="#6366f1" />{" "}
                    Description
                  </Text>
                  <Text style={styles.descriptionText}>{selectedJob.description}</Text>
                </View>

                <TouchableOpacity style={styles.callButton}>
                  <Ionicons name="call" size={22} color="#fff" />
                  <Text style={styles.callButtonText}>Call Employer</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default MyJobsPosted

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, fontSize: 16, color: "#666" },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 18,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerTitle: { fontSize: 24, fontWeight: "800", color: "#111" },

  toggleContainer: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 6,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  toggleActive: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  toggleText: { fontSize: 15, color: "#64748b", fontWeight: "600" },
  toggleTextActive: { color: "#EF4444", fontWeight: "700" },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, paddingVertical: 14, fontSize: 16, color: "#111" },

  filterButtonRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
  },
  filterButtonText: { fontSize: 15, fontWeight: "600", color: "#EF4444" },
  filterBadge: {
    backgroundColor: "#EF4444",
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  filterBadgeText: { color: "#fff", fontSize: 11, fontWeight: "bold" },
  clearButton: {
    backgroundColor: "#fee2e2",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  clearButtonText: { fontSize: 14, fontWeight: "600", color: "#EF4444" },
  resultCount: { marginLeft: "auto" },
  resultText: { fontSize: 14, color: "#666", fontWeight: "500" },

  listContent: { paddingHorizontal: 16, paddingBottom: 20 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginVertical: 8,
    overflow: "hidden",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  cardHeader: { position: "relative" },
  logo: { width: "100%", height: 110, resizeMode: "cover" },
  logoPlaceholder: {
    width: "100%",
    height: 110,
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
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
  companyName: { fontSize: 15, color: "#EF4444", fontWeight: "600", marginBottom: 8 },
  locationRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  locationText: { fontSize: 14, color: "#555", marginLeft: 6, flex: 1 },
  tagsContainer: { flexDirection: "row", gap: 8, marginBottom: 12, flexWrap: "wrap" },
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

  footerLoader: {
    paddingVertical: 20,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
  },
  footerText: { fontSize: 14, color: "#666" },

  emptyContainer: { alignItems: "center", marginTop: 80, paddingHorizontal: 40 },
  emptyText: { fontSize: 18, fontWeight: "600", color: "#666", marginTop: 16 },
  emptySub: { fontSize: 14, color: "#999", marginTop: 8, textAlign: "center" },

  // Filter Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  filterModalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.75,
    paddingBottom: 20,
  },
  filterModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  filterModalTitle: { fontSize: 20, fontWeight: "bold", color: "#111" },

  filterModalBody: { paddingHorizontal: 20 },
  filterSection: { marginBottom: 28 },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  filterOptions: { gap: 12 },
  filterOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#e2e8f0",
  },
  filterOptionActive: {
    backgroundColor: "#fef2f2",
    borderColor: "#EF4444",
  },
  filterRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#cbd5e1",
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  filterRadioActive: { borderColor: "#EF4444" },
  filterRadioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#EF4444",
  },
  filterOptionText: { fontSize: 15, color: "#475569", fontWeight: "500" },
  filterOptionTextActive: { color: "#111", fontWeight: "600" },

  filterModalFooter: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 12,
  },
  resetButton: {
    flex: 1,
    backgroundColor: "#f1f5f9",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  resetButtonText: { fontSize: 16, color: "#64748b", fontWeight: "600" },
  applyButton: {
    flex: 1,
    backgroundColor: "#EF4444",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  applyButtonText: { fontSize: 16, color: "#fff", fontWeight: "600" },

  // Job Details Modal
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.9,
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalTitle: { fontSize: 20, fontWeight: "bold", color: "#111" },

  modalCompanyHeader: {
    flexDirection: "row",
    padding: 20,
    paddingBottom: 10,
    alignItems: "center",
    gap: 16,
  },
  modalLogo: { width: 70, height: 70, borderRadius: 12 },
  modalLogoPlaceholder: {
    width: 70,
    height: 70,
    backgroundColor: "#EF4444",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  modalLogoText: { color: "#fff", fontSize: 28, fontWeight: "bold" },
  modalCompanyInfo: { flex: 1 },
  modalJobTitle: { fontSize: 20, fontWeight: "700", color: "#111" },
  modalCompanyName: { fontSize: 15, color: "#EF4444", marginTop: 4 },

  infoGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginVertical: 12,
  },
  infoItem: { alignItems: "center", flex: 1 },
  infoLabel: { fontSize: 13, color: "#666", marginTop: 6 },
  infoValue: { fontSize: 15, fontWeight: "600", color: "#111", marginTop: 4 },

  section: { paddingHorizontal: 20, marginVertical: 16 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionText: { fontSize: 15, color: "#444", lineHeight: 22 },
  descriptionText: { fontSize: 15, color: "#444", lineHeight: 24 },

  skillsContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  skillTag: {
    backgroundColor: "#e0e7ff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  skillText: { fontSize: 13, color: "#4f46e5", fontWeight: "600" },

  callButton: {
    flexDirection: "row",
    backgroundColor: "#EF4444",
    marginHorizontal: 20,
    marginTop: 20,
    paddingVertical: 16,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  callButtonText: { color: "#fff", fontSize: 17, fontWeight: "600" },
});