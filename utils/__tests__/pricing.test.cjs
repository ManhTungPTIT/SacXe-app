const assert = require("node:assert/strict");
const test = require("node:test");

const { getCurrentRateInfo, FLAT_RATE_VND } = require("../pricing");

// Giá điện do admin chung cư đặt, backend chốt vào History.unitPrice lúc mở
// phiên. Màn phiên sạc phải hiển thị ĐÚNG đơn giá đó — trước đây nó in hằng số
// 6000 nên khi admin đổi giá, con số người dùng nhìn thấy khác hẳn số tiền
// thực bị trừ khỏi ví.
test("hiển thị đơn giá của phiên khi backend trả unitPrice", () => {
  const info = getCurrentRateInfo(new Date(), { unitPrice: 4500 });

  assert.equal(info.rate, 4500);
});

// Giá phẳng không có khung giờ -> không hiện badge "Cao điểm"/"Thấp điểm".
test("giá theo phiên không kèm khung giờ", () => {
  const info = getCurrentRateInfo(new Date(), { unitPrice: 4500 });

  assert.equal(info.period, null);
  assert.equal(info.label, null);
});

// Phiên mở trước khi có tính năng chỉnh giá không có unitPrice.
test("thiếu unitPrice giữ nguyên hành vi cũ", () => {
  const info = getCurrentRateInfo(new Date());

  assert.equal(info.rate, FLAT_RATE_VND);
});

test("unitPrice rác rơi về giá mặc định, không hiển thị 0đ", () => {
  for (const badValue of [0, -100, null, NaN, "bốn nghìn rưỡi"]) {
    const info = getCurrentRateInfo(new Date(), { unitPrice: badValue });

    assert.equal(
      info.rate,
      FLAT_RATE_VND,
      `unitPrice = ${String(badValue)} phải rơi về giá mặc định`,
    );
  }
});
