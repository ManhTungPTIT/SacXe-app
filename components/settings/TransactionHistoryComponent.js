import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/color";
import { SCROLL_FEEL } from "../../constants/scroll";

const TABS = [
  {
    key: "completed",
    label: "Hoàn thành",
    emptyTitle: "Chưa có giao dịch hoàn thành",
    emptySubtitle: "Các lần nạp thành công sẽ hiển thị tại đây.",
  },
  {
    key: "pending",
    label: "Chưa xử lý",
    emptyTitle: "Không có giao dịch nào đang chờ",
    emptySubtitle: "Giao dịch bạn chưa chuyển khoản xong sẽ nằm ở đây.",
  },
  {
    key: "cancelled",
    label: "Đã hủy",
    emptyTitle: "Chưa có giao dịch bị hủy",
    emptySubtitle: "Giao dịch quá hạn giữ sẽ chuyển vào đây.",
  },
];

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

// Tab nào chứa giao dịch này. Dữ liệu cũ còn status "failed" (đã bỏ khỏi hệ
// thống) là giao dịch chưa được cộng tiền và không còn cứu được, nên gom vào
// "Đã hủy" thay vì để nó biến mất khỏi lịch sử.
const getTabKey = (status) => {
  if (status === "completed") return "completed";
  if (status === "pending") return "pending";
  return "cancelled";
};

const getStatusMeta = (status) => {
  if (status === "completed") {
    return {
      label: "Hoàn thành",
      badgeStyle: styles.statusCompleted,
      textStyle: styles.statusCompletedText,
    };
  }

  if (status === "cancelled") {
    return {
      label: "Đã huỷ",
      badgeStyle: styles.statusCancelled,
      textStyle: styles.statusCancelledText,
    };
  }

  // Giao dịch chỉ còn ba trạng thái, nên mọi giá trị còn lại (kể cả "failed"
  // của dữ liệu cũ) đều là giao dịch chưa được cộng tiền.
  return {
    label: "Đang xử lý",
    badgeStyle: styles.statusPending,
    textStyle: styles.statusPendingText,
  };
};

const TransactionHistoryComponent = ({
  history,
  topUpModalTransactionHistoryVisible,
  handleCloseTransactionHistoryModal,
  handleOpenPendingTransaction,
}) => {
  const [activeTab, setActiveTab] = useState("completed");

  // Mở lại modal luôn bắt đầu ở "Hoàn thành", không giữ tab của lần trước.
  useEffect(() => {
    if (topUpModalTransactionHistoryVisible) {
      setActiveTab("completed");
    }
  }, [topUpModalTransactionHistoryVisible]);

  const groupedTransactions = useMemo(() => {
    const groups = { completed: [], pending: [], cancelled: [] };
    const source = Array.isArray(history) ? history : [];

    source.forEach((item) => {
      groups[getTabKey(item?.status)].push(item);
    });

    return groups;
  }, [history]);

  const activeTabMeta = TABS.find((tab) => tab.key === activeTab) || TABS[0];
  const transactions = groupedTransactions[activeTab] || [];
  const isPendingTab = activeTab === "pending";

  return (
    <Modal
      visible={topUpModalTransactionHistoryVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleCloseTransactionHistoryModal}
    >
      <View style={styles.overlay}>
        {/* Nền bấm-để-đóng là một lớp RIÊNG nằm sau thẻ nội dung. Cách cũ bọc
            cả thẻ trong TouchableWithoutFeedback, nên mỗi cú vuốt phải giành
            quyền responder với hai lớp touchable trước khi ScrollView nhận
            được — đó là cảm giác "vuốt nặng, khó cuộn". */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={handleCloseTransactionHistoryModal}
        />
        <View style={styles.modalCard}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Lịch sử tài khoản sạc</Text>
            <TouchableOpacity
              onPress={handleCloseTransactionHistoryModal}
              style={styles.closeButton}
              activeOpacity={0.85}
            >
              <Text style={styles.closeButtonText}>Đóng</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tabBar}>
            {TABS.map((tab) => {
              const isActive = tab.key === activeTab;

              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.tabButton, isActive && styles.tabButtonActive]}
                  onPress={() => setActiveTab(tab.key)}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.tabButtonText,
                      isActive && styles.tabButtonTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {transactions.length > 0 ? (
            <ScrollView
              style={styles.list}
              showsVerticalScrollIndicator={false}
              {...SCROLL_FEEL}
            >
              {transactions.map((item, index) => {
                const statusMeta = getStatusMeta(item?.status);
                // Chỉ giao dịch chưa xử lý mới bấm được: hoàn thành thì không
                // còn gì để làm, đã hủy thì không quay lại được nữa.
                const isPressable =
                  isPendingTab && typeof handleOpenPendingTransaction === "function";
                const CardWrapper = isPressable ? TouchableOpacity : View;

                return (
                  <CardWrapper
                    key={item?._id ?? `${item?.createdAt}-${index}`}
                    style={[
                      styles.transactionCard,
                      isPressable && styles.transactionCardPressable,
                    ]}
                    {...(isPressable
                      ? {
                        activeOpacity: 0.85,
                        onPress: () => handleOpenPendingTransaction(item),
                      }
                      : {})}
                  >
                    <View style={styles.transactionHeader}>
                      <Text style={styles.transactionTitle}>
                        Nạp tài khoản sạc #{index + 1}
                      </Text>
                      <View style={[styles.statusBadge, statusMeta.badgeStyle]}>
                        <Text style={[styles.statusText, statusMeta.textStyle]}>
                          {statusMeta.label}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.timeText}>
                      {formatDateTime(item?.createdAt)}
                    </Text>

                    <View style={styles.metricsRow}>
                      <View style={[styles.metricCard, styles.metricSpacing]}>
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

                    {isPressable ? (
                      <View style={styles.resumeRow}>
                        <Text style={styles.resumeText}>
                          Bấm để hoàn tất nạp tiền
                        </Text>
                        <Ionicons
                          name="chevron-forward"
                          size={16}
                          color={Colors.pendingTextDark}
                        />
                      </View>
                    ) : null}
                  </CardWrapper>
                );
              })}
            </ScrollView>
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>{activeTabMeta.emptyTitle}</Text>
              <Text style={styles.emptySubtitle}>
                {activeTabMeta.emptySubtitle}
              </Text>
            </View>
          )}
        </View>
      </View>
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
  tabBar: {
    flexDirection: "row",
    backgroundColor: Colors.neutralBg,
    borderRadius: 999,
    padding: 4,
    marginTop: 6,
    marginBottom: 12,
  },
  tabButton: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: "center",
  },
  tabButtonActive: {
    backgroundColor: Colors.white,
    shadowColor: Colors.shadowGreen,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  tabButtonTextActive: {
    color: Colors.primary,
    fontWeight: "700",
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
  transactionCardPressable: {
    backgroundColor: Colors.pendingBg,
    borderColor: Colors.pendingBorder,
  },
  resumeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 10,
  },
  resumeText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.pendingTextDark,
    marginRight: 2,
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
    backgroundColor: Colors.pendingBg,
  },
  statusPendingText: {
    color: Colors.pendingTextDark,
  },
  statusCancelled: {
    backgroundColor: Colors.bgGrayLight,
  },
  statusCancelledText: {
    color: Colors.textSecondary,
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
