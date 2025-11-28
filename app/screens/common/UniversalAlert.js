// UniversalAlert.js - Reusable Alert Component
import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { CheckCircle, XCircle, AlertCircle, Wallet, Info } from 'lucide-react-native';

const { width } = Dimensions.get('window');

// Universal Alert Component
export const UniversalAlert = ({ 
  visible, 
  onClose, 
  type = 'error', // 'error', 'success', 'warning', 'info'
  title, 
  message, 
  details = null,
  primaryButton = 'OK',
  secondaryButton = null,
  onPrimaryPress,
  onSecondaryPress
}) => {
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle size={70} color="#10B981" strokeWidth={2.5} />;
      case 'error':
        return <XCircle size={70} color="#EF4444" strokeWidth={2.5} />;
      case 'warning':
        return <AlertCircle size={70} color="#F59E0B" strokeWidth={2.5} />;
      case 'info':
        return <Info size={70} color="#3B82F6" strokeWidth={2.5} />;
      default:
        return <AlertCircle size={70} color="#6B7280" strokeWidth={2.5} />;
    }
  };

  const getColors = () => {
    switch (type) {
      case 'success':
        return { bg: '#F0FDF4', border: '#10B981', text: '#065F46' };
      case 'error':
        return { bg: '#FEF2F2', border: '#EF4444', text: '#991B1B' };
      case 'warning':
        return { bg: '#FFFBEB', border: '#F59E0B', text: '#92400E' };
      case 'info':
        return { bg: '#EFF6FF', border: '#3B82F6', text: '#1E40AF' };
      default:
        return { bg: '#F9FAFB', border: '#6B7280', text: '#374151' };
    }
  };

  const colors = getColors();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.alertContainer, { borderColor: colors.border }]}>
          <View style={styles.iconContainer}>{getIcon()}</View>
          <Text style={styles.alertTitle}>{title}</Text>
          <Text style={styles.alertMessage}>{message}</Text>

          {details && (
            <View style={[styles.detailsBox, { backgroundColor: colors.bg }]}>
              {Object.entries(details).map(([key, value]) => (
                <View key={key} style={styles.detailRow}>
                  <Text style={styles.detailKey}>{key}:</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {value}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.buttonContainer}>
            {secondaryButton && (
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={onSecondaryPress || onClose}
              >
                <Text style={styles.secondaryButtonText}>{secondaryButton}</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={[
                styles.button,
                styles.primaryButton,
                { backgroundColor: colors.border },
                !secondaryButton && { flex: 1 }
              ]}
              onPress={onPrimaryPress || onClose}
            >
              <Text style={styles.primaryButtonText}>{primaryButton}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Payment Confirmation Modal
export const PaymentConfirmationModal = ({
  visible,
  onClose,
  onConfirm,
  rideAmount,
  lockAmount,
  availableBalance,
  loading = false
}) => {
  const remainingBalance = availableBalance - lockAmount;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.paymentContainer}>
          <View style={styles.paymentHeader}>
            <Wallet size={50} color="#DC2626" strokeWidth={2} />
            <Text style={styles.paymentTitle}>Confirm Ride Acceptance</Text>
          </View>

          <View style={styles.breakdownBox}>
            <Text style={styles.breakdownTitle}>Payment Breakdown</Text>
            
            <View style={styles.amountRow}>
              <Text style={styles.amountLabel}>Total Ride Amount</Text>
              <Text style={styles.amountValue}>₹{rideAmount?.toLocaleString()}</Text>
            </View>

            <View style={[styles.amountRow, styles.highlightRow]}>
              <Text style={styles.amountLabel}>Amount to be Locked (20%)</Text>
              <Text style={[styles.amountValue, styles.lockText]}>
                ₹{lockAmount?.toLocaleString()}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.amountRow}>
              <Text style={styles.balanceLabel}>Current Balance</Text>
              <Text style={styles.balanceValue}>₹{availableBalance?.toLocaleString()}</Text>
            </View>

            <View style={styles.amountRow}>
              <Text style={styles.balanceLabel}>Balance After Lock</Text>
              <Text style={[styles.balanceValue, remainingBalance < 100 && styles.lowBalance]}>
                ₹{remainingBalance?.toLocaleString()}
              </Text>
            </View>
          </View>

          <View style={styles.infoBox}>
            <Info size={18} color="#3B82F6" />
            <Text style={styles.infoText}>
              The locked amount will be automatically released once you complete the trip.
            </Text>
          </View>

          {remainingBalance < 100 && (
            <View style={styles.warningBox}>
              <AlertCircle size={18} color="#F59E0B" />
              <Text style={styles.warningText}>
                Your balance is running low. Consider adding money after this trip.
              </Text>
            </View>
          )}

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.confirmButton, loading && styles.disabledButton]}
              onPress={onConfirm}
              disabled={loading}
            >
              <Text style={styles.confirmButtonText}>
                {loading ? 'Processing...' : 'Accept Ride'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  
  // Universal Alert Styles
  alertContainer: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 28,
    width: width - 60,
    maxWidth: 400,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  alertTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 12,
  },
  alertMessage: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  detailsBox: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 6,
  },
  detailKey: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#DC2626',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  secondaryButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },

  // Payment Modal Styles
  paymentContainer: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    width: width - 40,
    maxWidth: 450,
  },
  paymentHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  paymentTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 12,
  },
  breakdownBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 16,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  highlightRow: {
    backgroundColor: '#FEF2F2',
    marginHorizontal: -12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  amountLabel: {
    fontSize: 15,
    color: '#6B7280',
  },
  amountValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#111827',
  },
  lockText: {
    color: '#DC2626',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  balanceValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
  },
  lowBalance: {
    color: '#F59E0B',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 18,
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#FFFBEB',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 10,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: '#DC2626',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.6,
  },
});