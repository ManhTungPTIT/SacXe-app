import React, { useContext, useEffect, useState } from "react";
import { SocketContext } from "../providers/SocketProvider";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import LineChart from "react-native-chart-kit/dist/line-chart";
import { Colors } from "../constants/color";

const screenWidth = Dimensions.get("window").width;
const Y_AXIS_SEGMENTS = 4;

const getYAxisDecimalPlaces = (values, segments = Y_AXIS_SEGMENTS) => {
  if (!values.length) return 1;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;

  if (range <= 0) return 2;

  const step = range / segments;
  if (step <= 0) return 2;

  // Ensure adjacent y-axis ticks remain distinct after rounding.
  return Math.min(Math.max(1, Math.ceil(-Math.log10(step)) + 1), 6);
};

const WaveChart = () => {
  const socketContext = useContext(SocketContext);
  const socket = socketContext?.socket;
  const [telemetryData, setTelemetryData] = useState([]);
  const chartData = telemetryData.length ? telemetryData : [0];
  const yAxisDecimalPlaces = getYAxisDecimalPlaces(chartData);
  const [energy, setEnergy] = useState(0);

  const formatYLabel = (value) => {
    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) {
      return value;
    }

    return numericValue.toFixed(yAxisDecimalPlaces);
  };

  useEffect(() => {
    if (!socket) return;

    const handleWave = (value) => {
      setEnergy(value?.energy / 1000 || 0);
      setTelemetryData((prev) => {
        const newData = [...prev, value?.power || 0];

        // giữ tối đa 20 điểm để hiển thị
        if (newData.length > 20) {
          newData.shift();
        }

        return newData;
      });
    };

    socket.on("wave_data", handleWave);

    // Cleanup khi component unmount
    return () => {
      socket.off("wave_data", handleWave);
    };
  }, [socket]);
  return (
    <View>
      <View style={styles.energyRow}>
        <Text style={styles.energyText}>
          Điện năng đã sử dụng: {energy} kWh
        </Text>
      </View>
      <View style={styles.chartContainer}>
        <LineChart
          data={{
            labels: telemetryData.map((_, i) => i.toString()),
            datasets: [{ data: chartData }],
          }}
          width={screenWidth * 0.9}
          height={150}
          segments={Y_AXIS_SEGMENTS}
          formatYLabel={formatYLabel}
          chartConfig={{
            backgroundGradientFrom: "#fff",
            backgroundGradientTo: "#fff",
            color: () => Colors.primary,
            strokeWidth: 1,
            decimalPlaces: yAxisDecimalPlaces,
            propsForDots: {
              r: "0",
            },
            propsForHorizontalLabels: {
              fill: "#000",
            },
          }}
          fromZero
          withVerticalLines={false}
          withVerticalLabels={false}
          bezier
        />
      </View>
      <Text style={styles.chartDescription}>
        Biểu đồ sóng công suất tức thời trong quá trình sạc, giúp bạn theo dõi
        tình trạng sạc
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  energyRow: {
    display: "flex",
    alignItems: "flex-end",
    marginTop: 8,
  },
  energyText: {
    fontSize: 14,
    fontWeight: "600",
  },
  chartContainer: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 16,
  },
  chartDescription: {
    textAlign: "center",
    marginTop: -10,
    color: Colors.primary,
    fontWeight: "600",
  },
});

export default WaveChart;
