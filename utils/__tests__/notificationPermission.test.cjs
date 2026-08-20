const assert = require("node:assert/strict");
const test = require("node:test");

const {
  decideNextAction,
  resolveStatusAfterAsk,
  resolveStatusWithoutAsking,
  resolveNotificationPrompt,
} = require("../notificationPermission");

// Luật giống hệt quyền vị trí, và vì đúng một lý do: trên Android
// `canAskAgain` là false CẢ KHI quyền chưa từng được hỏi. Xem phần đầu
// utils/locationPermission.js để biết vì sao cờ didAsk của Expo không đáng tin
// (android:allowBackup="true" + Google Auto Backup). Dùng nó để BỎ QUA lời hỏi
// là cách chắc chắn để app im lặng không bao giờ hiện hộp thoại.
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

// Đây là ca của iOS: hệ điều hành chỉ hỏi đúng một lần trong đời bản cài. Từ
// chối xong là mọi lời gọi requestPermissionsAsync sau đó trả về ngay, không
// hiện gì — lối ra duy nhất là trang Cài đặt.
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

test("chỉ đọc quyền: granted -> granted", () => {
  assert.equal(
    resolveStatusWithoutAsking({ granted: true, canAskAgain: false }),
    "granted",
  );
});

test("chỉ đọc quyền: chưa cấp thì phân biệt blocked/denied theo canAskAgain", () => {
  assert.equal(
    resolveStatusWithoutAsking({ granted: false, canAskAgain: false }),
    "blocked",
  );
  assert.equal(
    resolveStatusWithoutAsking({ granted: false, canAskAgain: true }),
    "denied",
  );
});

// --- Nội dung hiển thị ---------------------------------------------------

test("đã có quyền thì không hiện gì cả", () => {
  assert.equal(resolveNotificationPrompt("granted"), null);
});

// Còn hỏi lại được -> nút bấm phải gọi thẳng hộp thoại hệ điều hành, đừng đá
// người dùng sang Cài đặt khi chưa cần.
test("denied -> mời cấp quyền ngay trong app", () => {
  const prompt = resolveNotificationPrompt("denied");
  assert.equal(prompt.action, "ask");
  assert.equal(prompt.actionLabel, "Cho phép thông báo");
  assert.ok(prompt.title.length > 0);
  assert.ok(prompt.body.length > 0);
});

test("blocked -> mời vào Cài đặt vì hệ điều hành không hỏi nữa", () => {
  const prompt = resolveNotificationPrompt("blocked");
  assert.equal(prompt.action, "settings");
  assert.equal(prompt.actionLabel, "Mở Cài đặt");
  assert.ok(prompt.title.length > 0);
  assert.ok(prompt.body.length > 0);
});

// Không biết trạng thái thì thà hiện thừa một lời mời còn hơn để người dùng
// ngồi chờ thông báo không bao giờ tới mà không hiểu vì sao — đây chính là tình
// trạng hiện tại của app.
test("trạng thái lạ hoặc thiếu -> vẫn cho một lối ra, mặc định là hỏi", () => {
  assert.equal(resolveNotificationPrompt(undefined).action, "ask");
  assert.equal(resolveNotificationPrompt(null).action, "ask");
  assert.equal(resolveNotificationPrompt("error").action, "ask");
  assert.equal(resolveNotificationPrompt("").action, "ask");
});
