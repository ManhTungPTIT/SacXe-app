import React, { useContext, useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Colors } from "../../constants/color";
import { SocketContext } from "../../providers/SocketProvider";
import { useQueryClient } from "@tanstack/react-query";

const formatEnergy = (value) => {
  const energy = Number(value) || 0;
  return Number.isInteger(energy) ? energy : energy.toFixed(3);
};

const formatPrice = (value) => {
  const price = Number(value) || 0;
  return price.toLocaleString("vi-VN");
};

const PRICE_PER_KWH = 3000;
const PRICE_UPDATE_STEP_KWH = 0.2;

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

const LatestHistory = ({ history }) => {
  const chargingStartTime = history?.startTime || history?.createdAt;
  const startTimeText = formatStartTime(chargingStartTime);
  const hasDuration = Boolean(history?.totalTime);
  const socketContext = useContext(SocketContext);
  const socket = socketContext?.socket;
  const queryClient = useQueryClient();
  const [realtimeEnergy, setRealtimeEnergy] = useState(history?.energy || 0);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const lastInvalidatedEnergyStepRef = useRef(getEnergyStep(history?.energy));

  useEffect(() => {
    setRealtimeEnergy(history?.energy || 0);
    lastInvalidatedEnergyStepRef.current = getEnergyStep(history?.energy);
  }, [history?._id, history?.energy]);

  useEffect(() => {
    if (!socket || !history || hasDuration) return;

    const handleWave = (value) => {
      if (value?.energy !== undefined) {
        setRealtimeEnergy(value.energy / 1000);
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

  // Refresh API cost every 0.2 kWh step while charging.
  const lastFetchedEnergy = history?.energy || 0;
  const displayPrice = hasDuration
    ? history?.price
    : Math.max(Number(history?.price) || 0, calculatePrice(realtimeEnergy));
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

  return (
    <View style={styles.wrapper}>
      <Text style={styles.sectionTitle}>Phiên sạc đang sử dụng</Text>

      {history && !hasDuration ? (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Phiên sạc gần đây</Text>
            <View style={[styles.statusBadge, styles.statusActive]}>
              <Text style={[styles.statusText, styles.statusActiveText]}>
                Đang sạc
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
      ) : (
        <View style={[styles.card, styles.emptyCard]}>
          <Text style={styles.emptyTitle}>
            Hiện tại bạn đang không sử dụng sạc
          </Text>
        </View>
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
