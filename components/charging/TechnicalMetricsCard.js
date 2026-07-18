import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors } from "../../constants/color";

const formatPower = (value) => {
  const power = Number(value) || 0;
  if (Math.abs(power) >= 1000) {
    return `${(power / 1000).toFixed(power >= 10000 ? 1 : 2)} kW`;
  }
  return `${Math.round(power)} W`;
};

const TechnicalMetricsCard = ({
  peakPower = 0,
  minPower = 0,
  averagePower = 0,
  isLive = false,
}) => {
  // Khi chưa có tín hiệu (chưa sạc) thì các chỉ số công suất chưa có ý nghĩa.
  const display = (value) => (isLive ? formatPower(value) : "—");

  const metrics = [
    { label: "Công suất đỉnh", value: display(peakPower) },
    { label: "Thấp nhất", value: display(minPower) },
    { label: "Trung bình", value: display(averagePower) },
  ];

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <MaterialCommunityIcons
          name="flash-outline"
          size={18}
          color={Colors.primary}
        />
        <Text style={styles.title}>Chỉ số kỹ thuật</Text>
      </View>

      <View style={styles.metricsRow}>
        {metrics.map((metric) => (
          <View key={metric.label} style={styles.metricItem}>
            <Text style={styles.metricValue}>{metric.value}</Text>
            <Text style={styles.metricLabel}>{metric.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: "100%",
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.cardBgLight,
    padding: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  title: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.textPrimary,
    letterSpacing: 0.3,
  },
  metricsRow: {
    flexDirection: "row",
    gap: 10,
  },
  metricItem: {
    flex: 1,
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderGreenLight,
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.neutralText,
    marginTop: 6,
    textAlign: "center",
  },
});

export default TechnicalMetricsCard;
