import React from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/color";

const formatDateTime = (date) => {
  if (!date) return "-";

  return new Date(date).toLocaleString("vi-VN", {
    hour12: false,
    timeZone: "Asia/Ho_Chi_Minh",
  });
};

const formatCurrency = (value) => {
  const amount = Number(value || 0);
  return `${amount.toLocaleString("vi-VN")} VND`;
};

const formatEnergy = (value) => {
  const energy = Number(value || 0);
  return `${energy.toLocaleString("vi-VN", { maximumFractionDigits: 3 })} kWh`;
};

const MyBikeComponent = ({
  bike,
  myBikeModalVisible,
  handleCloseMyBikeModal,
  onUpdateRegistration,
}) => {
  const isCharging = Boolean(bike?.isCharging);

  return (
    <Modal
      visible={!!myBikeModalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleCloseMyBikeModal}
    >
      <TouchableWithoutFeedback onPress={handleCloseMyBikeModal}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={styles.card}>
              <View style={styles.modalHeaderRow}>
                <View style={styles.modalHeaderLeft}>
                  <View style={styles.modalHeaderIconWrap}>
                    <Ionicons name="car-sport" size={18} color="#FFFFFF" />
                  </View>
                  <View>
                    <Text style={styles.modalTitle}>Xe của bạn</Text>
                    <Text style={styles.modalSubtitle}>
                      Thông tin xe đã đăng ký trên hệ thống
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={handleCloseMyBikeModal}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={20} color="#4B5563" />
                </TouchableOpacity>
              </View>

              <View style={styles.identityRow}>
                <View style={styles.identityMain}>
                  <Text style={styles.plate}>{bike?.licensePlate || "--"}</Text>
                  <Text style={styles.owner} numberOfLines={1}>
                    {bike?.bikeOwnerName || "Không có dữ liệu chủ xe"}
                  </Text>
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    isCharging
                      ? styles.statusBadgeActive
                      : styles.statusBadgeIdle,
                  ]}
                >
                  <Ionicons
                    name={isCharging ? "flash" : "flash-outline"}
                    size={14}
                    color={isCharging ? Colors.primary : "#6B7280"}
                  />
                  <Text
                    style={[
                      styles.statusBadgeText,
                      isCharging
                        ? styles.statusBadgeTextActive
                        : styles.statusBadgeTextIdle,
                    ]}
                  >
                    {isCharging ? "Đang sạc" : "Không sạc"}
                  </Text>
                </View>
              </View>

              <View style={styles.infoBox}>
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Loại xe</Text>
                  <Text style={styles.value}>{bike?.type || "--"}</Text>
                </View>

                <View style={[styles.infoRow, styles.infoRowLast]}>
                  <Text style={styles.label}>Ngày đăng ký</Text>
                  <Text style={styles.value}>
                    {formatDateTime(bike?.createdAt)}
                  </Text>
                </View>
              </View>

              <View style={styles.quickStatsRow}>
                <View style={styles.quickStatItem}>
                  <Text style={styles.quickStatValue}>
                    {bike?.chargingCount || 0}
                  </Text>
                  <Text style={styles.quickStatLabel}>Lần sạc</Text>
                </View>

                <View style={styles.quickStatItem}>
                  <Text style={styles.quickStatValue}>
                    {formatEnergy(bike?.energyConsumed)}
                  </Text>
                  <Text style={styles.quickStatLabel}>Điện năng</Text>
                </View>

                <View style={styles.quickStatItem}>
                  <Text style={styles.quickStatValue}>
                    {formatCurrency(bike?.amountSpent)}
                  </Text>
                  <Text style={styles.quickStatLabel}>Tổng chi</Text>
                </View>
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.updateButton]}
                  onPress={onUpdateRegistration}
                >
                  <Ionicons
                    name="document-text-outline"
                    size={16}
                    color="#FFFFFF"
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.updateButtonText}>Cập nhật giấy tờ</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.closeModalButton]}
                  onPress={handleCloseMyBikeModal}
                >
                  <Text style={styles.closeModalButtonText}>Đóng</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  card: {
    width: "100%",
    maxWidth: 440,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modalHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  modalHeaderIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },
  modalSubtitle: {
    marginTop: 1,
    fontSize: 12,
    color: "#6B7280",
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  identityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  identityMain: {
    flex: 1,
    paddingRight: 8,
  },
  plate: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
  },
  owner: {
    marginTop: 2,
    fontSize: 14,
    color: "#6B7280",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusBadgeActive: {
    backgroundColor: "#EAF9EF",
    borderColor: "#D0F0DC",
  },
  statusBadgeIdle: {
    backgroundColor: "#F3F4F6",
    borderColor: "#E5E7EB",
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  statusBadgeTextActive: {
    color: Colors.primary,
  },
  statusBadgeTextIdle: {
    color: "#6B7280",
  },
  infoBox: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#F9FAFB",
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    gap: 10,
  },
  infoRowLast: {
    marginBottom: 0,
  },
  label: {
    fontSize: 13,
    color: "#6B7280",
  },
  value: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1F2937",
    flexShrink: 1,
    textAlign: "right",
  },
  quickStatsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  quickStatItem: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  quickStatValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
  },
  quickStatLabel: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 4,
    textAlign: "center",
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  updateButton: {
    backgroundColor: Colors.primary,
  },
  updateButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  closeModalButton: {
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  closeModalButtonText: {
    color: "#4B5563",
    fontSize: 14,
    fontWeight: "700",
  },
});

export default MyBikeComponent;
