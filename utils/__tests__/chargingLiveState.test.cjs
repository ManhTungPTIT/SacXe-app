const test = require("node:test");
const assert = require("node:assert/strict");

const { isChargingLive, hasTelemetrySignal } = require("../chargingLiveState");

// Ca gốc của lỗi: phiên nhà dân bật bằng tay ở trụ. Backend chưa gửi lệnh nào
// nên phần cứng báo relay = 0, trong khi vẫn đẩy công suất thật.
test("nhà dân bật tay: relay=0 nhưng có công suất -> đang sạc", () => {
  assert.equal(isChargingLive({ relay: 0, powerWatts: 65000 }), true);
});

test("relay=1 mà công suất tạm về 0 -> vẫn đang sạc, không nhấp nháy", () => {
  assert.equal(isChargingLive({ relay: 1, powerWatts: 0 }), true);
});

test("relay=0 và không có công suất -> chưa sạc", () => {
  assert.equal(isChargingLive({ relay: 0, powerWatts: 0 }), false);
});

test("gói không mang trường relay: suy từ công suất", () => {
  assert.equal(isChargingLive({ powerWatts: 120 }), true);
  assert.equal(isChargingLive({ powerWatts: 0 }), false);
  assert.equal(isChargingLive({ relay: null, powerWatts: 120 }), true);
});

test("giá trị rác không làm hàm ném lỗi hay trả bừa", () => {
  assert.equal(isChargingLive({ relay: "x", powerWatts: "y" }), false);
  assert.equal(isChargingLive({}), false);
  assert.equal(isChargingLive(), false);
  assert.equal(isChargingLive({ relay: "1", powerWatts: null }), true);
});

// Công suất âm là dữ liệu hỏng, không phải bằng chứng đang sạc.
test("công suất âm không tính là đang sạc", () => {
  assert.equal(isChargingLive({ relay: 0, powerWatts: -50 }), false);
});

// --- Tín hiệu: câu hỏi hoàn toàn khác với "có đang sạc không" ---

test("đã có điểm công suất là đã có tín hiệu, kể cả điểm đó bằng 0", () => {
  assert.equal(hasTelemetrySignal({ powerSeries: [0] }), true);
  assert.equal(hasTelemetrySignal({ powerSeries: [0, 65000, 0] }), true);
});

test("chưa có điểm nào -> chưa có tín hiệu", () => {
  assert.equal(hasTelemetrySignal({ powerSeries: [] }), false);
  assert.equal(hasTelemetrySignal({}), false);
  assert.equal(hasTelemetrySignal(), false);
});
