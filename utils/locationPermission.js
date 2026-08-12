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

// Hành động kế tiếp sau khi ĐỌC quyền hiện tại.
//   "granted" - đã có quyền, khỏi làm gì thêm
//   "ask"     - phải gọi xuống hệ điều hành
//
// Cố ý chỉ nhìn `granted`: mọi trạng thái chưa được cấp đều dẫn tới hỏi, kể cả
// khi hệ điều hành khai là không hỏi lại được nữa.
const decideNextAction = (current) =>
  current?.granted === true ? "granted" : "ask";

// Ánh xạ kết quả SAU KHI đã hỏi thành trạng thái app dùng để hiển thị.
//   "granted" - được cấp
//   "blocked" - bị từ chối và không hỏi lại được -> phải mời vào Cài đặt
//   "denied"  - bị từ chối nhưng còn hỏi lại được -> cho thử lại tại chỗ
//
// Ở đây `canAskAgain === false` mới thực sự có nghĩa, vì ta vừa hỏi xong.
const resolveStatusAfterAsk = (requested) => {
  if (requested?.granted === true) return "granted";
  return requested?.canAskAgain === false ? "blocked" : "denied";
};

// Trạng thái hiển thị suy ra từ lần ĐỌC quyền, dùng cho các màn chỉ muốn biết
// đang có quyền hay không mà không được phép hiện hộp thoại (ví dụ màn quét QR
// — xem spec 2026-08-05). Không hỏi, nên vẫn phải chấp nhận `canAskAgain` mơ hồ.
const resolveStatusWithoutAsking = (current) => {
  if (current?.granted === true) return "granted";
  return current?.canAskAgain === false ? "blocked" : "denied";
};

module.exports = {
  decideNextAction,
  resolveStatusAfterAsk,
  resolveStatusWithoutAsking,
};
