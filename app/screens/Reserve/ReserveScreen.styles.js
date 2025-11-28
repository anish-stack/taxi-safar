import { StyleSheet, Dimensions, Platform } from 'react-native';

const { width } = Dimensions.get("window");

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  
  // Header Styles
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    letterSpacing: -0.5,
  },

  // Search Section
  searchSection: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#1F2937",
    fontWeight: "500",
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  filterButtonActive: {
    backgroundColor: "#DC2626",
    borderColor: "#DC2626",
  },
  filterBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FFFFFF",
  },

  // Tabs
  tabScrollView: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  tabContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  activeTab: {
    backgroundColor: "#1F2937",
    borderColor: "#1F2937",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  activeTabText: {
    color: "#FFFFFF",
  },

  // Content
  contentContainer: {
    paddingBottom: 20,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  loaderText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "500",
  },
  footerLoader: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
    gap: 8,
  },
  footerLoaderText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },

  // Trip Cards
  tripCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },

  // Status and Badges
  statusContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  paidBadge: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  paidText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#059669",
  },
  zeroCommissionBadge: {
    backgroundColor: "#DC2626",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  zeroCommissionText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Trip Header
  tripHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  vehicleInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  vehicleIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  vehicleDetails: {
    flex: 1,
  },
  vehicleName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 2,
  },
  tripType: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
    textTransform: "capitalize",
  },
  priceSection: {
    alignItems: "flex-end",
  },
  price: {
    fontSize: 20,
    fontWeight: "800",
    color: "#DC2626",
    letterSpacing: -0.5,
  },

  // Driver Section
  driverSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F9FAFB",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  driverInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  driverAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 2,
  },
  driverContact: {
    fontSize: 12,
    color: "#6B7280",
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
  },

  // Commission Section
  commissionSection: {
    backgroundColor: "#F9FAFB",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  commissionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  commissionLabel: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },
  commissionValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1F2937",
  },
  earningRow: {
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 8,
    marginTop: 4,
  },
  earningLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#DC2626",
  },
  earningValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#DC2626",
  },

  // Earnings Grid (for Driver Posts)
  earningsGrid: {
    flexDirection: "row",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  earningGridItem: {
    flex: 1,
    alignItems: "center",
  },
  earningAmount: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1F2937",
    marginBottom: 4,
  },
  zeroCommissionAmount: {
    color: "#059669",
  },
  driverEarningAmount: {
    fontSize: 16,
    fontWeight: "800",
    color: "#DC2626",
    marginBottom: 4,
  },
  earningLabel: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "600",
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Trip Info Section
  tripInfoSection: {
    marginBottom: 16,
  },
  tripTypeBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#1F2937",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 12,
  },
  tripTypeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Date Time Section
  dateTimeSection: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 16,
  },
  dateTimeItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dateTimeText: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },

  // Location Section
  locationSection: {
    gap: 12,
    marginBottom: 16,
  },
  locationItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  pickupIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  dropIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  locationTextContainer: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "600",
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  locationText: {
    fontSize: 14,
    color: "#1F2937",
    fontWeight: "500",
    lineHeight: 18,
  },
  locationDivider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 4,
  },

  // Notes Section
  notesSection: {
    backgroundColor: "#FEF3C7",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: "#D97706",
  },
  notesText: {
    fontSize: 13,
    color: "#92400E",
    fontStyle: "italic",
    lineHeight: 18,
  },

  // Action Buttons
  actionButton: {
    backgroundColor: "#1F2937",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  acceptButton: {
    backgroundColor: "#DC2626",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  acceptButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  // Empty State
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "transparent",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  filterSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 12,
  },
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  chipSelected: {
    backgroundColor: "#DC2626",
    borderColor: "#DC2626",
  },
  chipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  chipTextSelected: {
    color: "#FFFFFF",
  },
  priceRangeContainer: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  priceRangeText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },
  modalFooter: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 12,
  },
  clearButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#6B7280",
  },
  applyButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#DC2626",
    alignItems: "center",
  },
  applyButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});