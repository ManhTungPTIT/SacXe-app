// Quyết định luồng xin quyền thông báo. Thuần JavaScript, không chạm
// expo-notifications, để kiểm thử được bằng `node --test`. Phần nối với hệ điều
// hành nằm ở services/notification.service.js.
//
// Luật lõi giống hệt utils/locationPermission.js, vì cùng một cạm bẫy của
// Android: `canAskAgain` là false CẢ KHI quyền chưa từng được hỏi, và cờ
// `didAsk` mà Expo dùng để phân biệt thì không đáng tin (android:allowBackup
// ="true" khiến Google Auto Backup mang prefs của bản cài trước sang máy vừa
// cài mới). Phần giải thích đầy đủ nằm ở đầu locationPermission.js — không
// chép lại ở đây để hai bản không trôi khỏi nhau.
//
// Hệ quả cho file này: KHÔNG BAO GIỜ dùng `canAskAgain` để bỏ qua lời hỏi.
// Nó chỉ dùng để chọn thông điệp SAU KHI đã có kết quả.
//
// VÌ SAO CẦN CẢ PHẦN "PROMPT": thông báo là quyền duy nhất trong app không có
// đường thoát khi bị từ chối. Camera, vị trí, thư viện ảnh đều mời người dùng
// vào Cài đặt (QrScanScreen.js, HomeScreen.js, BikeRegistration.js), còn
// registerForPushNotificationsAsync chỉ `return null` im lặng. Người lỡ bấm
// "Không cho phép" một lần sẽ vĩnh viễn không nhận được thông báo phiên sạc và
// không có cách nào biết vì sao.

// Ba hàm quyết định dùng chung cho cả bốn quyền, nằm ở utils/permissionStatus.js.
// Re-export ở đây để chỗ gọi không phải đổi.
//
// Riêng với thông báo, `resolveStatusAfterAsk` trả "blocked" là ca thường gặp
// nhất trên iOS: hệ điều hành chỉ hỏi một lần trong đời bản cài.
const permissionStatus = require("./permissionStatus");

const {
  decideNextAction,
  resolveStatusAfterAsk,
  resolveStatusWithoutAsking,
} = permissionStatus;

const ASK_PROMPT = {
  status: "denied",
  action: "ask",
  actionLabel: "Cho phép thông báo",
  title: "Chưa bật thông báo",
  body: "Bật thông báo để nhận cảnh báo khi phiên sạc bắt đầu, kết thúc hoặc gặp sự cố.",
};

const SETTINGS_PROMPT = {
  status: "blocked",
  action: "settings",
  actionLabel: "Mở Cài đặt",
  title: "Thông báo đang bị tắt",
  body: "Thiết bị đã chặn thông báo của ứng dụng nên không thể hỏi lại từ trong app. Vào Cài đặt để bật lại.",
};

// Nội dung lời mời tương ứng với trạng thái quyền. null = đã có quyền, không
// hiện gì.
//
// Trạng thái lạ (lỗi đọc quyền, giá trị thiếu) rơi về lời mời hỏi lại chứ không
// rơi về null: hiện thừa một lời mời chỉ hơi phiền, còn ẩn đi thì người dùng
// ngồi chờ thông báo không bao giờ tới mà không hiểu vì sao.
const resolveNotificationPrompt = (status) => {
  if (status === "granted") return null;
  return status === "blocked" ? SETTINGS_PROMPT : ASK_PROMPT;
};

module.exports = {
  decideNextAction,
  resolveStatusAfterAsk,
  resolveStatusWithoutAsking,
  resolveNotificationPrompt,
};
