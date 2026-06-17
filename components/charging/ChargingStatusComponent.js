import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors } from "../../constants/color";
import { vietnamDate, vietnamTime } from "../../utils/time";
import WaveChart from "../WaveChart";

const ChargingStatusComponent = ({ chargingStartTime, onStopCharging }) => {
  return (
    <View style={styles.container}>
      <WaveChart />

      {/* Thông tin thời gian */}
      <View style={styles.timeInfoContainer}>
        <View style={styles.timeBox}>
          <Text style={styles.timeLabel}>THỜI GIAN BẮT ĐẦU SẠC</Text>
          <Text style={styles.timeValue}>{vietnamTime(chargingStartTime)}</Text>
          <Text style={styles.timeDate}>{vietnamDate(chargingStartTime)}</Text>
        </View>
      </View>

      {/* Nút dừng sạc */}
      <TouchableOpacity style={styles.stopButton} onPress={onStopCharging}>
        <Text style={styles.stopButtonText}>Dừng sạc xe</Text>
      </TouchableOpacity>

      {/* Thông báo AI NOC */}
      <View style={styles.aiNocContainer}>
        <MaterialCommunityIcons name="shield-check" size={24} color="#fff" />
        <View style={styles.aiNocTextContainer}>
          <Text style={styles.aiNocTitle}>HỆ THỐNG AI NOC</Text>
          <Text style={styles.aiNocDescription}>
            Hệ thống AI giám sát 24/7 đảm bảo an toàn cho xe của bạn trong suốt
            phiên sạc.
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    padding: 16,
  },
  circleContainer: {
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  circleContent: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  percentageText: {
    fontSize: 48,
    fontWeight: "bold",
    color: Colors.primary,
  },
  chargingModeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  chargingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginRight: 6,
  },
  chargingModeText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: "600",
  },
  timeInfoContainer: {
    flexDirection: "row",
    marginTop: 24,
    backgroundColor: Colors.primary,
    color: Colors.secondary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  timeBox: {
    alignItems: "center",
    paddingHorizontal: 16,
  },
  timeLabel: {
    fontSize: 12,
    color: Colors.secondary,
    marginBottom: 4,
  },
  timeValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.secondary,
  },
  timeDate: {
    fontSize: 14,
    color: Colors.secondary,
  },
  divider: {
    width: 1,
    backgroundColor: "#DDD",
  },
  aiNocContainer: {
    flexDirection: "row",
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    width: "100%",
  },
  aiNocTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  aiNocTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#fff",
  },
  aiNocDescription: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 4,
  },
  stopButton: {
    marginTop: 24,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 40,
  },
  stopButtonText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default ChargingStatusComponent;
