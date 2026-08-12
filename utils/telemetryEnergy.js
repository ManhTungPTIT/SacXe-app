// Đọc năng lượng luỹ kế từ một gói telemetry (socket `wave_data`), trả về kWh.
//
// ĐƠN VỊ: phần cứng gửi `energy` theo **kWh**, KHÔNG phải Wh. Gói thật đo được
// từ trụ plug_AB2860:
//
//   {"voltage":213.3,"current":0.231,"power":42.81,"pf_counter":8423,"energy":0.022}
//
// Bằng chứng là bước nhảy: `energy` đứng yên suốt 20 giây trong khi power ~42W.
// Bộ đếm có độ phân giải 0.001; ở 42W thì 0.001 kWh (= 1 Wh) mất ~86 giây mới
// nhảy một bước — khớp quan sát. Nếu là Wh thì phải nhảy mỗi gói.
//
// Bản cũ chia thêm 1000 ở BA chỗ riêng biệt (màn phiên sạc, Home, Lịch sử) nên
// điện năng hiển thị nhỏ hơn 1000 lần và làm tròn ra "0 kWh". Gộp về một hàm để
// ba màn không thể lệch nhau nữa — chính là lỗi "số realtime lệch so với Home
// và Lịch sử".
//
// Bản backend tương ứng: backend/src/utils/telemetryEnergy.js. Hai bên phải
// luôn hiểu gói tin giống nhau.
const getTelemetryEnergyKwh = (telemetryData) => {
  const energy = Number(telemetryData?.energy);
  return Number.isFinite(energy) ? Math.max(0, energy) : 0;
};

// Gói telemetry có thể mang energy là null / "" / chuỗi rác. Trả null để phía
// gọi phân biệt "gói không mang số liệu" với "gói báo 0 kWh" — gộp hai ca này
// làm một sẽ kéo tụt mức đang hiển thị về 0.
const readTelemetryEnergyKwh = (telemetryData) => {
  const raw = telemetryData?.energy;
  if (raw === undefined || raw === null || raw === "") {
    return null;
  }

  const energy = Number(raw);
  return Number.isFinite(energy) ? Math.max(0, energy) : null;
};

module.exports = { getTelemetryEnergyKwh, readTelemetryEnergyKwh };
