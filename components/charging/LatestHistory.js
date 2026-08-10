import React, { useContext, useEffect, useRef, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Colors } from "../../constants/color";
import { Ionicons } from "@expo/vector-icons";
import { SocketContext } from "../../providers/SocketProvider";
import { useQueryClient } from "@tanstack/react-query";
import BatteryCharging from "./BatteryCharging";
import { formatPrice } from "../../utils/pricing";

// Khi năng lượng realtime tăng thêm mức này thì làm mới giá/số dư từ backend.
const ENERGY_REFRESH_STEP_KWH = 0.02;

const formatEnergy = (value) => {
  const energy = Number(value) || 0;
  return Number.isInteger(energy) ? energy : energy.toFixed(3);
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
  const hasDuration = Boolean(
    history?.totalTime || history?.clientSessionStopped,
  );
  // Nhà dân (isHouse): điện miễn phí — hiển thị "Miễn phí" thay cho số tiền.
  const isHouse = Boolean(history?.deviceId?.isHouse);
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
      navigation.navigate("Charge", { resetChargeFlowToken: Date.now() });
    }
  };

  const [realtimeEnergy, setRealtimeEnergy] = useState(baseEnergy);
  const [isLive, setIsLive] = useState(baseEnergy > 0);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const lastInvalidatedEnergyRef = useRef(baseEnergy);
  const sessionIdRef = useRef(history?._id);

  useEffect(() => {
    // Sang phiên KHÁC thì đặt lại hẳn. Còn trong cùng một phiên thì số chỉ
    // được phép đi lên: baseEnergy lấy từ lastKnownEnergy dưới DB, luôn chậm
    // hơn số realtime vài giây, nên gán đè mỗi lần refetch sẽ kéo tụt số đang
    // hiển thị.
    const isNewSession = sessionIdRef.current !== history?._id;
    sessionIdRef.current = history?._id;

    if (isNewSession) {
      setRealtimeEnergy(baseEnergy);
      lastInvalidatedEnergyRef.current = baseEnergy;
      setIsLive(baseEnergy > 0);
      return;
    }

    setRealtimeEnergy((prev) => Math.max(prev, baseEnergy));
    lastInvalidatedEnergyRef.current = Math.max(
      lastInvalidatedEnergyRef.current,
      baseEnergy,
    );
    if (baseEnergy > 0) {
      setIsLive(true);
    }
  }, [history?._id, baseEnergy]);

  useEffect(() => {
    if (!socket || !history || hasDuration) return;

    const handleWave = (value) => {
      // Gói telemetry có thể mang energy là null / "" / chuỗi rác. Cửa lọc cũ
      // chỉ chặn undefined, nên `null / 1000` lọt xuống thành 0 và số trên màn
      // hình rơi thẳng về 0 giữa lúc đang sạc.
      if (
        value?.energy === undefined ||
        value?.energy === null ||
        value?.energy === ""
      ) {
        return;
      }

      const nextEnergy = Number(value.energy);
      if (!Number.isFinite(nextEnergy)) {
        return;
      }

      // Năng lượng của một phiên chỉ tăng (backend cũng chốt theo max, xem
      // charge.service.js nhánh nhà dân). Lấy max thay vì gán đè để một gói
      // đến muộn/thấp hơn không kéo tụt số đang hiển thị.
      setRealtimeEnergy((prev) => Math.max(prev, nextEnergy / 1000));
      setIsLive(true);
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

  // Giá hiển thị lấy trực tiếp từ backend (đã tính theo khung giờ), không tính
  // lại ở client để tránh lệch số.
  const lastFetchedEnergy = baseEnergy;
  const displayPrice = hasDuration ? history?.price : basePrice;
  const displayDuration = hasDuration
    ? history?.totalTime
    : getElapsedDuration(chargingStartTime, currentTime);

  // Khi năng lượng realtime vượt mốc bước, làm mới latestHistory (giá) và ME
  // (số dư ví) để hiển thị khớp với số backend đã trừ.
  useEffect(() => {
    if (hasDuration) return;

    const reference = Math.max(
      lastInvalidatedEnergyRef.current,
      lastFetchedEnergy,
    );

    if (realtimeEnergy - reference >= ENERGY_REFRESH_STEP_KWH) {
      lastInvalidatedEnergyRef.current = realtimeEnergy;
      queryClient.invalidateQueries({ queryKey: ["latestHistory"] });
      queryClient.invalidateQueries({ queryKey: ["ME"] });
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
                  {isHouse ? "Quý khách tự thanh toán" : `${formatPrice(displayPrice)} VND`}
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
