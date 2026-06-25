import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/color";

const formatDateTime = (date) => {
  if (!date) return "-";

  return new Date(date).toLocaleString("vi-VN", {
    hour12: false,
    timeZone: "Asia/Ho_Chi_Minh",
  });
};

const formatCurrency = (value) => {
  const amount = Number(value || 0);
  return `${amount.toLocaleString("vi-VN")} VND`;
};

const formatEnergy = (value) => {
  const energy = Number(value || 0);
  return `${energy.toLocaleString("vi-VN", { maximumFractionDigits: 3 })} kWh`;
};

const BikeRegistrated = ({ bike }) => {
  const bikeData = bike?.bike;

  if (!bikeData) return null;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerContent}>
          <Text style={styles.plate}>{bikeData?.licensePlate || "--"}</Text>
          <Text style={styles.owner} numberOfLines={1}>
            {bikeData?.bikeOwnerName || "Không có dữ liệu chủ xe"}
          </Text>
        </View>
      </View>

      <View style={styles.infoBox}>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Loại xe</Text>
          <Text style={styles.value}>{bikeData?.type || "--"}</Text>
        </View>

        <View style={[styles.infoRow, styles.infoRowLast]}>
          <Text style={styles.label}>Ngày đăng ký</Text>
          <Text style={styles.value}>
            {formatDateTime(bikeData?.createdAt)}
          </Text>
        </View>
      </View>

      <View style={styles.quickStatsRow}>
        <View style={styles.quickStatItem}>
          <Text style={styles.quickStatValue}>
            {bikeData?.chargingCount || 0}
          </Text>
          <Text style={styles.quickStatLabel}>Lần sạc</Text>
        </View>

        <View style={styles.quickStatItem}>
          <Text style={styles.quickStatValue}>
            {formatEnergy(bikeData?.energyConsumed)}
          </Text>
          <Text style={styles.quickStatLabel}>Điện tiêu thụ</Text>
        </View>

        <View style={styles.quickStatItem}>
          <Text style={styles.quickStatValue}>
            {formatCurrency(bikeData?.amountSpent)}
          </Text>
          <Text style={styles.quickStatLabel}>Tổng chi</Text>
        </View>
      </View>

      <View style={styles.statusRow}>
        <View style={styles.statusItem}>
          <Ionicons
            name={bikeData?.isCharging ? "flash" : "flash-outline"}
            size={22}
            color={bikeData?.isCharging ? Colors.primary : Colors.disable}
          />
          <Text style={styles.statusLabel}>
            {bikeData?.isCharging ? "Đang sạc" : "Không sạc"}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  headerContent: {
    flex: 1,
    paddingRight: 12,
  },
  plate: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  owner: {
    marginTop: 2,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  approvalBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  approvalText: {
    fontSize: 12,
    fontWeight: "700",
  },
  infoBox: {
    borderWidth: 1,
    borderColor: Colors.borderLightGray,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Colors.bgOffWhite,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    gap: 10,
  },
  infoRowLast: {
    marginBottom: 0,
  },
  label: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  value: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textPrimary,
    flexShrink: 1,
    textAlign: "right",
  },
  quickStatsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  quickStatItem: {
    flex: 1,
    backgroundColor: Colors.bgLightGrayBlue,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  quickStatValue: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textPrimary,
    textAlign: "center",
  },
  quickStatLabel: {
    fontSize: 11,
    color: Colors.textMutedGray,
    marginTop: 4,
    textAlign: "center",
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    borderTopColor: Colors.dividerMuted,
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 4,
  },
  statusItem: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  statusLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  registrationSection: {
    marginTop: 14,
    borderTopColor: Colors.dividerMuted,
    borderTopWidth: 1,
    paddingTop: 12,
  },
  registrationTitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  registrationImage: {
    width: "100%",
    height: 150,
    borderRadius: 8,
    backgroundColor: Colors.bgGrayLight,
  },
  openCardButton: {
    marginTop: 8,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  openCardText: {
    color: Colors.primary,
    fontWeight: "600",
    fontSize: 13,
  },
});

export default BikeRegistrated;
