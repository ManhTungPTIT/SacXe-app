import React, { useEffect, useRef } from "react";
import { ActivityIndicator, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { Colors } from "../../constants/color";
import { useChargingTelemetry } from "../../hooks/useChargingTelemetry";
import WaveChart from "../WaveChart";
import ChargingCostCard from "./ChargingCostCard";
import SessionInfoCard from "./SessionInfoCard";
import TechnicalMetricsCard from "./TechnicalMetricsCard";

// Khi năng lượng realtime tăng thêm mức này thì làm mới giá/số dư từ backend.
const ENERGY_REFRESH_STEP_KWH = 0.02;

const ChargingStatusComponent = ({
  chargingStartTime,
  initialEnergyKwh,
  latestHistory,
  bike,
  balance,
  onStopCharging,
  isStopping,
  initialTelemetry,
}) => {
  // Một nguồn telemetry duy nhất cho cả biểu đồ và thẻ chi phí/kỹ thuật.
  const telemetry = useChargingTelemetry(initialEnergyKwh, initialTelemetry);

  // Giá tiền là do backend tính (theo khung giờ). Khi năng lượng tăng đủ một
  // bước, làm mới latestHistory (giá) và ME (số dư ví) để hiển thị khớp backend.
  // Nhà dân (isHouse): điện miễn phí — ẩn phần chi phí, không cần làm mới số dư.
  const isHouse = Boolean(latestHistory?.deviceId?.isHouse);

  const queryClient = useQueryClient();
  const lastRefreshEnergyRef = useRef(telemetry.energyKwh || 0);
  useEffect(() => {
    const energy = telemetry.energyKwh || 0;
    if (energy - lastRefreshEnergyRef.current >= ENERGY_REFRESH_STEP_KWH) {
      lastRefreshEnergyRef.current = energy;
      queryClient.invalidateQueries({ queryKey: ["latestHistory"] });
      if (!isHouse) {
        queryClient.invalidateQueries({ queryKey: ["ME"] });
      }
    }
  }, [telemetry.energyKwh, queryClient, isHouse]);

  return (
    <View style={styles.container}>
      <WaveChart chargingStartTime={chargingStartTime} telemetry={telemetry} />

      {isHouse ? (
        <View style={styles.freeCard}>
          <MaterialCommunityIcons
            name="home-lightning-bolt-outline"
            size={20}
            color={Colors.primary}
          />
          <View style={styles.freeTextWrap}>
            <Text style={styles.freeTitle}>Sạc tại nhà dân</Text>
            <Text style={styles.freeDescription}>
              Đang sạc tại thiết bị của bạn
            </Text>
          </View>
        </View>
      ) : (
        <ChargingCostCard
          currentPower={telemetry.currentPower}
          averagePower={telemetry.averagePower}
          latestHistory={latestHistory}
          balance={balance}
        />
      )}

      <SessionInfoCard
        chargingStartTime={chargingStartTime}
        latestHistory={latestHistory}
        bike={bike}
      />

      <TechnicalMetricsCard
        peakPower={telemetry.peakPower}
        minPower={telemetry.minPower}
        averagePower={telemetry.averagePower}
        isLive={telemetry.isRelayOn}
      />

      {/* Thông báo AI NOC */}
      <View style={styles.aiNocContainer}>
        <View style={styles.aiNocHeader}>
          <MaterialCommunityIcons name="shield-check" size={16} color={Colors.primary} />
          <Text style={styles.aiNocLabel}>AI NOC</Text>
        </View>
        <Text style={styles.aiNocDescription}>
          Giám sát 24/7 đảm bảo an toàn cho xe.
        </Text>
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
  freeCard: {
    width: "100%",
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.cardBgGreen,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorderGreen,
    padding: 16,
  },
  freeTextWrap: {
    flex: 1,
  },
  freeTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  freeDescription: {
    fontSize: 13,
    color: Colors.textDarkGreen,
    marginTop: 4,
    lineHeight: 18,
  },
  aiNocContainer: {
    width: "100%",
    marginTop: 16,
    backgroundColor: Colors.cardBgLight,
    borderRadius: 16,
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
  aiNocLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 1.2,
    fontWeight: "700",
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
