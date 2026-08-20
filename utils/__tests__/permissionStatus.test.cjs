const assert = require("node:assert/strict");
const test = require("node:test");

const permissionStatus = require("../permissionStatus");
const locationPermission = require("../locationPermission");
const notificationPermission = require("../notificationPermission");

// Giá trị của việc gộp ba bản sao nằm ở đúng chỗ này: nếu ai đó chép lại một
// bản riêng vào locationPermission hoặc notificationPermission, test này đỏ
// ngay. Các ca biên chi tiết đã được locationPermission.test.cjs và
// notificationPermission.test.cjs phủ — không chép lại ở đây.
test("hai file quyền dùng ĐÚNG hàm của permissionStatus, không phải bản chép", () => {
  for (const name of [
    "decideNextAction",
    "resolveStatusAfterAsk",
    "resolveStatusWithoutAsking",
  ]) {
    assert.equal(
      locationPermission[name],
      permissionStatus[name],
      `locationPermission.${name} không còn trỏ về permissionStatus`,
    );
    assert.equal(
      notificationPermission[name],
      permissionStatus[name],
      `notificationPermission.${name} không còn trỏ về permissionStatus`,
    );
  }
});

test("xuất đúng ba hàm, không thừa không thiếu", () => {
  assert.deepEqual(Object.keys(permissionStatus).sort(), [
    "decideNextAction",
    "resolveStatusAfterAsk",
    "resolveStatusWithoutAsking",
  ]);
});
