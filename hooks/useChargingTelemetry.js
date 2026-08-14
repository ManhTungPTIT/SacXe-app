import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { SocketContext } from "../providers/SocketProvider";
import telemetryEnergy from "../utils/telemetryEnergy";
import sessionEnergySeed from "../utils/sessionEnergySeed";
import sessionTelemetryMatch from "../utils/sessionTelemetryMatch";
import chargingLiveState from "../utils/chargingLiveState";

const { getTelemetryEnergyKwh, readTelemetryEnergyKwh } = telemetryEnergy;
const { isNewSession } = sessionEnergySeed;
const { matchesSessionTelemetry } = sessionTelemetryMatch;
const { isChargingLive } = chargingLiveState;

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
export const useChargingTelemetry = (
  initialEnergyKwh = 0,
  initialTelemetry = null,
  sessionKey = null,
  activeSession = null,
) => {
  const socketContext = useContext(SocketContext);
  const socket = socketContext?.socket;

  const initialPower = Number(initialTelemetry?.power);
  const [powerSeries, setPowerSeries] = useState(() =>
    Number.isFinite(initialPower) ? [initialPower] : [],
  );
  const [energyKwh, setEnergyKwh] = useState(() =>
    Math.max(
      toFiniteNumber(initialEnergyKwh),
      getTelemetryEnergyKwh(initialTelemetry),
    ),
  );
  // Cùng quy tắc với nhánh nhận gói bên dưới — hai chỗ lệch nhau thì gói đầu
  // phiên và các gói sau sẽ cho ra hai kết luận khác nhau.
  const [isRelayOn, setIsRelayOn] = useState(() =>
    isChargingLive({
      relay: initialTelemetry?.relay,
      powerWatts: initialPower,
    }),
  );

  // Trong CÙNG một phiên, năng lượng chỉ đi lên: giá trị mới từ DB
  // (initialEnergyKwh) không được kéo tụt số đang hiển thị khi refetch.
  //
  // Nhưng khi SANG PHIÊN KHÁC thì phải reset hẳn. Trước đây chỉ có nhánh
  // Math.max, nên tổng của phiên trước rò sang phiên mới rồi đóng cứng ở đó:
  // gói telemetry đầu tiên báo 0.095 kWh mà màn hình vẫn hiện 1.xxx kWh.
  const sessionKeyRef = useRef(sessionKey);
  useEffect(() => {
    const nextEnergy = toFiniteNumber(initialEnergyKwh);

    if (isNewSession(sessionKeyRef.current, sessionKey)) {
      sessionKeyRef.current = sessionKey;
      setEnergyKwh(nextEnergy);
      setPowerSeries([]);
      return;
    }

    setEnergyKwh((prev) => Math.max(prev, nextEnergy));
  }, [sessionKey, initialEnergyKwh]);

  useEffect(() => {
    if (!socket) return;

    const handleWave = (value) => {
      if (!matchesSessionTelemetry(activeSession || sessionKey, value)) {
        return;
      }

      const nextEnergy = readTelemetryEnergyKwh(value);
      if (nextEnergy !== null) {
        setEnergyKwh((prev) => Math.max(prev, nextEnergy));
      }

      const nextPower = Number(value?.power);

      // Xét relay VÀ công suất cùng lúc (utils/chargingLiveState.js). Bản cũ
      // tách làm hai nhánh và để `relay` thắng tuyệt đối khi có mặt, nên phiên
      // nhà dân bật bằng tay — backend chưa gửi lệnh nên phần cứng báo relay=0
      // dù đang tải điện thật — hiện "Đang chờ sạc" suốt cả phiên.
      setIsRelayOn(
        isChargingLive({
          relay: value?.relay,
          powerWatts: nextPower,
        }),
      );

      if (!Number.isFinite(nextPower)) {
        return;
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
  }, [socket, activeSession, sessionKey]);

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
