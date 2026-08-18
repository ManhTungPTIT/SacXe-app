const assert = require("node:assert/strict");
const test = require("node:test");

const {
  resolveSessionSeedEnergyKwh,
  resolveSessionStartTime,
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

// --- mốc bắt đầu phiên --------------------------------------------------------

// Cùng một lỗi với seed năng lượng, chỉ khác trường: đồng hồ đếm giờ ở màn phiên
// sạc lấy mốc từ `latestHistory`, mà lúc vừa bấm sạc cache đó còn là phiên
// TRƯỚC. Không chặn thì phiên mới đếm tiếp từ giờ bắt đầu của phiên cũ — người
// dùng thấy đồng hồ "không reset về 0", vào màn đã hơn 1 phút.
test("phiên đã chốt không được dùng làm mốc đếm giờ", () => {
  assert.equal(
    resolveSessionStartTime({
      _id: "cu",
      createdAt: "2026-08-18T03:00:00.000Z",
      totalTime: { hours: 0, minutes: 1 },
    }),
    null,
  );
});

test("phiên client tự đánh dấu đã dừng cũng không dùng làm mốc", () => {
  assert.equal(
    resolveSessionStartTime({
      _id: "cu",
      createdAt: "2026-08-18T03:00:00.000Z",
      clientSessionStopped: true,
    }),
    null,
  );
});

test("phiên đang chạy thì lấy createdAt làm mốc", () => {
  assert.equal(
    resolveSessionStartTime({ _id: "moi", createdAt: "2026-08-18T03:10:00.000Z" }),
    "2026-08-18T03:10:00.000Z",
  );
});

test("startTime (nếu backend có gửi) được ưu tiên hơn createdAt", () => {
  assert.equal(
    resolveSessionStartTime({
      _id: "moi",
      startTime: "2026-08-18T03:09:00.000Z",
      createdAt: "2026-08-18T03:10:00.000Z",
    }),
    "2026-08-18T03:09:00.000Z",
  );
});

test("không có phiên / thiếu mốc thì trả null, không trả undefined", () => {
  assert.equal(resolveSessionStartTime(null), null);
  assert.equal(resolveSessionStartTime(undefined), null);
  assert.equal(resolveSessionStartTime({}), null);
});
