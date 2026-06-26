import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useChargeQuery } from "../../queries/charge.query";
import { socket } from "../../services/socket.service";
import { Colors } from "../../constants/color";
import { useAuthStore } from "../../stores/auth.store";

const DevicesComponents = ({
  devices,
  setdeviceCode,
  deviceCode,
  setPowerId,
  deviceId,
  setDevices,
  onChargeStarted,
}) => {
  const initiateChargeMutation = useChargeQuery.useInitiate();
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [selectedPowerOutlet, setSelectedPowerOutlet] = useState(null);
  const user = useAuthStore((state) => state.user);
  const triggerNotificationPermission = useAuthStore(
    (state) => state.triggerNotificationPermission,
  );
  const userId = user?._id;
  const totalOutlets = devices.length;
  const availableOutlets = devices.filter((device) => !device?.isUsing).length;
  const deviceLabel = deviceCode ? `Trụ ${deviceCode}` : "Trụ sạc đã quét";
  const selectedOutletIndex = selectedPowerOutlet
    ? devices.findIndex((device) => device?._id === selectedPowerOutlet?._id) + 1
    : null;
  const isStarting =
    initiateChargeMutation.isLoading || initiateChargeMutation.isPending;

  const resetConfirmModal = () => {
    setConfirmModalVisible(false);
    setSelectedPowerOutlet(null);
  };

  const handleInitiateCharge = (powerId) => {
    setPowerId(powerId);
    initiateChargeMutation.mutate(
      { deviceId, powerId },
      {
        onError: (error) => {
          Alert.alert(
            "Thông báo",
            error.response?.data?.message ||
            "Đã xảy ra lỗi khi bắt đầu phiên sạc.",
          );
        },
        onSuccess: (data) => {
          socket.emit(
            "telemetry_data",
            `user_${userId}_${data?.deviceCode}_${data?.powerIndex}`,
          );
          setDevices(null);
          onChargeStarted?.();
        },
        onSettled: resetConfirmModal,
      },
    );
  };

  const handleOpenConfirmModal = (device) => {
    triggerNotificationPermission();
    setSelectedPowerOutlet(device);
    setConfirmModalVisible(true);
  };

  const handleCloseConfirmModal = () => {
    if (isStarting) return;
    resetConfirmModal();
  };

  const handleConfirmInitiateCharge = () => {
    if (isStarting) return;

    if (!selectedPowerOutlet?._id) {
      handleCloseConfirmModal();
      return;
    }

    handleInitiateCharge(selectedPowerOutlet._id);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setdeviceCode(null)}
          activeOpacity={0.8}
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.textDark} />
        </TouchableOpacity>
        <View style={styles.headerTextBlock}>
          <Text style={styles.title}>Chọn ô sạc xe</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {deviceLabel} - {availableOutlets}/{totalOutlets} ô sạc có thể sử dụng
          </Text>
        </View>
      </View>

      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.legendDotAvailable]} />
          <Text style={styles.legendText}>Có thể sử dụng</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.legendDotBusy]} />
          <Text style={styles.legendText}>Đang dùng</Text>
        </View>
      </View>
      <View style={styles.listContainer}>
        {devices.map((device, index) => {
          const isAvailable = !device?.isUsing;

          return (
            <TouchableOpacity
              onPress={() => handleOpenConfirmModal(device)}
              key={device._id}
              disabled={!isAvailable}
              activeOpacity={isAvailable ? 0.78 : 1}
              accessibilityRole="button"
              accessibilityLabel={`Ổ cắm thứ ${index + 1}`}
              accessibilityState={{ disabled: !isAvailable }}
              style={[
                styles.deviceCard,
                isAvailable
                  ? styles.deviceCardAvailable
                  : styles.deviceCardDisabled,
              ]}
            >
              <View style={styles.deviceCardTopRow}>
                <Text
                  style={[
                    styles.deviceName,
                    isAvailable
                      ? styles.textAvailable
                      : styles.textDisabled,
                  ]}
                >
                  Ô sạc {index + 1}
                </Text>
                <View
                  style={[
                    styles.outletIconWrap,
                    isAvailable
                      ? styles.outletIconWrapAvailable
                      : styles.outletIconWrapDisabled,
                  ]}
                >
                  <Ionicons
                    name={isAvailable ? "flash-outline" : "lock-closed-outline"}
                    size={17}
                    color={isAvailable ? Colors.primary : Colors.inactive}
                  />
                </View>
              </View>
              <Text
                style={[
                  styles.deviceStatus,
                  isAvailable
                    ? styles.textAvailableSub
                    : styles.textDisabled,
                ]}
              >
                {isAvailable ? "Sẵn sàng để sử dụng" : "Đang có xe sạc"}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Modal
        visible={confirmModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseConfirmModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconWrap}>
              <Ionicons name="flash" size={22} color={Colors.primary} />
            </View>
            <Text style={styles.modalTitle}>Xác nhận bắt đầu sạc</Text>
            <Text style={styles.modalMessage}>
              Bạn muốn bắt đầu sạc tại ô sạc số {selectedOutletIndex || "--"}?
            </Text>

            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={[
                  styles.cancelButton,
                  isStarting && styles.cancelButtonDisabled,
                ]}
                onPress={handleCloseConfirmModal}
                disabled={isStarting}
              >
                <Text
                  style={[
                    styles.cancelButtonText,
                    isStarting && styles.cancelButtonTextDisabled,
                  ]}
                >
                  Hủy
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  isStarting && styles.confirmButtonDisabled,
                ]}
                onPress={handleConfirmInitiateCharge}
                disabled={isStarting}
              >
                <View style={styles.confirmButtonContent}>
                  {isStarting && (
                    <ActivityIndicator size="small" color={Colors.white} />
                  )}
                  <Text style={styles.confirmButtonText}>Xác nhận</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginTop: 24,
    marginBottom: 32,
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#F5F7F6",
    borderWidth: 1,
    borderColor: Colors.borderGreenLight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  headerTextBlock: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: Colors.textDark,
    lineHeight: 29,
  },
  subtitle: {
    marginTop: 3,
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.bgGreenTint,
    borderWidth: 1,
    borderColor: "#DDF3E5",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  summaryIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Colors.successBgLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  summaryTextBlock: {
    flex: 1,
    paddingRight: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 3,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.textPrimaryDark,
  },
  summaryBadge: {
    borderRadius: 999,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.successBorder,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  summaryBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.primary,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 12,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendDotAvailable: {
    backgroundColor: Colors.primary,
  },
  legendDotBusy: {
    backgroundColor: "#B8BEC5",
  },
  legendText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  listContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  deviceCard: {
    flexGrow: 1,
    flexBasis: "48%",
    minWidth: 136,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  deviceCardAvailable: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    shadowColor: Colors.shadowGreen,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 5,
    transform: [{ translateY: -3 }],
  },
  deviceCardDisabled: {
    backgroundColor: "#F1F3F5",
    borderColor: Colors.borderMuted,
    elevation: 0,
    shadowOpacity: 0,
    transform: [{ translateY: 0 }],
  },
  deviceCardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
    gap: 8,
  },
  outletIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  outletIconWrapAvailable: {
    backgroundColor: Colors.white,
  },
  outletIconWrapDisabled: {
    backgroundColor: "#E4E7EC",
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusBadgeAvailable: {
    backgroundColor: Colors.whiteTranslucent20,
  },
  statusBadgeDisabled: {
    backgroundColor: "#E8EAED",
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  statusBadgeTextAvailable: {
    color: Colors.white,
  },
  statusBadgeTextDisabled: {
    color: Colors.textPlaceholder,
  },
  deviceName: {
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 26,
  },
  deviceStatus: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 17,
  },
  textAvailable: {
    color: Colors.white,
  },
  textAvailableSub: {
    color: Colors.whiteTranslucent85,
  },
  textDisabled: {
    color: Colors.inactive,
  },
  cardActionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#EEF6F0",
    paddingTop: 12,
    marginTop: 14,
  },
  cardActionText: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlayBgLight,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  modalContent: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 24,
  },
  modalIconWrap: {
    alignSelf: "center",
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: Colors.successBgLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.textDark,
    marginBottom: 8,
    textAlign: "center",
  },
  modalMessage: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  modalActionRow: {
    flexDirection: "row",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: Colors.cardBgLight,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelButtonDisabled: {
    backgroundColor: Colors.bgLightMuted,
    borderColor: Colors.borderMuted,
  },
  cancelButtonText: {
    color: Colors.textSecondary,
    fontWeight: "700",
    fontSize: 15,
  },
  cancelButtonTextDisabled: {
    color: Colors.inactive,
  },
  confirmButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  confirmButtonDisabled: {
    backgroundColor: Colors.accentGreen,
  },
  confirmButtonContent: {
    minHeight: 19,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  confirmButtonText: {
    color: Colors.white,
    fontWeight: "700",
    fontSize: 15,
  },
});

export default DevicesComponents;

