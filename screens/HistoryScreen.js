import React, { useContext, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { useHistory } from "../queries/history.query";
import {
  calculateChargingDurationFormatted,
  vietnamDate,
  vietnamTime,
} from "../utils/time";
import { Colors } from "../constants/color";
import { SafeAreaView } from "react-native-safe-area-context";
import { SocketContext } from "../providers/SocketProvider";
import BatteryCharging from "../components/charging/BatteryCharging";

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

const isChargingHistory = (history) => !history?.totalTime;

const getHistoryStartTime = (history) =>
  history?.startTime || history?.createdAt;

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

const formatElapsedDuration = (duration) => {
  if (!duration) {
    return "0 giây";
  }

  const hours = Number(duration?.hours) || 0;
  const minutes = Number(duration?.minutes) || 0;
  const seconds = Number(duration?.seconds) || 0;

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

const HistoryScreen = () => {
  const queryClient = useQueryClient();
  const socketContext = useContext(SocketContext);
  const socket = socketContext?.socket;
  const {
    data: historyData,
    isLoading,
    error,
  } = useHistory.useGetHistory({ page: 1, limit: 10 });

  const monthlyStats = historyData?.monthlyStats;
  const histories = historyData?.histories ?? [];
  const activeHistory = histories.find(isChargingHistory);
  const activeHistoryId = activeHistory?._id;
  const activeHistoryStartTime = getHistoryStartTime(activeHistory);
  const activeHistoryEnergy = activeHistory?.energy || 0;
  const activeHistoryPrice = activeHistory?.price || 0;
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [realtimeEnergy, setRealtimeEnergy] = useState(activeHistoryEnergy);
  const [isLive, setIsLive] = useState((activeHistoryEnergy || 0) > 0);
  const lastInvalidatedEnergyStepRef = useRef(
    getEnergyStep(activeHistoryEnergy),
  );

  useEffect(() => {
    setRealtimeEnergy(activeHistoryEnergy);
    lastInvalidatedEnergyStepRef.current = getEnergyStep(activeHistoryEnergy);
    setIsLive((activeHistoryEnergy || 0) > 0);
  }, [activeHistoryId, activeHistoryEnergy]);

  useEffect(() => {
    if (!activeHistoryId || !activeHistoryStartTime) return;

    setCurrentTime(Date.now());
    const intervalId = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(intervalId);
  }, [activeHistoryId, activeHistoryStartTime]);

  useEffect(() => {
    if (!socket || !activeHistoryId) return;

    const handleWave = (value) => {
      const nextEnergy = Number(value?.energy);

      if (Number.isFinite(nextEnergy)) {
        setRealtimeEnergy(nextEnergy / 1000);
        setIsLive(true);
      }
    };

    socket.on("wave_data", handleWave);

    return () => {
      socket.off("wave_data", handleWave);
    };
  }, [socket, activeHistoryId]);

  useEffect(() => {
    if (!activeHistoryId) return;

    const realtimeEnergyStep = getEnergyStep(realtimeEnergy);
    const lastFetchedEnergyStep = getEnergyStep(activeHistoryEnergy);
    const lastInvalidatedEnergyStep = Math.max(
      lastInvalidatedEnergyStepRef.current,
      lastFetchedEnergyStep,
    );

    if (realtimeEnergyStep > lastInvalidatedEnergyStep) {
      lastInvalidatedEnergyStepRef.current = realtimeEnergyStep;
      queryClient.invalidateQueries({ queryKey: ["history"] });
      queryClient.invalidateQueries({ queryKey: ["latestHistory"] });
    }
  }, [activeHistoryId, realtimeEnergy, activeHistoryEnergy, queryClient]);

  const getDisplayEnergy = (history) => {
    if (!isChargingHistory(history)) {
      return history?.energy;
    }

    return Math.max(Number(history?.energy) || 0, realtimeEnergy);
  };

  const getDisplayPrice = (history) => {
    if (!isChargingHistory(history)) {
      return history?.price;
    }

    return Math.max(
      Number(history?.price) || 0,
      calculatePrice(getDisplayEnergy(history)),
    );
  };

  const activeDisplayEnergy = activeHistory ? getDisplayEnergy(activeHistory) : 0;
  const activeDisplayPrice = activeHistory ? getDisplayPrice(activeHistory) : 0;
  const displayMonthlyEnergy = activeHistory
    ? (Number(monthlyStats?.totalEnergy) || 0) -
      (Number(activeHistoryEnergy) || 0) +
      activeDisplayEnergy
    : monthlyStats?.totalEnergy;
  const displayMonthlyAmount = activeHistory
    ? (Number(monthlyStats?.totalAmount) || 0) -
      (Number(activeHistoryPrice) || 0) +
      activeDisplayPrice
    : monthlyStats?.totalAmount;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
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
                  {formatCurrency(displayMonthlyAmount)}
                </Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Điện năng tiêu thụ</Text>
                <Text style={styles.infoValue}>
                  {formatEnergy(displayMonthlyEnergy)}
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
              histories.map((item, index) => {
                const isCharging = isChargingHistory(item);
                const sessionStartTime = getHistoryStartTime(item);
                const displayEnergy = getDisplayEnergy(item);
                const displayPrice = getDisplayPrice(item);
                const displayDuration = isCharging
                  ? formatElapsedDuration(
                      getElapsedDuration(sessionStartTime, currentTime),
                    )
                  : calculateChargingDurationFormatted(
                      item?.createdAt,
                      item?.updatedAt,
                    );

                const status = !isCharging
                  ? "completed"
                  : isLive
                  ? "charging"
                  : "waiting";
                const isChargingState = status === "charging";

                return (
                  <View
                    key={item?._id ?? `${item?.createdAt}-${index}`}
                    style={styles.sessionCard}
                  >
                    <View style={styles.cardHeader}>
                      <Text style={styles.cardTitle}>
                        Phiên sạc #{index + 1}
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
                            isChargingState
                              ? styles.statusActiveText
                              : styles.statusDoneText,
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

                    <Text style={styles.startTime}>
                      Bắt đầu: {vietnamDate(sessionStartTime)} -
                      {` ${vietnamTime(sessionStartTime)}`}
                    </Text>

                    <View style={styles.metricsRow}>
                      <View
                        style={[styles.metricCard, styles.metricCardSpacing]}
                      >
                        <Text style={styles.metricLabel}>
                          Điện năng tiêu thụ
                        </Text>
                        <Text style={styles.metricValue}>
                          {formatEnergy(displayEnergy)}
                        </Text>
                      </View>

                      <View style={styles.metricCard}>
                        <Text style={styles.metricLabel}>Chi phí</Text>
                        <Text style={styles.metricValue}>
                          {formatCurrency(displayPrice)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Tổng thời gian sạc</Text>
                      <Text style={styles.infoValue}>{displayDuration}</Text>
                    </View>
                  </View>
                );
              })
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
    backgroundColor: Colors.primary,
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
    marginBottom: 14,
  },
  sessionCard: {
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
    marginBottom: 14,
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
    fontSize: 16,
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
  emptySubtitle: {
    marginTop: 6,
    fontSize: 13,
    color: Colors.neutralText,
    lineHeight: 18,
  },
});

export default HistoryScreen;
