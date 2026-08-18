const assert = require("node:assert/strict");
const test = require("node:test");

const {
  PUBLIC_CHARGE_STEPS,
  resolvePublicChargeStep,
} = require("../publicChargeSteps");

// Ba bước phải khớp ĐÚNG ba nhánh render mà ChargeScreen đang dùng, nếu không
// thanh bước sẽ chỉ vào một bước khác với màn đang hiện:
//   1. BikeRegistration          <- requiresPublicBikeRegistration (!bike)
//   2. InitiateChargeComponent   <- mode "public", chưa có deviceCode
//   3. DevicesComponents         <- đã có deviceCode

test("nhãn ba bước theo đúng thứ tự của luồng công cộng", () => {
  assert.deepEqual(PUBLIC_CHARGE_STEPS, [
    "Giấy tờ xe",
    "Quét mã trụ",
    "Chọn ổ sạc",
  ]);
});

test("chưa có giấy tờ xe -> đang ở bước 1", () => {
  assert.equal(
    resolvePublicChargeStep({ hasBike: false, deviceCode: null }),
    1,
  );
});

// Ca dễ sai nhất: người dùng vừa đăng ký giấy tờ xong thì deviceCode vẫn còn từ
// lần quét trước (state của ChargeScreen không bị xoá khi đổi bước). Giấy tờ là
// điều kiện CHẶN, nên nó phải thắng deviceCode chứ không được nhảy sang bước 3.
test("chưa có giấy tờ thì vẫn là bước 1 dù đã có mã trụ", () => {
  assert.equal(
    resolvePublicChargeStep({ hasBike: false, deviceCode: "plug_94FB9C" }),
    1,
  );
});

test("có giấy tờ, chưa quét trụ -> đang ở bước 2", () => {
  assert.equal(resolvePublicChargeStep({ hasBike: true, deviceCode: null }), 2);
});

test("đã có mã trụ -> đang ở bước 3", () => {
  assert.equal(
    resolvePublicChargeStep({ hasBike: true, deviceCode: "plug_94FB9C" }),
    3,
  );
});

// Mã trụ rỗng/khoảng trắng không phải là đã quét được trụ.
test("mã trụ rỗng không tính là đã quét", () => {
  assert.equal(resolvePublicChargeStep({ hasBike: true, deviceCode: "" }), 2);
  assert.equal(resolvePublicChargeStep({ hasBike: true, deviceCode: "   " }), 2);
});

// Gọi thiếu tham số không được ném lỗi: thanh bước là phần trang trí, hỏng dữ
// liệu đầu vào thì lùi về bước 1 chứ không được làm sập màn hình.
test("thiếu tham số thì lùi về bước 1, không ném lỗi", () => {
  assert.equal(resolvePublicChargeStep(), 1);
  assert.equal(resolvePublicChargeStep({}), 1);
});

// Chọn xong ổ sạc là hết cả ba bước. Trả 4 — một số LỚN HƠN số bước — để
// ChargeStepper đánh dấu bước 3 đã xong (isDone: stepNumber < currentStep) mà
// không phải thêm khái niệm "đã hoàn tất" riêng cho bước cuối.
test("chọn xong ổ sạc -> vượt bước 3, đánh dấu hoàn thành", () => {
  assert.equal(
    resolvePublicChargeStep({
      hasBike: true,
      deviceCode: "plug_94FB9C",
      powerId: "outlet-1",
    }),
    PUBLIC_CHARGE_STEPS.length + 1,
  );
});

// Ổ sạc chỉ tính khi đã thật sự chọn: thiếu mã trụ thì không thể nhảy cóc.
test("có ổ sạc nhưng chưa có mã trụ thì vẫn là bước 2", () => {
  assert.equal(
    resolvePublicChargeStep({
      hasBike: true,
      deviceCode: null,
      powerId: "outlet-1",
    }),
    2,
  );
});

test("chưa có giấy tờ thì ổ sạc cũng không đẩy được bước", () => {
  assert.equal(
    resolvePublicChargeStep({
      hasBike: false,
      deviceCode: "plug_94FB9C",
      powerId: "outlet-1",
    }),
    1,
  );
});

// powerId rỗng/khoảng trắng là chưa chọn ổ — giữ nguyên bước 3 đang đứng.
test("powerId rỗng không tính là đã chọn ổ", () => {
  for (const powerId of ["", "   ", null, undefined]) {
    assert.equal(
      resolvePublicChargeStep({
        hasBike: true,
        deviceCode: "plug_94FB9C",
        powerId,
      }),
      3,
    );
  }
});
