import { useContext, useEffect, useMemo, useState } from "react";
import { SocketContext } from "../providers/SocketProvider";

// Số điểm công suất tối đa giữ lại để vẽ biểu đồ.
const MAX_POINTS = 28;

const toFiniteNumber = (value, fallback = 0) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

// Subscribe sự kiện `wave_data` MỘT LẦN và cấp dữ liệu telemetry đã xử lý cho
// mọi thành phần trong phiên sạc (WaveChart, ChargingCostCard, ...). Đây là
// nguồn sự thật duy nhất về công suất/năng lượng realtime, tránh việc nhiều nơi
// tự subscribe rồi lệch số.
export const useChargingTelemetry = (initialEnergyKwh = 0, initialTelemetry = null) => {
  const socketContext = useContext(SocketContext);
  const socket = socketContext?.socket;

  const initialPower = Number(initialTelemetry?.power);
  const [powerSeries, setPowerSeries] = useState(() =>
    Number.isFinite(initialPower) ? [initialPower] : [],
  );
  const [energyKwh, setEnergyKwh] = useState(() =>
    Math.max(
      toFiniteNumber(initialEnergyKwh),
      toFiniteNumber(initialTelemetry?.energy) / 1000,
    ),
  );
  const [isRelayOn, setIsRelayOn] = useState(() =>
    initialTelemetry?.relay !== undefined && initialTelemetry?.relay !== null
      ? Boolean(Number(initialTelemetry.relay))
      : Number.isFinite(initialPower) && initialPower > 0,
  );

  // Năng lượng chỉ tăng: khi nhận giá trị mới từ DB (initialEnergyKwh) vẫn giữ
  // mức cao nhất để không bị tụt khi refetch.
  useEffect(() => {
    const nextEnergy = toFiniteNumber(initialEnergyKwh);
    setEnergyKwh((prev) => Math.max(prev, nextEnergy));
  }, [initialEnergyKwh]);

  useEffect(() => {
    if (!socket) return;

    const handleWave = (value) => {
      if (value?.relay !== undefined && value?.relay !== null) {
        setIsRelayOn(Boolean(Number(value.relay)));
      }

      if (
        value?.energy !== undefined &&
        value?.energy !== null &&
        value?.energy !== ""
      ) {
        const nextEnergy = Number(value.energy);
        if (Number.isFinite(nextEnergy)) {
          setEnergyKwh((prev) => Math.max(prev, nextEnergy / 1000));
        }
      }

      const nextPower = Number(value?.power);
      if (!Number.isFinite(nextPower)) {
        return;
      }

      if (value?.relay === undefined || value?.relay === null) {
        setIsRelayOn(nextPower > 0);
      }

      setPowerSeries((prev) => {
        const nextData = [...prev, nextPower];
        if (nextData.length > MAX_POINTS) {
          nextData.shift();
        }
        return nextData;
      });
    };

    socket.on("wave_data", handleWave);

    return () => {
      socket.off("wave_data", handleWave);
    };
  }, [socket]);

  const derived = useMemo(() => {
    const currentPower = powerSeries[powerSeries.length - 1] || 0;
    const peakPower = powerSeries.length ? Math.max(...powerSeries) : 0;
    const minPower = powerSeries.length ? Math.min(...powerSeries) : 0;
    const averagePower = powerSeries.length
      ? powerSeries.reduce((total, value) => total + value, 0) /
        powerSeries.length
      : 0;

    return { currentPower, peakPower, minPower, averagePower };
  }, [powerSeries]);

  return {
    powerSeries,
    energyKwh,
    isRelayOn,
    ...derived,
  };
};

export default useChargingTelemetry;
