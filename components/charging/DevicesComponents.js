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
import {
  cancelPendingChargeNotification,
  setChargeDeviceCheckInProgress,
} from "../../services/notification.service";
import { Colors } from "../../constants/color";
import { useAuthStore } from "../../stores/auth.store";
import ChargingDeviceCheck from "./ChargingDeviceCheck";

const DevicesComponents = ({
  navigation,
  devices,
  setdeviceCode,
  deviceCode,
  setPowerId,
  deviceId,
  deviceAddress,
  deviceIsHouse,
  setDevices,
  onChargeStarted,
}) => {
  const initiateChargeMutation = useChargeQuery.useInitiate();
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [selectedPowerOutlet, setSelectedPowerOutlet] = useState(null);
  const user = useAuthStore((state) => state.user);
  const userId = user?._id;
  // Hỏng (isBroken): admin đánh dấu/gỡ, hiển thị "Ổ đang bảo trì", không bấm
  // được. isUnavailable (mất điện tạm/mất tín hiệu) không còn hiển thị riêng
  // — gộp vào trạng thái "Có thể sử dụng" bình thường, không chặn bấm.
  const isDeviceBroken = (device) => device?.isBroken === true;
  const isDeviceNoPower = (device) => {
    const normalizedStatus = String(
      device?.powerStatus || device?.electricStatus || device?.status || "",
    )
      .trim()
      .toLowerCase();

    return (
      device?.hasPower === false ||
      device?.isPowerOn === false ||
      device?.isPowered === false ||
      device?.powerAvailable === false ||
      device?.electricityAvailable === false ||
      [
        "no_power",
        "power_off",
        "power-outage",
        "power_outage",
        "mat_dien",
        "mất điện",
      ].includes(normalizedStatus)
    );
  };
  const totalOutlets = devices.length;
  // Ổ sạc được bật khi xác nhận sạc và tắt khi dừng sạc (backend gửi lệnh MQTT
  // trong initiate/terminate) — không còn công tắc nguồn thủ công.
  const noPowerOutlets = devices.filter(isDeviceNoPower).length;
  const isStationNoPower = totalOutlets > 0 && noPowerOutlets === totalOutlets;
  const availableOutlets = devices.filter(
    (device) =>
      !device?.isUsing &&
      !isDeviceBroken(device) &&
      !isDeviceNoPower(device),
  ).length;
  const deviceLabel = deviceCode ? `Trụ ${deviceCode}` : "Trụ sạc đã quét";
  const deviceAddressText = String(deviceAddress || "").trim();
  const isHouseDevice = deviceIsHouse === true || deviceIsHouse === "true";
  const stationTitle = isHouseDevice
    ? "Nh\u00e0 c\u1ee7a b\u1ea1n"
    : deviceAddressText
      ? `C\u00f4ng c\u1ed9ng - ${deviceAddressText}`
      : "C\u00f4ng c\u1ed9ng";
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
    setChargeDeviceCheckInProgress(true);
    initiateChargeMutation.mutate(
      { deviceId, powerId },
      {
        onError: (error) => {
          cancelPendingChargeNotification();
          const errorMessage =
            error.response?.data?.message ||
            "Đã xảy ra lỗi khi bắt đầu phiên sạc.";

          if (
            errorMessage ===
            "Bạn cần có số dư tài khoản sạc tối thiểu là 2.000 VNĐ để sử dụng dịch vụ!"
          ) {
            Alert.alert(
              "Thông báo",
              errorMessage,
              [
                {
                  text: "Hủy",
                  style: "cancel",
                },
                {
                  text: "Nạp tài khoản sạc",
                  onPress: () => {
                    navigation?.navigate("Settings", { openTopUp: true });
                  },
                },
              ],
              { cancelable: true },
            );
          } else {
            Alert.alert("Thông báo", errorMessage);
          }
        },
        onSuccess: (data) => {
          socket.emit(
            "telemetry_data",
            `user_${userId}_${data?.deviceCode}_${data?.powerIndex}`,
          );
          onChargeStarted?.(data);
        },
        onSettled: resetConfirmModal,
      },
    );
  };

  const handleOpenConfirmModal = (device) => {
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

  // Hiển thị màn tìm thiết bị ngay khi request initiate bắt đầu. Giữ component
  // này mounted để các callback onSuccess/onError của mutation vẫn được chạy.
  if (isStarting) {
    return (
      <ChargingDeviceCheck
        deviceCode={deviceCode}
        powerIndex={selectedPowerOutlet?.index}
      />
    );
  }

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
          <Text style={styles.title}>{stationTitle}</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {isStationNoPower
              ? `${deviceLabel} - Thiết bị đang không có điện`
              : `${deviceLabel} - ${availableOutlets}/${totalOutlets} ô sạc có thể sử dụng`}
          </Text>
        </View>
      </View>

      {noPowerOutlets > 0 && (
        <View
          style={[
            styles.powerNotice,
            isStationNoPower
              ? styles.powerNoticeCritical
              : styles.powerNoticeWarning,
          ]}
        >
          <View style={styles.powerNoticeIconWrap}>
            <Ionicons
              name="flash-off-outline"
              size={22}
              color={Colors.warningOrange}
            />
          </View>
          <View style={styles.powerNoticeTextBlock}>
            <Text style={styles.powerNoticeTitle}>
              {isStationNoPower
                ? "Thiết bị đang không có điện"
                : "Một số ô sạc không có điện"}
            </Text>
            <Text style={styles.powerNoticeMessage}>
              {isStationNoPower
                ? "Hiện chưa thể bắt đầu phiên sạc tại trụ này. Vui lòng kiểm tra nguồn điện hoặc chọn trụ sạc khác."
                : `${noPowerOutlets}/${totalOutlets} ô sạc đang mất điện và tạm thời không thể sử dụng.`}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.legendDotAvailable]} />
          <Text style={styles.legendText}>Có thể sử dụng</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.legendDotBusy]} />
          <Text style={styles.legendText}>Đang dùng</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.legendDotBroken]} />
          <Text style={styles.legendText}>Đang bảo trì</Text>
        </View>
      </View>
      <View style={styles.listContainer}>
        {devices.map((device, index) => {
          const isBroken = isDeviceBroken(device);
          const isNoPower = !isBroken && isDeviceNoPower(device);
          const isAvailable = !isBroken && !isNoPower && !device?.isUsing;
          // Ổ bảo trì vẫn bấm được để báo lý do (trước đây disabled hoàn
          // toàn nên bấm vào không có phản hồi gì) — chỉ ổ khả dụng mới mở
          // modal xác nhận sạc.
          const isPressable = isAvailable || isBroken;

          const cardStyle = isBroken
            ? styles.deviceCardBroken
            : isNoPower
              ? styles.deviceCardNoPower
              : isAvailable
                ? styles.deviceCardAvailable
                : styles.deviceCardDisabled;
          const nameStyle = isBroken
            ? styles.textBroken
            : isNoPower
              ? styles.textNoPower
              : isAvailable
                ? styles.textAvailable
                : styles.textDisabled;
          const iconWrapStyle = isBroken
            ? styles.outletIconWrapBroken
            : isNoPower
              ? styles.outletIconWrapNoPower
              : isAvailable
                ? styles.outletIconWrapAvailable
                : styles.outletIconWrapDisabled;
          const statusStyle = isBroken
            ? styles.textBrokenSub
            : isNoPower
              ? styles.textNoPowerSub
              : isAvailable
                ? styles.textAvailableSub
                : styles.textDisabled;

          let iconName = "lock-closed-outline";
          let iconColor = Colors.inactive;
          if (isBroken) {
            iconName = "construct-outline";
            iconColor = "#9CA3AF";
          } else if (isNoPower) {
            iconName = "flash-off-outline";
            iconColor = Colors.warningOrange;
          } else if (isAvailable) {
            iconName = "flash-outline";
            iconColor = Colors.primary;
          }

          let statusLabel = "Đang có xe sạc";
          if (isBroken) {
            statusLabel = "Ổ đang bảo trì";
          } else if (isNoPower) {
            statusLabel = "Thiết bị đang không có điện";
          } else if (isAvailable) {
            statusLabel = "Sẵn sàng để sử dụng";
          }

          return (
            <TouchableOpacity
              onPress={() => {
                if (isBroken) {
                  Alert.alert(
                    "Thông báo",
                    "Ổ đang bảo trì, vui lòng chọn ổ sạc khác",
                  );
                  return;
                }
                handleOpenConfirmModal(device);
              }}
              key={device._id}
              disabled={!isPressable}
              activeOpacity={isPressable ? 0.78 : 1}
              accessibilityRole="button"
              accessibilityLabel={
                isBroken
                  ? `Ổ cắm thứ ${index + 1} đang bảo trì`
                  : isNoPower
                    ? `Ổ cắm thứ ${index + 1} đang không có điện`
                    : `Ổ cắm thứ ${index + 1}`
              }
              accessibilityState={{ disabled: !isPressable }}
              style={[styles.deviceCard, cardStyle]}
            >
              <View style={styles.deviceCardTopRow}>
                <Text style={[styles.deviceName, nameStyle]}>
                  Ô sạc {index + 1}
                </Text>
                <View style={[styles.outletIconWrap, iconWrapStyle]}>
                  <Ionicons name={iconName} size={17} color={iconColor} />
                </View>
              </View>
              <Text style={[styles.deviceStatus, statusStyle]}>
                {statusLabel}
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
  stationInfoCard: {
    backgroundColor: Colors.bgGreenTint,
    borderWidth: 1,
    borderColor: Colors.borderGreenLight,
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    gap: 14,
  },
  stationInfoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  stationInfoIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.successBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  stationInfoTextBlock: {
    flex: 1,
  },
  stationInfoLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textSecondary,
    marginBottom: 3,
  },
  stationInfoValue: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.textPrimaryDark,
    lineHeight: 20,
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
    flexWrap: "wrap",
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
  legendDotBroken: {
    backgroundColor: "#374151",
  },
  legendDotNoPower: {
    backgroundColor: Colors.warningOrange,
  },
  legendText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  powerNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    gap: 12,
  },
  powerNoticeCritical: {
    backgroundColor: "#FFF7ED",
    borderColor: "#FDBA74",
  },
  powerNoticeWarning: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
  },
  powerNoticeIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  powerNoticeTextBlock: {
    flex: 1,
  },
  powerNoticeTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.textPrimaryDark,
    marginBottom: 4,
  },
  powerNoticeMessage: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textSecondaryDark,
    lineHeight: 19,
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
  deviceCardBroken: {
    backgroundColor: "#374151",
    borderColor: "#1F2937",
    elevation: 0,
    shadowOpacity: 0,
    transform: [{ translateY: 0 }],
  },
  deviceCardNoPower: {
    backgroundColor: "#FFF7ED",
    borderColor: "#FDBA74",
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
  outletIconWrapBroken: {
    backgroundColor: "#1F2937",
  },
  outletIconWrapNoPower: {
    backgroundColor: Colors.white,
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
  textBroken: {
    color: "#E5E7EB",
  },
  textBrokenSub: {
    color: "#9CA3AF",
  },
  textNoPower: {
    color: Colors.textPrimaryDark,
  },
  textNoPowerSub: {
    color: Colors.textSecondaryDark,
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

