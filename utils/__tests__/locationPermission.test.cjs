const assert = require("node:assert/strict");
const test = require("node:test");

const {
  decideNextAction,
  resolveStatusAfterAsk,
  resolveStatusWithoutAsking,
} = require("../locationPermission");

test("đã được cấp quyền thì không hỏi lại hệ điều hành", () => {
  assert.equal(
    decideNextAction({ status: "granted", granted: true, canAskAgain: true }),
    "granted",
  );
});

test("chưa từng hỏi (undetermined) thì phải hỏi", () => {
  assert.equal(
    decideNextAction({
      status: "undetermined",
      granted: false,
      canAskAgain: true,
    }),
    "ask",
  );
});

// Đây là ca gây ra lỗi "cài app mới, đăng nhập xong, vào Home mà không hiện
// popup xin quyền". Android trả về đúng bộ giá trị này khi cờ didAsk của Expo
// bị Auto Backup mang từ bản cài trước sang, trong khi hệ điều hành thì chưa
// từng hỏi lần nào. Bản cũ thấy canAskAgain === false là trả "blocked" luôn và
// KHÔNG BAO GIỜ gọi requestForegroundPermissionsAsync().
test("denied + canAskAgain false vẫn phải hỏi, không được tự kết luận bị chặn", () => {
  assert.equal(
    decideNextAction({ status: "denied", granted: false, canAskAgain: false }),
    "ask",
  );
});

test("phản hồi rỗng / hỏng thì hỏi, không im lặng bỏ qua", () => {
  assert.equal(decideNextAction(undefined), "ask");
  assert.equal(decideNextAction(null), "ask");
  assert.equal(decideNextAction({}), "ask");
});

test("granted phải đúng boolean true, không nhận giá trị truthy khác", () => {
  assert.equal(decideNextAction({ granted: "true" }), "ask");
  assert.equal(decideNextAction({ granted: 1 }), "ask");
});

test("sau khi hỏi: được cấp -> granted", () => {
  assert.equal(
    resolveStatusAfterAsk({ granted: true, canAskAgain: false }),
    "granted",
  );
});

test("sau khi hỏi: từ chối và không hỏi lại được -> blocked", () => {
  assert.equal(
    resolveStatusAfterAsk({ granted: false, canAskAgain: false }),
    "blocked",
  );
});

test("sau khi hỏi: từ chối nhưng còn hỏi lại được -> denied", () => {
  assert.equal(
    resolveStatusAfterAsk({ granted: false, canAskAgain: true }),
    "denied",
  );
});

test("đọc trạng thái mà không hỏi: phân loại đủ ba mức", () => {
  assert.equal(resolveStatusWithoutAsking({ granted: true }), "granted");
  assert.equal(
    resolveStatusWithoutAsking({ granted: false, canAskAgain: false }),
    "blocked",
  );
  assert.equal(
    resolveStatusWithoutAsking({ granted: false, canAskAgain: true }),
    "denied",
  );
});
