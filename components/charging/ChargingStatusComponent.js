import React from "react";
import { ActivityIndicator, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors } from "../../constants/color";
import { vietnamDate, vietnamTime } from "../../utils/time";
import WaveChart from "../WaveChart";

const ChargingStatusComponent = ({ chargingStartTime, onStopCharging, isStopping }) => {
  return (
    <View style={styles.container}>
      <WaveChart chargingStartTime={chargingStartTime} />
      {/* Bento Grid Info */}
      <View style={styles.bentoGrid}>
        {/* Thông tin thời gian */}
        <View style={styles.timeInfoContainer}>
          <Text style={styles.bentoLabel}>Thời gian bắt đầu</Text>
          <Text style={styles.timeValue}>{vietnamTime(chargingStartTime)}</Text>
          <Text style={styles.timeDate}>{vietnamDate(chargingStartTime)}</Text>
        </View>

        {/* Thông báo AI NOC */}
        <View style={styles.aiNocContainer}>
          <View style={styles.aiNocHeader}>
            <MaterialCommunityIcons name="shield-check" size={16} color={Colors.primary} />
            <Text style={[styles.bentoLabel, { marginBottom: 0 }]}>AI NOC</Text>
          </View>
          <Text style={styles.aiNocDescription}>
            Giám sát 24/7 đảm bảo an toàn cho xe.
          </Text>
        </View>
      </View>

      {/* Nút dừng sạc */}
      <TouchableOpacity
        style={[styles.stopButton, isStopping && styles.stopButtonDisabled]}
        onPress={onStopCharging}
        activeOpacity={0.8}
        disabled={isStopping}
      >
        <View style={styles.stopButtonContent}>
          {isStopping && (
            <ActivityIndicator size="small" color={Colors.white} />
          )}
          <Text style={[styles.stopButtonText, isStopping && styles.stopButtonTextDisabled]}>
            Dừng sạc xe
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: 24,
    width: "100%",
  },
  bentoGrid: {
    flexDirection: "row",
    gap: 16,
    marginTop: 32,
    width: "100%",
  },
  bentoLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 1.2,
    fontWeight: "700",
    marginBottom: 8,
  },
  timeInfoContainer: {
    flex: 1,
    backgroundColor: Colors.cardBgLight,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  timeValue: {
    fontSize: 24,
    fontWeight: "800",
    color: Colors.primary,
    lineHeight: 28,
  },
  timeDate: {
    fontSize: 13,
    color: Colors.textDark,
    fontWeight: "600",
    marginTop: 4,
  },
  aiNocContainer: {
    flex: 1.2,
    backgroundColor: Colors.cardBgLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
  },
  aiNocHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  aiNocDescription: {
    fontSize: 13,
    color: Colors.textDark,
    lineHeight: 18,
  },
  stopButton: {
    marginTop: 32,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    width: "100%",
    alignItems: "center",
  },
  stopButtonDisabled: {
    backgroundColor: Colors.accentGreen,
  },
  stopButtonContent: {
    minHeight: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  stopButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "700",
  },
  stopButtonTextDisabled: {
    color: Colors.whiteTranslucent80,
  },
});

export default ChargingStatusComponent;
