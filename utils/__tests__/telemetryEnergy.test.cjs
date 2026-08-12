const assert = require("node:assert/strict");
const test = require("node:test");

const {
  getTelemetryEnergyKwh,
  readTelemetryEnergyKwh,
} = require("../telemetryEnergy");

// Gói thật đo được từ trụ plug_AB2860 lúc 11:32 ngày 11/08/2026.
const REAL_PACKET = {
  device_id: "plug_AB2860",
  voltage: 213.3,
  current: 0.231,
  power: 42.81,
  pf_counter: 8423,
  energy: 0.022,
};

// Ca gốc của lỗi "điện năng luôn hiển thị 0 kWh": bản cũ chia thêm 1000 nên
// 0.022 kWh thành 0.000022 kWh, làm tròn 3 chữ số ra "0.000".
test("đọc energy đúng kWh, không chia thêm 1000", () => {
  assert.equal(getTelemetryEnergyKwh(REAL_PACKET), 0.022);
});

test("giá trị lớn giữ nguyên thang đo", () => {
  assert.equal(getTelemetryEnergyKwh({ energy: 2.718 }), 2.718);
});

test("thiếu / hỏng trường energy trả 0, không trả NaN", () => {
  assert.equal(getTelemetryEnergyKwh({}), 0);
  assert.equal(getTelemetryEnergyKwh({ energy: null }), 0);
  assert.equal(getTelemetryEnergyKwh({ energy: "hỏng" }), 0);
  assert.equal(getTelemetryEnergyKwh(undefined), 0);
});

// readTelemetryEnergyKwh: phân biệt "gói không mang số liệu" với "0 kWh".
test("gói không mang số liệu trả null, không trả 0", () => {
  assert.equal(readTelemetryEnergyKwh({}), null);
  assert.equal(readTelemetryEnergyKwh({ energy: null }), null);
  assert.equal(readTelemetryEnergyKwh({ energy: "" }), null);
  assert.equal(readTelemetryEnergyKwh({ energy: "hỏng" }), null);
  assert.equal(readTelemetryEnergyKwh(undefined), null);
});

test("gói báo đúng 0 kWh trả 0, khác hẳn null", () => {
  assert.equal(readTelemetryEnergyKwh({ energy: 0 }), 0);
  assert.equal(readTelemetryEnergyKwh({ energy: "0" }), 0);
});

test("đọc được giá trị thật", () => {
  assert.equal(readTelemetryEnergyKwh(REAL_PACKET), 0.022);
  assert.equal(readTelemetryEnergyKwh({ energy: "1.5" }), 1.5);
});
