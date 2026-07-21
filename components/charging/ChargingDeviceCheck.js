import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/color";

const ChargingDeviceCheck = ({ deviceCode, powerIndex }) => (
  <View style={styles.container}>
    <View style={styles.iconWrap}>
      <Ionicons name="flash-outline" size={34} color={Colors.primary} />
    </View>
    <Text style={styles.title}>Đang kiểm tra kết nối ổ sạc và thiết bị sạc</Text>
    <Text style={styles.description}>
      Hệ thống đang kiểm tra xem xe đã được kết nối và bắt đầu nhận điện hay chưa.
    </Text>
    <View style={styles.stationCard}>
      <View style={styles.stationRow}>
        <Text style={styles.label}>Trụ sạc</Text>
        <Text style={styles.value}>{deviceCode || "--"}</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.stationRow}>
        <Text style={styles.label}>Ổ sạc</Text>
        <Text style={styles.value}>{powerIndex || "--"}</Text>
      </View>
    </View>
    <View style={styles.checkingRow}>
      <ActivityIndicator size="small" color={Colors.primary} />
      <Text style={styles.checkingText}>Đang chờ tín hiệu công suất...</Text>
    </View>
    <Text style={styles.hint}>
      Vui lòng cắm bộ sạc vào xe và giữ nguyên kết nối trong lúc kiểm tra.
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: { width: "100%", alignItems: "center", paddingVertical: 36 },
  iconWrap: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", backgroundColor: Colors.bgGreenTint, borderWidth: 1, borderColor: Colors.borderGreenLight },
  title: { marginTop: 20, fontSize: 22, fontWeight: "800", color: Colors.textDark, textAlign: "center" },
  description: { marginTop: 10, maxWidth: 340, fontSize: 14, lineHeight: 21, color: Colors.textSecondary, textAlign: "center" },
  stationCard: { width: "100%", marginTop: 28, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 14, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.borderGreenLight },
  stationRow: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  label: { fontSize: 13, fontWeight: "600", color: Colors.textSecondary },
  value: { fontSize: 14, fontWeight: "800", color: Colors.textPrimary },
  divider: { height: 1, backgroundColor: Colors.borderMuted },
  checkingRow: { marginTop: 28, flexDirection: "row", alignItems: "center", gap: 10 },
  checkingText: { fontSize: 14, fontWeight: "700", color: Colors.primary },
  hint: { marginTop: 14, maxWidth: 330, fontSize: 13, lineHeight: 19, color: Colors.neutralText, textAlign: "center" },
});

export default ChargingDeviceCheck;
