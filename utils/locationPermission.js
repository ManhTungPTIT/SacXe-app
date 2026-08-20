// Quyết định luồng xin quyền vị trí. Thuần JavaScript, không chạm expo-location,
// để kiểm thử được bằng `node --test`. Phần nối với hệ điều hành nằm ở
// services/location.service.js.
//
// VÌ SAO CẦN TÁCH RA: bản cũ tự bỏ cuộc trước khi kịp hỏi hệ điều hành. Nó đọc
// quyền hiện tại rồi làm:
//
//     if (current.canAskAgain === false) return "blocked";   // ← không bao giờ hỏi
//
// Trên Android, `canAskAgain` chính là `shouldShowRequestPermissionRationale()`,
// và hàm đó trả false trong HAI tình huống khác hẳn nhau:
//
//   1. Người dùng đã từ chối kèm "Đừng hỏi lại"  -> chặn thật.
//   2. Quyền CHƯA TỪNG được hỏi trong bản cài này -> cũng false.
//
// Expo cố phân biệt hai ca đó bằng cờ `didAsk` lưu trong SharedPreferences
// `expo.modules.permissions.asked` (PermissionsService.kt:232). Cờ đó không
// đáng tin:
//
//   - `android:allowBackup="true"` khiến Google Auto Backup khôi phục nguyên
//     file prefs khi cài lại app, mang theo `didAsk = true` của bản cài trước.
//     Máy vừa cài mới nhưng OS thì chưa từng hỏi -> status "denied" +
//     canAskAgain false -> app tưởng bị chặn vĩnh viễn.
//   - PermissionsService.kt:256 ghi `didAsk = true` TRƯỚC khi hiện hộp thoại,
//     nên một lần request thất bại không hiện được gì cũng đóng latch luôn.
//
// Cách gỡ: không bao giờ dùng `canAskAgain` để BỎ QUA lời hỏi. Chưa được cấp
// quyền thì cứ hỏi. Nếu bị chặn thật, hệ điều hành trả về denied ngay lập tức
// và không hiện gì cả — không mất gì. `canAskAgain` chỉ còn dùng để chọn thông
// điệp hiển thị SAU KHI kết quả trả về là bị từ chối.

// Ba hàm quyết định nằm ở utils/permissionStatus.js — dùng chung cho cả bốn
// quyền. Re-export ở đây để mọi chỗ đang import từ file này không phải đổi, và
// để phần ghi chú dài phía trên vẫn nằm cạnh nơi người đọc đi tìm nó.
//
//   decideNextAction(current)           -> "granted" | "ask"
//   resolveStatusAfterAsk(requested)    -> "granted" | "blocked" | "denied"
//   resolveStatusWithoutAsking(current) -> "granted" | "blocked" | "denied"
//
// `resolveStatusWithoutAsking` là hàm màn quét QR dùng (spec 2026-08-05): chỉ
// đọc, không được phép hiện hộp thoại.
const permissionStatus = require("./permissionStatus");

module.exports = {
  decideNextAction: permissionStatus.decideNextAction,
  resolveStatusAfterAsk: permissionStatus.resolveStatusAfterAsk,
  resolveStatusWithoutAsking: permissionStatus.resolveStatusWithoutAsking,
};
