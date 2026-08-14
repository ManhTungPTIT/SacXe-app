import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Path,
  Stop,
} from "react-native-svg";
import { Colors } from "../constants/color";
import BatteryCharging from "./charging/BatteryCharging";
import chargingLiveState from "../utils/chargingLiveState";

const { hasTelemetrySignal } = chargingLiveState;

const CHART_HEIGHT = 140;
const CHART_PADDING = {
  top: 18,
  right: 16,
  bottom: 24,
  left: 16,
};
const EMPTY_CHART_DATA = Array.from({ length: 16 }, () => 0);
const GRID_LINE_COUNT = 5;

const toFiniteNumber = (value, fallback = 0) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

const formatEnergy = (value) => {
  const energy = toFiniteNumber(value);
  return energy < 10 ? energy.toFixed(3) : energy.toFixed(2);
};

const formatPower = (value) => {
  const power = toFiniteNumber(value);

  if (Math.abs(power) >= 1000) {
    return `${(power / 1000).toFixed(power >= 10000 ? 1 : 2)} kW`;
  }

  return `${Math.round(power)} W`;
};

const getPowerParts = (value) => {
  const power = toFiniteNumber(value);

  if (Math.abs(power) >= 1000) {
    return {
      value: (power / 1000).toFixed(power >= 10000 ? 1 : 2),
      unit: "kW",
    };
  }

  return {
    value: Math.round(power).toString(),
    unit: "W",
  };
};

const getSmoothPath = (points) => {
  if (!points.length) return "";

  if (points.length === 1) {
    return `M ${points[0].x} ${points[0].y}`;
  }

  return points.reduce((path, point, index) => {
    if (index === 0) {
      return `M ${point.x} ${point.y}`;
    }

    const previousPoint = points[index - 1];
    const controlX = previousPoint.x + (point.x - previousPoint.x) / 2;

    return `${path} C ${controlX} ${previousPoint.y}, ${controlX} ${point.y}, ${point.x} ${point.y}`;
  }, "");
};

const buildChartGeometry = (values, width) => {
  const plotWidth = width - CHART_PADDING.left - CHART_PADDING.right;
  const plotHeight = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const domainMin = Math.min(0, minValue);
  const naturalMax = Math.max(1, maxValue);
  const rangePadding = Math.max((naturalMax - domainMin) * 0.08, 1);
  const domainMax = naturalMax + rangePadding;
  const range = domainMax - domainMin || 1;
  const stepX = values.length > 1 ? plotWidth / (values.length - 1) : plotWidth;

  const points = values.map((value, index) => {
    const x = CHART_PADDING.left + stepX * index;
    const normalizedValue = (toFiniteNumber(value) - domainMin) / range;
    const y =
      CHART_PADDING.top + plotHeight - normalizedValue * plotHeight;

    return {
      x: Number(x.toFixed(2)),
      y: Number(y.toFixed(2)),
    };
  });

  const linePath = getSmoothPath(points);
  const firstPoint = points[0] || {
    x: CHART_PADDING.left,
    y: CHART_HEIGHT - CHART_PADDING.bottom,
  };
  const lastPoint = points[points.length - 1] || firstPoint;
  const baselineY = CHART_HEIGHT - CHART_PADDING.bottom;
  const areaPath = `${linePath} L ${lastPoint.x} ${baselineY} L ${firstPoint.x} ${baselineY} Z`;

  return {
    areaPath,
    linePath,
    plotHeight,
    points,
  };
};



const WaveChart = ({ chargingStartTime, telemetry }) => {
  const { width } = useWindowDimensions();
  const [elapsedTime, setElapsedTime] = useState("00:00:00");

  const {
    powerSeries = [],
    energyKwh = 0,
    isRelayOn = false,
    currentPower = 0,
    peakPower = 0,
    minPower = 0,
    averagePower = 0,
  } = telemetry || {};

  useEffect(() => {
    if (!chargingStartTime) return;

    const updateTime = () => {
      const start = new Date(chargingStartTime).getTime();
      const now = new Date().getTime();
      const diff = Math.max(0, now - start);

      const seconds = Math.floor((diff / 1000) % 60);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const hours = Math.floor((diff / (1000 * 60 * 60)));

      const formatted = [
        hours.toString().padStart(2, "0"),
        minutes.toString().padStart(2, "0"),
        seconds.toString().padStart(2, "0"),
      ].join(":");

      setElapsedTime(formatted);
    };

    updateTime();
    const intervalId = setInterval(updateTime, 1000);
    return () => clearInterval(intervalId);
  }, [chargingStartTime]);

  const chartWidth = Math.min(Math.max(width - 80, 240), 540);
  const chartData = powerSeries.length ? powerSeries : EMPTY_CHART_DATA;
  const chartGeometry = useMemo(
    () => buildChartGeometry(chartData, chartWidth),
    [chartData, chartWidth],
  );

  // HAI câu hỏi khác nhau, trước đây dùng chung một biến nên lệch nhau ở phiên
  // nhà dân bật tay: đã có dữ liệu công suất và điện năng đã cộng dồn, nhưng
  // overlay vẫn báo "đang chờ tín hiệu".
  //
  //   isLive       -> CÓ ĐANG SẠC không (badge trên đầu thẻ)
  //   hasSignal    -> ĐÃ NHẬN ĐƯỢC TÍN HIỆU chưa (overlay che biểu đồ)
  //
  // Chỉ cần một điểm công suất là đã có tín hiệu, kể cả điểm đó bằng 0 — lúc đó
  // biểu đồ có dữ liệu thật để vẽ nên không được che nữa.
  const isLive = isRelayOn;
  const hasSignal = hasTelemetrySignal({ powerSeries });
  const currentPowerParts = getPowerParts(currentPower);
  const scaleMaxPower = isLive ? peakPower : 0;
  const activePoint =
    chartGeometry.points[chartGeometry.points.length - 1] || null;
  const gridLines = Array.from({ length: GRID_LINE_COUNT }, (_, index) => {
    return (
      CHART_PADDING.top +
      (chartGeometry.plotHeight / (GRID_LINE_COUNT - 1)) * index
    );
  });

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.powerBlock}>
          <Text style={styles.eyebrow}>Công suất trực tiếp</Text>
          <View style={styles.powerRow}>
            <Text style={styles.powerValue}>{currentPowerParts.value}</Text>
            <Text style={styles.powerUnit}>{currentPowerParts.unit}</Text>
          </View>
        </View>

        <View style={[styles.liveBadge, !isLive && styles.liveBadgeIdle]}>
          <View style={[styles.liveDot, !isLive && styles.liveDotIdle]} />
          <Text style={[styles.liveText, !isLive && styles.liveTextIdle]}>
            {isLive ? "Đang sạc" : "Đang chờ sạc"}
          </Text>
          <BatteryCharging status={isLive ? "charging" : "waiting"} />
        </View>
      </View>

      <View style={styles.chartSurface}>
        <Svg width={chartWidth} height={CHART_HEIGHT}>
          <Defs>
            <LinearGradient id="waveFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={Colors.primary} stopOpacity="0.24" />
              <Stop offset="0.56" stopColor={Colors.primary} stopOpacity="0.08" />
              <Stop offset="1" stopColor={Colors.primary} stopOpacity="0" />
            </LinearGradient>
          </Defs>

          {gridLines.map((lineY, index) => (
            <Line
              key={lineY}
              x1={CHART_PADDING.left}
              x2={chartWidth - CHART_PADDING.right}
              y1={lineY}
              y2={lineY}
              stroke={index === GRID_LINE_COUNT - 1 ? Colors.gridLineActive : Colors.gridLineIdle}
              strokeDasharray={index === GRID_LINE_COUNT - 1 ? undefined : "5 8"}
              strokeWidth={1}
            />
          ))}

          <Path d={chartGeometry.areaPath} fill="url(#waveFill)" />
          <Path
            d={chartGeometry.linePath}
            fill="none"
            stroke={Colors.primary}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={4}
          />

          {activePoint && isLive ? (
            <>
              <Circle
                cx={activePoint.x}
                cy={activePoint.y}
                fill={Colors.primary}
                opacity={0.12}
                r={12}
              />
              <Circle
                cx={activePoint.x}
                cy={activePoint.y}
                fill={Colors.white}
                r={5}
                stroke={Colors.primary}
                strokeWidth={3}
              />
            </>
          ) : null}
        </Svg>

        {!hasSignal ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Đang chờ tín hiệu từ trụ sạc</Text>
            <Text style={styles.emptyText}>
              Biểu đồ sẽ bắt đầu chạy khi có dữ liệu công suất.
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.scaleRow}>
        <Text style={styles.scaleText}>{formatPower(minPower)}</Text>
        <Text style={styles.scaleText}>{formatPower(scaleMaxPower)}</Text>
      </View>

      <View style={styles.metricsRow}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Điện năng tiêu thụ</Text>
          <Text style={styles.metricValue}>{formatEnergy(energyKwh)} kWh</Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Thời gian sạc</Text>
          <Text style={styles.metricValue}>{elapsedTime}</Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Công suất trung bình</Text>
          <Text style={styles.metricValue}>{formatPower(averagePower)}</Text>
        </View>
      </View>

      <Text style={styles.chartDescription}>
        Dữ liệu công suất được cập nhật theo thời gian thực trong phiên sạc.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorderGreen,
    backgroundColor: Colors.cardBgGreen,
    padding: 16,
    shadowColor: Colors.shadowGreen,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  powerBlock: {
    flex: 1,
  },
  eyebrow: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  powerRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginTop: 8,
  },
  powerValue: {
    color: Colors.textDark,
    fontSize: 40,
    fontWeight: "800",
    lineHeight: 44,
  },
  powerUnit: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 5,
    marginLeft: 6,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    backgroundColor: Colors.successBg,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  liveBadgeIdle: {
    backgroundColor: Colors.neutralBg,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: Colors.primary,
    marginRight: 6,
  },
  liveDotIdle: {
    backgroundColor: Colors.inactive,
  },
  liveText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: "700",
  },
  liveTextIdle: {
    color: Colors.neutralText,
  },
  chartSurface: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: CHART_HEIGHT,
    marginTop: 12,
    overflow: "hidden",
  },
  emptyState: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  emptyTitle: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center",
  },
  emptyText: {
    color: Colors.neutralText,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 6,
    textAlign: "center",
  },
  scaleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: -2,
    paddingHorizontal: 2,
  },
  scaleText: {
    color: Colors.textMutedGreen,
    fontSize: 11,
    fontWeight: "600",
  },
  metricsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
  },
  metricCard: {
    flex: 1,
    minHeight: 68,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.borderGreenLight,
    backgroundColor: Colors.white,
    paddingHorizontal: 10,
    paddingVertical: 10,
    justifyContent: "space-between",
  },
  metricLabel: {
    color: Colors.neutralText,
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 14,
  },
  metricValue: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: "800",
    marginTop: 8,
  },
  chartDescription: {
    color: Colors.textDarkGreen,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
    marginTop: 14,
    textAlign: "center",
  },

});

export default WaveChart;
