// Quyết định có cho phép ghi đè vị trí trụ nhà dân bằng vị trí hiện tại của máy
// hay không. Thuần JavaScript, không chạm expo-location, để kiểm thử được bằng
// `node --test`. Phần đo vị trí thật nằm ở services/location.service.js.
//
// VÌ SAO CẦN HÀNG RÀO: toạ độ trụ chính là dữ liệu mà cổng kiểm tra khoảng cách
// lúc quét QR đọc (utils/proximity.js). Cho chủ trụ đặt toạ độ bằng vị trí hiện
// tại là cho họ tự dời cái cổng đang kiểm tra họ — bấm nhầm lúc đang ở chỗ khác
// là hôm sau về nhà quét QR bị chặn vì "cách trụ 5km".
//
// Hai ngưỡng dưới đây cố ý dùng lại đúng hằng số của cổng đó thay vì đẻ ngưỡng
// mới: 200m là mức cổng đã tuyên bố không tin nổi nữa, còn 100m là bán kính
// cổng — lệch quá đó nghĩa là chủ trụ vừa tự đẩy mình ra ngoài.
const proximity = require("./proximity");

const {
  CHARGE_RADIUS_M,
  MAX_ACCURACY_TOLERANCE_M,
  getDeviceCoordinates,
  getDistanceMeters,
} = proximity;

const toNumber = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const isValidLatitude = (value) => value !== null && value >= -90 && value <= 90;

const isValidLongitude = (value) =>
  value !== null && value >= -180 && value <= 180;

// Kết quả:
//   "unknownPosition" - chưa đo được vị trí, không có gì để lưu
//   "tooInaccurate"   - đo được nhưng sai số lớn hơn cả cổng chịu được
//   "needsConfirm"    - hợp lệ, nhưng lệch xa vị trí đang lưu -> hỏi lại
//   "ready"           - lưu thẳng
const getLocationChangeDecision = ({ position, device } = {}) => {
  const latitude = toNumber(position?.latitude);
  const longitude = toNumber(position?.longitude);

  if (!isValidLatitude(latitude) || !isValidLongitude(longitude)) {
    return { type: "unknownPosition" };
  }

  // Xét trước khoảng cách: toạ độ sai vài trăm mét vừa gây "lệch xa" vừa vô
  // nghĩa, hỏi xác nhận là hỏi người dùng về một con số rác.
  const accuracy = toNumber(position?.accuracy);
  if (accuracy !== null && accuracy > MAX_ACCURACY_TOLERANCE_M) {
    return { type: "tooInaccurate", accuracy };
  }

  // Trụ vừa claim qua QR chưa có toạ độ nào — không có gì để so sánh, và đây
  // đúng là lần đặt vị trí đầu tiên mà tính năng này sinh ra để phục vụ.
  const currentCoordinates = getDeviceCoordinates(device);
  if (!currentCoordinates) {
    return { type: "ready" };
  }

  const distanceMeters = getDistanceMeters(
    { latitude, longitude },
    currentCoordinates,
  );

  if (distanceMeters > CHARGE_RADIUS_M) {
    return { type: "needsConfirm", distanceMeters };
  }

  return { type: "ready", distanceMeters };
};

module.exports = {
  getLocationChangeDecision,
};
