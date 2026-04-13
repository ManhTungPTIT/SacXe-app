import React, { useState } from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
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
  const userId = user?._id;

  const handleInitiateCharge = (powerId) => {
    setPowerId(powerId);
    initiateChargeMutation.mutate(
      { deviceId, powerId },
      {
        onError: (error) => {
          alert(
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
      },
    );
  };

  const handleOpenConfirmModal = (device) => {
    setSelectedPowerOutlet(device);
    setConfirmModalVisible(true);
  };

  const handleCloseConfirmModal = () => {
    setConfirmModalVisible(false);
    setSelectedPowerOutlet(null);
  };

  const handleConfirmInitiateCharge = () => {
    if (!selectedPowerOutlet?._id) {
      handleCloseConfirmModal();
      return;
    }

    handleInitiateCharge(selectedPowerOutlet._id);
    handleCloseConfirmModal();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Chọn ổ cắm để bắt đầu sạc</Text>
      {devices.map((device, index) => (
        <TouchableOpacity
          onPress={() => handleOpenConfirmModal(device)}
          key={device._id}
          disabled={device.isUsing}
          style={[
            styles.deviceCard,
            !device?.isUsing
              ? styles.deviceCardAvailable
              : styles.deviceCardDisabled,
          ]}
        >
          <Text
            style={[
              styles.devicePrimaryText,
              !device?.isUsing
                ? styles.deviceTextAvailable
                : styles.deviceTextDisabled,
            ]}
          >
            Ổ cắm thứ {index + 1}
          </Text>
          <Text
            style={[
              styles.deviceSecondaryText,
              !device?.isUsing
                ? styles.deviceTextAvailable
                : styles.deviceTextDisabled,
            ]}
          >
            {device.isUsing ? "" : "Sử dụng"}
          </Text>
          <Text
            style={[
              styles.deviceStatusText,
              !device?.isUsing
                ? styles.deviceTextAvailable
                : styles.deviceTextDisabled,
            ]}
          >
            {device.isUsing ? "Đang được sử dụng" : "Trống"}
          </Text>
        </TouchableOpacity>
      ))}

      <Modal
        visible={confirmModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseConfirmModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Xác nhận bắt đầu sạc</Text>
            <Text style={styles.modalMessage}>
              Bạn có chắc chắn muốn bắt đầu sạc không?
            </Text>

            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCloseConfirmModal}
              >
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleConfirmInitiateCharge}
                disabled={initiateChargeMutation.isPending}
              >
                <Text style={styles.confirmButtonText}>Xác nhận</Text>
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
    marginVertical: 24,
    gap: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  deviceCard: {
    padding: 16,
    borderRadius: 16,
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  deviceCardAvailable: {
    backgroundColor: Colors.primary,
  },
  deviceCardDisabled: {
    backgroundColor: Colors.disable,
  },
  devicePrimaryText: {
    fontWeight: "bold",
  },
  deviceSecondaryText: {
    marginTop: 4,
    fontWeight: "600",
  },
  deviceStatusText: {
    marginTop: 4,
  },
  deviceTextAvailable: {
    color: "#fff",
  },
  deviceTextDisabled: {
    color: "#333",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  modalContent: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#222",
    marginBottom: 8,
    textAlign: "center",
  },
  modalMessage: {
    fontSize: 15,
    color: "#555",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 16,
  },
  modalActionRow: {
    flexDirection: "row",
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#e7e7e7",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#333",
    fontWeight: "600",
  },
  confirmButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  confirmButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
});

export default DevicesComponents;
