// Ba quyết định dùng chung cho MỌI quyền của hệ điều hành. Thuần JavaScript,
// không chạm expo-*, để test được bằng `node --test`.
//
// Trước đây ba hàm này tồn tại thành hai bản sao y hệt ở utils/locationPermission.js
// và utils/notificationPermission.js. Khi cần thêm camera và thư viện ảnh
// (spec 2026-08-19-permission-settings-screen-design.md §3) thì bản thứ ba là
// lúc phải dừng lại — luật ở đây đắt và tinh vi, ba bản trôi khỏi nhau là hỏng
// theo cách rất khó thấy.
//
// Phần ghi chú vì sao KHÔNG được dùng `canAskAgain` để bỏ qua lời hỏi vẫn nằm ở
// đầu utils/locationPermission.js: đó là kiến thức về hành vi Android và về cờ
// didAsk của Expo, gắn với câu chuyện đã xảy ra, không gắn với ba hàm này.
//
// Tóm tắt luật, đủ để không phá:
//   - `decideNextAction` cố ý CHỈ nhìn `granted`. Mọi trạng thái chưa được cấp
//     đều dẫn tới hỏi, kể cả khi hệ điều hành khai là không hỏi lại được nữa.
//   - `canAskAgain` chỉ dùng để chọn thông điệp hiển thị, không bao giờ dùng để
//     bỏ qua lời hỏi.

// Hành động kế tiếp sau khi ĐỌC quyền hiện tại.
//   "granted" - đã có quyền, khỏi làm gì thêm
//   "ask"     - phải gọi xuống hệ điều hành
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

// Trạng thái hiển thị suy ra từ lần ĐỌC quyền, dùng cho màn chỉ muốn biết đang
// có quyền hay không mà không được phép hiện hộp thoại. Không hỏi, nên vẫn phải
// chấp nhận `canAskAgain` mơ hồ.
const resolveStatusWithoutAsking = (current) => {
  if (current?.granted === true) return "granted";
  return current?.canAskAgain === false ? "blocked" : "denied";
};

module.exports = {
  decideNextAction,
  resolveStatusAfterAsk,
  resolveStatusWithoutAsking,
};
