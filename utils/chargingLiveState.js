// Hai câu hỏi KHÁC NHAU mà màn phiên sạc từng trả lời bằng cùng một biến:
//
//   1. "Có đang sạc không?"        -> badge "Đang sạc" / "Đang chờ sạc"
//   2. "Có nhận được tín hiệu chưa?" -> overlay "Đang chờ tín hiệu từ trụ sạc"
//
// Gộp hai câu hỏi vào một cờ khiến phiên nhà dân bật tay hiện overlay "đang chờ
// tín hiệu" trong khi biểu đồ đã có dữ liệu và điện năng đã cộng dồn.

const toFiniteNumber = (value, fallback = 0) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

// Ổ có đang thực sự tải điện không.
//
// `relay` là trạng thái relay do BACKEND ra lệnh, không phải bằng chứng có dòng.
// Phiên nhà dân bật bằng tay ở trụ thì backend chưa từng gửi lệnh nào, nên phần
// cứng báo relay = 0 trong khi vẫn đẩy công suất thật. Bản cũ để `relay` thắng
// tuyệt đối nên mọi phiên bật tay đều hiện "Đang chờ sạc" suốt.
//
// Công suất > 0 là bằng chứng vật lý, mạnh hơn cờ relay -> chỉ cần MỘT trong hai
// là coi như đang sạc. Chiều ngược lại vẫn giữ: relay = 1 mà power tạm về 0
// (khoảng lặng giữa hai nhịp đo) vẫn là đang sạc, không nhấp nháy về "chờ".
const isChargingLive = ({ relay, powerWatts } = {}) => {
  const hasRelayFlag = relay !== undefined && relay !== null;
  const relayOn = hasRelayFlag ? Boolean(Number(relay)) : false;

  return relayOn || toFiniteNumber(powerWatts) > 0;
};

// Đã nhận được tín hiệu từ trụ chưa — độc lập hoàn toàn với việc có đang sạc.
// Chỉ cần một điểm công suất là đã có tín hiệu, kể cả điểm đó bằng 0.
const hasTelemetrySignal = ({ powerSeries } = {}) =>
  Array.isArray(powerSeries) && powerSeries.length > 0;

module.exports = { isChargingLive, hasTelemetrySignal };
