import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors } from "../../constants/color";
import { formatPrice, getCurrentRateInfo } from "../../utils/pricing";

// Ước tính thời gian còn sạc được với số dư hiện tại, dựa trên công suất tức
// thời (rơi về công suất trung bình nếu tức thời = 0) và ĐƠN GIÁ khung giờ
// hiện hành.
const formatEstimate = (balance, powerWatts, ratePerKwh) => {
  const remaining = Number(balance) || 0;
  const power = Number(powerWatts) || 0;
  const rate = Number(ratePerKwh) || 0;

  if (remaining <= 0) {
    return "Hết số dư";
  }
  if (power <= 0 || rate <= 0) {
    return "Đang chờ công suất";
  }

  // Chi phí mỗi giờ (VND) = (công suất kW) × đơn giá hiện hành.
  const costPerHour = (power / 1000) * rate;
  if (costPerHour <= 0) {
    return "Đang chờ công suất";
  }

  const hoursDecimal = remaining / costPerHour;
  if (hoursDecimal >= 100) {
    return "> 99 giờ";
  }

  const totalMinutes = Math.max(0, Math.floor(hoursDecimal * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) {
    return `~${minutes} phút`;
  }
  return `~${hours} giờ ${minutes} phút`;
};

// Màu badge theo khung giờ để nhận biết nhanh: cao điểm (cam), thấp điểm
// (xanh lá), bình thường (trung tính).
const PERIOD_BADGE_STYLE = {
  peak: { bg: "#FFF1E6", text: Colors.warningOrange, border: "#FFD9B8" },
  offPeak: { bg: Colors.successBg, text: Colors.primary, border: Colors.borderGreenLight },
  normal: { bg: Colors.white, text: Colors.textDarkGreen, border: Colors.borderGreenLight },
};

const ChargingCostCard = ({
  currentPower = 0,
  averagePower = 0,
  latestHistory,
  balance,
}) => {
  // Cập nhật thông tin khung giờ định kỳ để badge/đơn giá tự đổi khi qua mốc.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30 * 1000);
    return () => clearInterval(id);
  }, []);

  const rateInfo = getCurrentRateInfo(now, {
    unitPrice: latestHistory?.unitPrice,
  });
  const badgeStyle = PERIOD_BADGE_STYLE[rateInfo.period] || PERIOD_BADGE_STYLE.normal;
  // Giá phẳng (PRICING_MODE = 'flat') không có khung giờ -> ẩn badge, chỉ
  // hiện đơn giá.
  const showPeriodBadge = Boolean(rateInfo.period);

  // Chi phí tạm tính do BACKEND tính (đã theo khung giờ) — lấy mức mới nhất.
  const displayPrice = Math.max(
    Number(latestHistory?.lastKnownPrice) || 0,
    Number(latestHistory?.billedAmount) || 0,
    Number(latestHistory?.price) || 0,
  );

  const powerForEstimate = currentPower > 0 ? currentPower : averagePower;
  const estimateText = formatEstimate(balance, powerForEstimate, rateInfo.rate);
  const hasBalance = balance !== undefined && balance !== null;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <MaterialCommunityIcons
          name="wallet-outline"
          size={18}
          color={Colors.primary}
        />
        <Text style={styles.title}>Chi phí phiên sạc</Text>
        {showPeriodBadge && (
          <View
            style={[
              styles.periodBadge,
              { backgroundColor: badgeStyle.bg, borderColor: badgeStyle.border },
            ]}
          >
            <Text style={[styles.periodBadgeText, { color: badgeStyle.text }]}>
              {rateInfo.label}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.mainRow}>
        <View style={styles.mainBlock}>
          <Text style={styles.mainLabel}>Tạm tính</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceValue}>{formatPrice(displayPrice)}</Text>
            <Text style={styles.priceUnit}>đ</Text>
          </View>
        </View>
        <View style={styles.rateBadge}>
          <Text style={styles.rateText}>{formatPrice(rateInfo.rate)} đ/kWh</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.subGrid}>
        <View style={styles.subItem}>
          <Text style={styles.subLabel}>Số dư ví</Text>
          <Text style={styles.subValue}>
            {hasBalance ? `${formatPrice(balance)} đ` : "—"}
          </Text>
        </View>
        <View style={styles.subDividerVertical} />
        <View style={styles.subItem}>
          <Text style={styles.subLabel}>Ước tính sạc thêm</Text>
          <Text style={styles.subValue}>{estimateText}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: "100%",
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorderGreen,
    backgroundColor: Colors.cardBgGreen,
    padding: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  title: {
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
    color: Colors.textPrimary,
    letterSpacing: 0.3,
  },
  periodBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  periodBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  mainRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
  },
  mainBlock: {
    flexShrink: 1,
  },
  mainLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.neutralText,
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  priceValue: {
    fontSize: 32,
    fontWeight: "800",
    color: Colors.primary,
    lineHeight: 36,
  },
  priceUnit: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.primary,
    marginLeft: 4,
    marginBottom: 4,
  },
  rateBadge: {
    backgroundColor: Colors.white,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.borderGreenLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 4,
  },
  rateText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textDarkGreen,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.dividerGreen,
    marginVertical: 14,
  },
  subGrid: {
    flexDirection: "row",
    alignItems: "center",
  },
  subItem: {
    flex: 1,
  },
  subDividerVertical: {
    width: 1,
    alignSelf: "stretch",
    backgroundColor: Colors.dividerGreen,
    marginHorizontal: 12,
  },
  subLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.neutralText,
    marginBottom: 6,
  },
  subValue: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
});

export default ChargingCostCard;
