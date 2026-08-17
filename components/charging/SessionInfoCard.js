import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors } from "../../constants/color";
import { vietnamDate, vietnamTime } from "../../utils/time";
import deviceDisplayName from "../../utils/deviceDisplayName";

const { getDeviceDisplayName, hasCustomDeviceName } = deviceDisplayName;

const SessionInfoCard = ({ chargingStartTime, latestHistory, bike }) => {
  const outletIndex =
    latestHistory?.powerId?.index ?? latestHistory?.powerIndex ?? null;
  const batteryStart = latestHistory?.batteryPercentStart;

  // Chỉ hiển thị dòng nào thực sự có dữ liệu để tránh khoảng trống khó hiểu.
  const rows = [
    chargingStartTime && {
      icon: "clock-outline",
      label: "Bắt đầu",
      value: `${vietnamTime(chargingStartTime)} · ${vietnamDate(chargingStartTime)}`,
    },
    // Chỉ thêm dòng tên khi chủ trụ đã đặt tên — chưa đặt thì tên trùng mã trụ,
    // in ra là lặp lại dòng "Mã trụ" ngay bên dưới.
    hasCustomDeviceName(latestHistory?.deviceId) && {
      icon: "tag-outline",
      label: "Tên trụ",
      value: getDeviceDisplayName(latestHistory.deviceId),
    },
    latestHistory?.deviceId?.address && {
      icon: "map-marker-outline",
      label: "Trụ sạc",
      value: latestHistory.deviceId.address,
    },
    latestHistory?.deviceId?.deviceCode && {
      icon: "identifier",
      label: "Mã trụ",
      value: latestHistory.deviceId.deviceCode,
    },
    outletIndex !== null &&
      outletIndex !== undefined && {
        icon: "power-plug-outline",
        label: "Cổng số",
        value: String(outletIndex),
      },
    bike?.licensePlate && {
      icon: "motorbike",
      label: "Biển số xe",
      value: bike.licensePlate,
    },
    batteryStart !== null &&
      batteryStart !== undefined && {
        icon: "battery-charging-medium",
        label: "Pin lúc bắt đầu",
        value: `${batteryStart}%`,
      },
  ].filter(Boolean);

  if (!rows.length) {
    return null;
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <MaterialCommunityIcons
          name="information-outline"
          size={18}
          color={Colors.primary}
        />
        <Text style={styles.title}>Thông tin phiên sạc</Text>
      </View>

      {rows.map((row, index) => (
        <View
          key={row.label}
          style={[styles.row, index === rows.length - 1 && styles.rowLast]}
        >
          <View style={styles.labelWrap}>
            <MaterialCommunityIcons
              name={row.icon}
              size={16}
              color={Colors.neutralText}
            />
            <Text style={styles.label}>{row.label}</Text>
          </View>
          <Text style={styles.value} numberOfLines={2}>
            {row.value}
          </Text>
        </View>
      ))}
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
    marginBottom: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.textPrimary,
    letterSpacing: 0.3,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  rowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  labelWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.neutralText,
  },
  value: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textPrimary,
    textAlign: "right",
  },
});

export default SessionInfoCard;
