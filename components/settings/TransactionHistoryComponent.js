import React from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { Colors } from "../../constants/color";

const formatAmount = (value) => {
  const amount = Number(value) || 0;
  return `${amount.toLocaleString("vi-VN")} VND`;
};

const formatDateTime = (value) => {
  if (!value) {
    return "--";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return date.toLocaleString("vi-VN");
};

const getStatusMeta = (status) => {
  if (status === "pending") {
    return {
      label: "Đang xử lý",
      badgeStyle: styles.statusPending,
      textStyle: styles.statusPendingText,
    };
  }

  if (status === "completed") {
    return {
      label: "Hoàn thành",
      badgeStyle: styles.statusCompleted,
      textStyle: styles.statusCompletedText,
    };
  }

  return {
    label: "Thất bại",
    badgeStyle: styles.statusFailed,
    textStyle: styles.statusFailedText,
  };
};

const TransactionHistoryComponent = ({
  history,
  topUpModalTransactionHistoryVisible,
  handleCloseTransactionHistoryModal,
}) => {
  const transactions = Array.isArray(history) ? history : [];

  return (
    <Modal
      visible={topUpModalTransactionHistoryVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleCloseTransactionHistoryModal}
    >
      <TouchableWithoutFeedback onPress={handleCloseTransactionHistoryModal}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={styles.modalCard}>
              <View style={styles.headerRow}>
                <Text style={styles.title}>Lịch sử giao dịch</Text>
                <TouchableOpacity
                  onPress={handleCloseTransactionHistoryModal}
                  style={styles.closeButton}
                  activeOpacity={0.85}
                >
                  <Text style={styles.closeButtonText}>Đóng</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.subtitle}>Các lần nạp gần đây của bạn</Text>

              {transactions.length > 0 ? (
                <ScrollView
                  style={styles.list}
                  showsVerticalScrollIndicator={false}
                >
                  {transactions.map((item, index) => {
                    const statusMeta = getStatusMeta(item?.status);

                    return (
                      <View
                        key={item?._id ?? `${item?.createdAt}-${index}`}
                        style={styles.transactionCard}
                      >
                        <View style={styles.transactionHeader}>
                          <Text style={styles.transactionTitle}>
                            Giao dịch #{index + 1}
                          </Text>
                          <View
                            style={[styles.statusBadge, statusMeta.badgeStyle]}
                          >
                            <Text
                              style={[styles.statusText, statusMeta.textStyle]}
                            >
                              {statusMeta.label}
                            </Text>
                          </View>
                        </View>

                        <Text style={styles.timeText}>
                          {formatDateTime(item?.createdAt)}
                        </Text>

                        <View style={styles.metricsRow}>
                          <View
                            style={[styles.metricCard, styles.metricSpacing]}
                          >
                            <Text style={styles.metricLabel}>Số tiền</Text>
                            <Text style={styles.metricValue}>
                              {formatAmount(item?.amount)}
                            </Text>
                          </View>

                          <View style={styles.metricCard}>
                            <Text style={styles.metricLabel}>Nội dung</Text>
                            <Text style={styles.metricValue} numberOfLines={1}>
                              {item?.content?.trim() || "--"}
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>
              ) : (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyTitle}>Chưa có giao dịch nào</Text>
                  <Text style={styles.emptySubtitle}>
                    Các giao dịch nạp tiền sẽ hiển thị tại đây.
                  </Text>
                </View>
              )}
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
    backgroundColor: Colors.greenTranslucent45,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  modalCard: {
    width: "100%",
    maxWidth: 440,
    maxHeight: "78%",
    backgroundColor: Colors.white,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorderGreen,
    shadowColor: Colors.shadowGreen,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 6,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  title: {
    fontSize: 19,
    fontWeight: "700",
    color: Colors.primary,
  },
  closeButton: {
    backgroundColor: Colors.successBgLight,
    borderWidth: 1,
    borderColor: Colors.successBorder,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  closeButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.primary,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  list: {
    maxHeight: 420,
  },
  transactionCard: {
    backgroundColor: Colors.cardBgGreen,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorderGreen,
    padding: 14,
    marginBottom: 12,
  },
  transactionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  transactionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  statusCompleted: {
    backgroundColor: Colors.successBg,
  },
  statusCompletedText: {
    color: Colors.primary,
  },
  statusPending: {
    backgroundColor: "#FFF2DD",
  },
  statusPendingText: {
    color: "#B97100",
  },
  statusFailed: {
    backgroundColor: Colors.errorBgLight,
  },
  statusFailedText: {
    color: Colors.errorText,
  },
  timeText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 10,
  },
  metricsRow: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  metricCard: {
    flex: 1,
    backgroundColor: Colors.secondary,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: Colors.borderGreenLight,
  },
  metricSpacing: {
    marginRight: 10,
  },
  metricLabel: {
    fontSize: 12,
    color: Colors.neutralText,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: "700",
  },
  emptyCard: {
    backgroundColor: Colors.cardBgLight,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 20,
    paddingHorizontal: 14,
  },
  emptyTitle: {
    fontSize: 15,
    color: Colors.textPrimary,
    fontWeight: "700",
    textAlign: "center",
  },
  emptySubtitle: {
    marginTop: 6,
    fontSize: 13,
    color: Colors.neutralText,
    lineHeight: 18,
    textAlign: "center",
  },
});

export default TransactionHistoryComponent;
