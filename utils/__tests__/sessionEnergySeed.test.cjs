const assert = require("node:assert/strict");
const test = require("node:test");

const {
  resolveSessionSeedEnergyKwh,
  resolveSessionKey,
  isNewSession,
} = require("../sessionEnergySeed");

// --- seed năng lượng ----------------------------------------------------------

// Ca gốc của lỗi: người dùng vừa bấm sạc, màn phiên sạc đã bật lên nhưng cache
// ["latestHistory"] còn là phiên TRƯỚC (đã chốt, 1.59 kWh). Seed phải là 0 —
// phiên mới bắt đầu từ đầu.
test("phiên đã chốt không được dùng làm seed", () => {
  assert.equal(
    resolveSessionSeedEnergyKwh({
      _id: "cu",
      lastKnownEnergy: 1.59,
      energy: 1.59,
      totalTime: { hours: 0, minutes: 1 },
    }),
    0,
  );
});

test("phiên client tự đánh dấu đã dừng cũng không dùng làm seed", () => {
  assert.equal(
    resolveSessionSeedEnergyKwh({
      _id: "cu",
      lastKnownEnergy: 2.54,
      clientSessionStopped: true,
    }),
    0,
  );
});

test("phiên đang chạy thì seed bằng lastKnownEnergy", () => {
  assert.equal(
    resolveSessionSeedEnergyKwh({ _id: "moi", lastKnownEnergy: 0.095 }),
    0.095,
  );
});

test("thiếu lastKnownEnergy thì rơi về energy", () => {
  assert.equal(resolveSessionSeedEnergyKwh({ _id: "moi", energy: 0.3 }), 0.3);
});

test("không có phiên / dữ liệu hỏng thì seed 0, không trả NaN", () => {
  assert.equal(resolveSessionSeedEnergyKwh(null), 0);
  assert.equal(resolveSessionSeedEnergyKwh(undefined), 0);
  assert.equal(resolveSessionSeedEnergyKwh({}), 0);
  assert.equal(resolveSessionSeedEnergyKwh({ lastKnownEnergy: "hỏng" }), 0);
});

test("giá trị âm bị kẹp về 0", () => {
  assert.equal(resolveSessionSeedEnergyKwh({ lastKnownEnergy: -5 }), 0);
});

// --- khoá phiên ---------------------------------------------------------------

test("khoá phiên lấy từ _id, chuẩn hoá về chuỗi", () => {
  assert.equal(resolveSessionKey({ _id: "abc" }), "abc");
  assert.equal(resolveSessionKey({ _id: 123 }), "123");
});

test("chưa có phiên thì khoá là null", () => {
  assert.equal(resolveSessionKey(null), null);
  assert.equal(resolveSessionKey({}), null);
});

test("đổi _id là đổi phiên", () => {
  assert.equal(isNewSession("cu", "moi"), true);
  assert.equal(isNewSession("cu", "cu"), false);
});

// Vào thẳng một phiên từ trạng thái chưa có phiên nào cũng là đổi phiên: phải
// reset chứ không lấy max với giá trị còn sót của lần sạc trước.
test("từ không có phiên sang có phiên cũng tính là đổi phiên", () => {
  assert.equal(isNewSession(null, "moi"), true);
  assert.equal(isNewSession("cu", null), true);
  assert.equal(isNewSession(null, null), false);
});
