const assert = require("node:assert/strict");
const test = require("node:test");

const { getLocationChangeDecision } = require("../deviceLocationChange");
const { CHARGE_RADIUS_M, MAX_ACCURACY_TOLERANCE_M } = require("../proximity");

// Một độ vĩ tuyến trên hình cầu bán kính 6371008.8m — cùng hằng số mà
// proximity.test.cjs dùng, để dịch chuyển thuần theo vĩ độ cho ra khoảng cách
// biết trước chính xác.
const METERS_PER_DEGREE_LAT = 111194.93;

const DEVICE = {
  deviceCode: "plug_AB2860",
  latitude: 21.0285,
  longitude: 105.8542,
};

// Trụ vừa claim qua QR, chưa ai đặt vị trí bao giờ.
const DEVICE_WITHOUT_COORDINATES = {
  deviceCode: "plug_AB2860",
};

const positionOffsetByMeters = (meters, accuracy = 10) => ({
  latitude: DEVICE.latitude + meters / METERS_PER_DEGREE_LAT,
  longitude: DEVICE.longitude,
  accuracy,
});

test("đứng ngay cạnh trụ thì lưu thẳng, không hỏi gì", () => {
  const decision = getLocationChangeDecision({
    position: positionOffsetByMeters(5),
    device: DEVICE,
  });

  assert.equal(decision.type, "ready");
});

// Ngưỡng dùng lại đúng bán kính của cổng kiểm tra lúc quét QR: lệch quá đó
// nghĩa là chủ trụ vừa tự đẩy mình ra ngoài cổng nhà mình.
test("lệch xa hơn bán kính cổng thì phải xác nhận, kèm số mét", () => {
  const decision = getLocationChangeDecision({
    position: positionOffsetByMeters(150),
    device: DEVICE,
  });

  assert.equal(decision.type, "needsConfirm");
  assert.ok(Math.abs(decision.distanceMeters - 150) < 1);
});

test("lệch trong bán kính cổng thì không cần xác nhận", () => {
  const decision = getLocationChangeDecision({
    position: positionOffsetByMeters(CHARGE_RADIUS_M - 10),
    device: DEVICE,
  });

  assert.equal(decision.type, "ready");
});

// Dưới hầm gửi xe máy chỉ định vị được bằng wifi/cell và báo accuracy hàng trăm
// mét. Ghi một toạ độ như vậy xuống là phá hỏng cổng kiểm tra của chính trụ đó.
test("độ chính xác tệ hơn trần cho phép thì chặn lưu", () => {
  const decision = getLocationChangeDecision({
    position: positionOffsetByMeters(5, MAX_ACCURACY_TOLERANCE_M + 1),
    device: DEVICE,
  });

  assert.equal(decision.type, "tooInaccurate");
  assert.equal(decision.accuracy, MAX_ACCURACY_TOLERANCE_M + 1);
});

test("độ chính xác đúng bằng trần vẫn được lưu", () => {
  const decision = getLocationChangeDecision({
    position: positionOffsetByMeters(5, MAX_ACCURACY_TOLERANCE_M),
    device: DEVICE,
  });

  assert.equal(decision.type, "ready");
});

// Máy không báo accuracy thì không có cơ sở để chặn — chặn ở đây sẽ khoá luôn
// những thiết bị vốn định vị tốt mà chỉ thiếu trường này.
test("thiếu thông tin độ chính xác thì không chặn", () => {
  const decision = getLocationChangeDecision({
    position: { latitude: DEVICE.latitude, longitude: DEVICE.longitude },
    device: DEVICE,
  });

  assert.equal(decision.type, "ready");
});

// Chặn phải xét trước so sánh khoảng cách: một toạ độ sai lệch hàng trăm mét
// vừa gây "needsConfirm" vừa vô nghĩa, hỏi xác nhận là hỏi về một con số rác.
test("độ chính xác tệ được xét trước khoảng cách", () => {
  const decision = getLocationChangeDecision({
    position: positionOffsetByMeters(500, MAX_ACCURACY_TOLERANCE_M + 50),
    device: DEVICE,
  });

  assert.equal(decision.type, "tooInaccurate");
});

test("trụ chưa từng có toạ độ thì không có gì để so, lưu thẳng", () => {
  const decision = getLocationChangeDecision({
    position: positionOffsetByMeters(5000),
    device: DEVICE_WITHOUT_COORDINATES,
  });

  assert.equal(decision.type, "ready");
});

test("không lấy được vị trí thì báo riêng, không coi là lệch xa", () => {
  const decision = getLocationChangeDecision({
    position: null,
    device: DEVICE,
  });

  assert.equal(decision.type, "unknownPosition");
});

test("trụ bọc trong phong bì phản hồi API vẫn đọc được toạ độ", () => {
  const decision = getLocationChangeDecision({
    position: positionOffsetByMeters(150),
    device: { eChargeDevices: DEVICE },
  });

  assert.equal(decision.type, "needsConfirm");
});
