const { getDeviceDocument } = require("./claimScanDecision");

// Người dùng phải đứng trong bán kính này quanh trụ mới được đi tiếp sau khi
// quét QR.
const CHARGE_RADIUS_M = 100;

// Trần nới cho sai số định vị. Trụ sạc xe máy điện ở chung cư thường nằm dưới
// hầm gửi xe, nơi máy chỉ định vị được bằng wifi/cell và báo accuracy rất lớn —
// không có trần thì mọi khoảng cách đều lọt. Trần này chống nhiễu GPS thật chứ
// không chống gian lận: kiểm tra chỉ chạy phía app nên người cố tình lách vốn
// đã có cách khác.
const MAX_ACCURACY_TOLERANCE_M = 200;

// Bán kính Trái Đất trung bình (IUGG mean radius).
const EARTH_RADIUS_M = 6371008.8;

const toNumber = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

// Kiểm tra null TRƯỚC khi so sánh: null >= -90 là true trong JavaScript vì null
// bị ép về 0, nên thiếu bước này thì toạ độ trống lại được coi là hợp lệ.
const isValidLatitude = (value) => value !== null && value >= -90 && value <= 90;

const isValidLongitude = (value) =>
  value !== null && value >= -180 && value <= 180;

const getDeviceCoordinates = (device) => {
  const document = getDeviceDocument(device);

  if (!document) {
    return null;
  }

  let latitude = toNumber(document.latitude);
  let longitude = toNumber(document.longitude);

  // Dự phòng cho bản ghi chỉ có GeoJSON. Thứ tự trong coordinates là
  // [longitude, latitude], ngược với cách viết thông thường.
  if (!isValidLatitude(latitude) || !isValidLongitude(longitude)) {
    const coordinates = document?.location?.coordinates;

    if (Array.isArray(coordinates) && coordinates.length >= 2) {
      longitude = toNumber(coordinates[0]);
      latitude = toNumber(coordinates[1]);
    }
  }

  if (!isValidLatitude(latitude) || !isValidLongitude(longitude)) {
    return null;
  }

  // Điểm 0,0 nằm giữa Đại Tây Dương — luôn là dữ liệu chưa nhập chứ không phải
  // toạ độ thật của một trụ sạc.
  if (latitude === 0 && longitude === 0) {
    return null;
  }

  return { latitude, longitude };
};

const toRadians = (degrees) => (degrees * Math.PI) / 180;

const getDistanceMeters = (from, to) => {
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);
  const deltaLat = toRadians(to.latitude - from.latitude);
  const deltaLng = toRadians(to.longitude - from.longitude);

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;

  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)));
};

const getProximityDecision = ({ position, device }) => {
  const userLatitude = toNumber(position?.latitude);
  const userLongitude = toNumber(position?.longitude);

  if (!isValidLatitude(userLatitude) || !isValidLongitude(userLongitude)) {
    return { type: "unknownPosition" };
  }

  const deviceCoordinates = getDeviceCoordinates(device);

  // Trụ thiếu toạ độ là lỗi dữ liệu vận hành. Caller cho qua kèm log thay vì
  // chặn người dùng vì một thiếu sót họ không gây ra.
  if (!deviceCoordinates) {
    return { type: "unknownDevice" };
  }

  const distanceMeters = getDistanceMeters(
    { latitude: userLatitude, longitude: userLongitude },
    deviceCoordinates,
  );

  const accuracy = toNumber(position?.accuracy);
  const tolerance = Math.min(
    Math.max(accuracy === null ? 0 : accuracy, 0),
    MAX_ACCURACY_TOLERANCE_M,
  );

  if (distanceMeters - tolerance < CHARGE_RADIUS_M) {
    return { type: "inRange", distanceMeters };
  }

  return { type: "outOfRange", distanceMeters };
};

module.exports = {
  CHARGE_RADIUS_M,
  MAX_ACCURACY_TOLERANCE_M,
  getDeviceCoordinates,
  getDistanceMeters,
  getProximityDecision,
};
