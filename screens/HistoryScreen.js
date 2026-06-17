import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useHistory } from "../queries/history.query";
import {
  calculateChargingDurationFormatted,
  vietnamDate,
  vietnamTime,
} from "../utils/time";
import { Colors } from "../constants/color";
import { SafeAreaView } from "react-native-safe-area-context";

const formatCurrency = (value) => {
  const price = Number(value) || 0;
  return `${price.toLocaleString("vi-VN")} VND`;
};

const formatEnergy = (value) => {
  const energy = Number(value) || 0;
  return `${energy.toLocaleString("vi-VN", {
    maximumFractionDigits: 3,
  })} kWh`;
};

const HistoryScreen = () => {
  const {
    data: historyData,
    isLoading,
    error,
  } = useHistory.useGetHistory({ page: 1, limit: 10 });

  const monthlyStats = historyData?.monthlyStats;
  const histories = historyData?.histories ?? [];

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.headerSection}>
            <Text style={styles.title}>Lịch sử</Text>
          </View>
          <View style={styles.contentWrap}>
            <View style={styles.monthlyCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Thống kê tháng này</Text>
                <View style={[styles.statusBadge, styles.statusDone]}>
                  <Text style={[styles.statusText, styles.statusDoneText]}>
                    Cập nhật
                  </Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Tổng số lần sạc</Text>
                <Text style={styles.infoValue}>
                  {monthlyStats?.count ?? 0}
                </Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Tổng chi phí</Text>
                <Text style={styles.infoValue}>
                  {formatCurrency(monthlyStats?.totalAmount)}
                </Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Điện năng tiêu thụ</Text>
                <Text style={styles.infoValue}>
                  {formatEnergy(monthlyStats?.totalEnergy)}
                </Text>
              </View>
            </View>

            {isLoading ? (
              <View style={[styles.monthlyCard, styles.emptyCard]}>
                <Text style={styles.emptyTitle}>Đang tải lịch sử sạc...</Text>
              </View>
            ) : error ? (
              <View style={[styles.monthlyCard, styles.emptyCard]}>
                <Text style={styles.emptyTitle}>Không thể tải lịch sử</Text>
                <Text style={styles.emptySubtitle}>
                  Vui lòng thử lại sau vài giây.
                </Text>
              </View>
            ) : histories.length > 0 ? (
              histories.map((item, index) => (
                <View
                  key={item?._id ?? `${item?.createdAt}-${index}`}
                  style={styles.sessionCard}
                >
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>
                      Phiên sạc #{index + 1}
                    </Text>
                    <View style={[styles.statusBadge, styles.statusDone]}>
                      <Text
                        style={[styles.statusText, styles.statusDoneText]}
                      >
                        Hoàn tất
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.startTime}>
                    Bắt đầu: {vietnamDate(item?.createdAt)} -
                    {` ${vietnamTime(item?.createdAt)}`}
                  </Text>

                  <View style={styles.metricsRow}>
                    <View
                      style={[styles.metricCard, styles.metricCardSpacing]}
                    >
                      <Text style={styles.metricLabel}>
                        Điện năng tiêu thụ
                      </Text>
                      <Text style={styles.metricValue}>
                        {formatEnergy(item?.energy)}
                      </Text>
                    </View>

                    <View style={styles.metricCard}>
                      <Text style={styles.metricLabel}>Chi phí</Text>
                      <Text style={styles.metricValue}>
                        {formatCurrency(item?.price)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Tổng thời gian sạc</Text>
                    <Text style={styles.infoValue}>
                      {calculateChargingDurationFormatted(
                        item?.createdAt,
                        item?.updatedAt,
                      )}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={[styles.monthlyCard, styles.emptyCard]}>
                <Text style={styles.emptyTitle}>Chưa có lịch sử nào</Text>
                <Text style={styles.emptySubtitle}>
                  Sau khi hoàn tất phiên sạc, thông tin sẽ hiển thị tại đây.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    backgroundColor: Colors.secondary,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 0,
    backgroundColor: Colors.secondary,
  },
  container: {
    flex: 1,
    minHeight: "100%",
    backgroundColor: Colors.secondary,
  },
  headerSection: {
    backgroundColor: Colors.primary,
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 16,
    marginHorizontal: -16,
  },
  contentWrap: {
    marginTop: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.secondary,
  },
  monthlyCard: {
    backgroundColor: "#F5FBF6",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D8EFDC",
    padding: 16,
    shadowColor: "#0E4120",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 14,
  },
  sessionCard: {
    backgroundColor: "#F5FBF6",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D8EFDC",
    padding: 16,
    shadowColor: "#0E4120",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 14,
  },
  emptyCard: {
    backgroundColor: "#FAFAFA",
    borderColor: Colors.border,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1D1D1F",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusDone: {
    backgroundColor: "#E6F6EA",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  statusDoneText: {
    color: Colors.primary,
  },
  startTime: {
    fontSize: 13,
    color: "#5F6368",
    marginBottom: 12,
  },
  metricsRow: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  metricCard: {
    flex: 1,
    backgroundColor: Colors.secondary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#E4F2E7",
  },
  metricCardSpacing: {
    marginRight: 10,
  },
  metricLabel: {
    fontSize: 12,
    color: "#6A6F73",
    marginBottom: 6,
  },
  metricValue: {
    fontSize: 16,
    color: "#1D1D1F",
    fontWeight: "700",
  },
  divider: {
    height: 1,
    backgroundColor: "#E3EEE5",
    marginVertical: 14,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  infoLabel: {
    fontSize: 14,
    color: "#434A50",
  },
  infoValue: {
    fontSize: 14,
    color: "#1D1D1F",
    fontWeight: "700",
  },
  emptyTitle: {
    fontSize: 15,
    color: "#1D1D1F",
    fontWeight: "700",
  },
  emptySubtitle: {
    marginTop: 6,
    fontSize: 13,
    color: "#6A6F73",
    lineHeight: 18,
  },
});

export default HistoryScreen;
