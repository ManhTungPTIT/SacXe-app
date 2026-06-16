import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Colors } from "../../constants/color";

const formatEnergy = (value) => {
  const energy = Number(value) || 0;
  return Number.isInteger(energy) ? energy : energy.toFixed(3);
};

const formatPrice = (value) => {
  const price = Number(value) || 0;
  return price.toLocaleString("vi-VN");
};

const formatDuration = (totalTime) => {
  if (!totalTime) {
    return "Đang trong quá trình sạc...";
  }

  const hours = Number(totalTime?.hours) || 0;
  const minutes = Number(totalTime?.minutes) || 0;

  if (!hours && !minutes) {
    return "0 phút";
  }

  if (!hours) {
    return `${minutes} phút`;
  }

  if (!minutes) {
    return `${hours} giờ`;
  }

  return `${hours} giờ ${minutes} phút`;
};

const formatStartTime = (startTime) => {
  if (!startTime) {
    return null;
  }

  const date = new Date(startTime);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleString("vi-VN");
};

const LatestHistory = ({ history }) => {
  const startTimeText = formatStartTime(history?.startTime);
  const hasDuration = Boolean(history?.totalTime);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.sectionTitle}>Lần sạc gần nhất</Text>

      {history ? (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Phiên sạc gần đây</Text>
            <View
              style={[
                styles.statusBadge,
                hasDuration ? styles.statusDone : styles.statusActive,
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  hasDuration ? styles.statusDoneText : styles.statusActiveText,
                ]}
              >
                {hasDuration ? "Hoàn tất" : "Đang sạc"}
              </Text>
            </View>
          </View>

          {startTimeText ? (
            <Text style={styles.startTime}>Bắt đầu: {startTimeText}</Text>
          ) : null}

          <View style={styles.metricsRow}>
            <View style={[styles.metricCard, styles.metricCardSpacing]}>
              <Text style={styles.metricLabel}>Điện năng tiêu thụ</Text>
              <Text style={styles.metricValue}>
                {formatEnergy(history?.energy)} kWh
              </Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Chi phí</Text>
              <Text style={styles.metricValue}>
                {formatPrice(history?.price)} VND
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Tổng thời gian sạc</Text>
            <Text style={styles.infoValue}>
              {formatDuration(history?.totalTime)}
            </Text>
          </View>
        </View>
      ) : (
        <View style={[styles.card, styles.emptyCard]}>
          <Text style={styles.emptyTitle}>Chưa có lịch sử sạc gần nhất</Text>
          <Text style={styles.emptySubtitle}>
            Sau khi hoàn tất phiên sạc, thông tin sẽ hiển thị tại đây.
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: 24,
  },
  sectionTitle: {
    color: Colors.primary,
    fontWeight: "700",
    fontSize: 18,
    marginBottom: 12,
  },
  card: {
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
  statusActive: {
    backgroundColor: "#FFF2DD",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  statusDoneText: {
    color: Colors.primary,
  },
  statusActiveText: {
    color: "#B97100",
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
    fontSize: 17,
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

export default LatestHistory;
