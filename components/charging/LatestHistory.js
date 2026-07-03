import React, { useContext, useEffect, useRef, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Colors } from "../../constants/color";
import { Ionicons } from "@expo/vector-icons";
import { SocketContext } from "../../providers/SocketProvider";
import { useQueryClient } from "@tanstack/react-query";
import BatteryCharging from "./BatteryCharging";

const formatEnergy = (value) => {
  const energy = Number(value) || 0;
  return Number.isInteger(energy) ? energy : energy.toFixed(3);
};

const formatPrice = (value) => {
  const price = Number(value) || 0;
  return price.toLocaleString("vi-VN");
};

const PRICE_PER_KWH = 3000;
const PRICE_UPDATE_STEP_KWH = 0.001;

const getEnergyStep = (value) => {
  const energy = Number(value) || 0;
  return Math.floor((energy + Number.EPSILON) / PRICE_UPDATE_STEP_KWH);
};

const calculatePrice = (energy) => {
  const steppedEnergy = getEnergyStep(energy) * PRICE_UPDATE_STEP_KWH;
  return Math.round(steppedEnergy * PRICE_PER_KWH);
};

const getElapsedDuration = (startTime, currentTime) => {
  if (!startTime) {
    return null;
  }

  const start = new Date(startTime).getTime();
  if (Number.isNaN(start)) {
    return null;
  }

  const diff = Math.max(0, currentTime - start);
  const totalSeconds = Math.floor(diff / 1000);

  return {
    hours: Math.floor(totalSeconds / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
};

const formatDuration = (totalTime) => {
  if (!totalTime) {
    return "0 giây";
  }

  const hours = Number(totalTime?.hours) || 0;
  const minutes = Number(totalTime?.minutes) || 0;
  const seconds = Number(totalTime?.seconds) || 0;

  if (!hours && !minutes && !seconds) {
    return "0 giây";
  }

  if (!hours && !minutes) {
    return `${seconds} giây`;
  }

  if (!hours) {
    return `${minutes} phút ${seconds} giây`;
  }

  return `${hours} giờ ${minutes} phút ${seconds} giây`;
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

const LatestHistory = ({ history, navigation }) => {
  const chargingStartTime = history?.startTime || history?.createdAt;
  const startTimeText = formatStartTime(chargingStartTime);
  const hasDuration = Boolean(history?.totalTime);
  const socketContext = useContext(SocketContext);
  const socket = socketContext?.socket;
  const queryClient = useQueryClient();
  const baseEnergy = hasDuration
    ? Number(history?.energy) || 0
    : Number(history?.lastKnownEnergy ?? history?.energy ?? 0) || 0;
  const basePrice = hasDuration
    ? Number(history?.price) || 0
    : Math.max(
        Number(history?.lastKnownPrice) || 0,
        Number(history?.billedAmount) || 0,
        Number(history?.price) || 0,
      );

  const handleEmptyPress = () => {
    if (navigation) {
      navigation.navigate("Charge");
    }
  };

  const [realtimeEnergy, setRealtimeEnergy] = useState(baseEnergy);
  const [isLive, setIsLive] = useState(baseEnergy > 0);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const lastInvalidatedEnergyStepRef = useRef(getEnergyStep(baseEnergy));

  useEffect(() => {
    setRealtimeEnergy(baseEnergy);
    lastInvalidatedEnergyStepRef.current = getEnergyStep(baseEnergy);
    setIsLive(baseEnergy > 0);
  }, [history?._id, baseEnergy]);

  useEffect(() => {
    if (!socket || !history || hasDuration) return;

    const handleWave = (value) => {
      if (value?.energy !== undefined) {
        setRealtimeEnergy(value.energy / 1000);
        setIsLive(true);
      }
    };

    socket.on("wave_data", handleWave);

    return () => {
      socket.off("wave_data", handleWave);
    };
  }, [socket, history, hasDuration]);

  useEffect(() => {
    if (!history || hasDuration || !chargingStartTime) return;

    setCurrentTime(Date.now());
    const intervalId = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(intervalId);
  }, [history?._id, hasDuration, chargingStartTime]);

  // Refresh active-session data when the displayed energy step advances.
  const lastFetchedEnergy = baseEnergy;
  const displayPrice = hasDuration
    ? history?.price
    : Math.max(basePrice, calculatePrice(realtimeEnergy));
  const displayDuration = hasDuration
    ? history?.totalTime
    : getElapsedDuration(chargingStartTime, currentTime);

  useEffect(() => {
    if (hasDuration) return;

    const realtimeEnergyStep = getEnergyStep(realtimeEnergy);
    const lastFetchedEnergyStep = getEnergyStep(lastFetchedEnergy);
    const lastInvalidatedEnergyStep = Math.max(
      lastInvalidatedEnergyStepRef.current,
      lastFetchedEnergyStep,
    );

    if (realtimeEnergyStep > lastInvalidatedEnergyStep) {
      lastInvalidatedEnergyStepRef.current = realtimeEnergyStep;
      queryClient.invalidateQueries({ queryKey: ["latestHistory"] });
    }
  }, [realtimeEnergy, lastFetchedEnergy, hasDuration, queryClient]);

  const status = hasDuration ? "completed" : (isLive ? "charging" : "waiting");
  const isChargingState = status === "charging";

  return (
    <View style={styles.wrapper}>
      {history && !hasDuration ? (
        <TouchableOpacity
          onPress={() => navigation.navigate("Charge")}
          activeOpacity={0.9}
        >
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Phiên sạc đang sử dụng</Text>
            <Ionicons name="arrow-forward" size={18} color={Colors.primary} />
          </View>
          <View style={styles.card}>
            <View style={styles.timeAndStatusRow}>
              <Text style={styles.startTime}>
                {startTimeText ? `Bắt đầu: ${startTimeText}` : ""}
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  isChargingState ? styles.statusActive : styles.statusDone,
                  { flexDirection: "row", alignItems: "center" },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    isChargingState ? styles.statusActiveText : styles.statusDoneText,
                  ]}
                >
                  {status === "completed"
                    ? "Hoàn tất"
                    : status === "charging"
                      ? "Đang sạc"
                      : "Đang chờ sạc"}
                </Text>
                <BatteryCharging status={status} />
              </View>
            </View>

            <View style={styles.metricsRow}>
              <View style={[styles.metricCard, styles.metricCardSpacing]}>
                <Text style={styles.metricLabel}>Điện năng tiêu thụ</Text>
                <Text style={styles.metricValue}>
                  {formatEnergy(realtimeEnergy)} kWh
                </Text>
              </View>

              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Chi phí</Text>
                <Text style={styles.metricValue}>
                  {formatPrice(displayPrice)} VND
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tổng thời gian sạc</Text>
              <Text style={styles.infoValue}>
                {formatDuration(displayDuration)}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={styles.emptyPressableRow}
          onPress={handleEmptyPress}
          activeOpacity={0.7}
        >
          <Text style={styles.emptyTitleHighlighted}>
            Hiện tại bạn đang không sử dụng sạc
          </Text>
          <Ionicons name="arrow-forward" size={20} color={Colors.warning} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginTop: "auto",
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    color: Colors.primary,
    fontWeight: "700",
    fontSize: 18,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  card: {
    backgroundColor: Colors.cardBgGreen,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorderGreen,
    padding: 16,
    shadowColor: Colors.shadowGreen,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  emptyCard: {
    backgroundColor: Colors.cardBgLight,
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
    color: Colors.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusDone: {
    backgroundColor: Colors.neutralBg,
  },
  statusActive: {
    backgroundColor: Colors.successBg,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  statusDoneText: {
    color: Colors.neutralText,
  },
  statusActiveText: {
    color: Colors.primary,
  },
  startTime: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  timeAndStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
    borderColor: Colors.borderGreenLight,
  },
  metricCardSpacing: {
    marginRight: 10,
  },
  metricLabel: {
    fontSize: 12,
    color: Colors.neutralText,
    marginBottom: 6,
  },
  metricValue: {
    fontSize: 17,
    color: Colors.textPrimary,
    fontWeight: "700",
  },
  divider: {
    height: 1,
    backgroundColor: Colors.dividerGreen,
    marginVertical: 14,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  infoLabel: {
    fontSize: 14,
    color: Colors.textDarkSecondary,
  },
  infoValue: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: "700",
  },
  emptyTitle: {
    fontSize: 15,
    color: Colors.textPrimary,
    fontWeight: "700",
  },
  emptyTitleHighlighted: {
    fontSize: 15,
    color: Colors.warning,
    fontWeight: "700",
  },
  emptyPressableRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  emptySubtitle: {
    marginTop: 6,
    fontSize: 13,
    color: Colors.neutralText,
    lineHeight: 18,
  },
});

export default LatestHistory;
