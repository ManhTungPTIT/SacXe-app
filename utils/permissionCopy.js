// Nội dung popup mồi hiện TRƯỚC hộp thoại xin quyền của hệ điều hành. Thuần
// JavaScript, không chạm React Native lẫn expo-constants, để test được bằng
// `node --test`. Phần nối với Alert nằm ở services/permissionPriming.js.
//
// Spec: docs/superpowers/specs/2026-08-19-permission-priming-design.md
//
// VÌ SAO LẤY CHỮ TỪ infoPlist: đó là chữ đã khai với Apple trong app.json. Chép
// tay sang một bảng riêng thì hai bản sẽ trôi khỏi nhau, và bản người dùng đọc
// sẽ khác bản Apple duyệt. Đọc thẳng từ config nghĩa là sửa app.json là hai nơi
// đổi cùng lúc. Android cũng đọc được vì `Constants.expoConfig` là config nhúng
// trong bundle, không phải file riêng của nền tảng.

// BỐN quyền, không phải năm điểm gọi. Camera dùng chung cho quét QR, chụp giấy
// tờ xe và ảnh phản ánh sự cố: expo-camera lẫn expo-image-picker cùng khai
// android.permission.CAMERA (và cùng đọc NSCameraUsageDescription trên iOS), nên
// hệ điều hành chỉ hỏi MỘT lần. Tách camera thành hai khoá ở đây sẽ khiến người
// dùng thấy popup mồi lần thứ hai cho một quyền họ đã cấp.
const PERMISSION_KEYS = {
  LOCATION: "location",
  CAMERA: "camera",
  PHOTO_LIBRARY: "photoLibrary",
  NOTIFICATIONS: "notifications",
};

// Tiêu đề phải tự viết: infoPlist chỉ chứa phần mô tả, không có tiêu đề.
// `body` dự phòng dùng khi không đọc được config — không bao giờ để popup trống.
const PERMISSION_COPY = {
  [PERMISSION_KEYS.LOCATION]: {
    infoPlistKey: "NSLocationWhenInUseUsageDescription",
    title: "Cho phép truy cập vị trí",
    fallbackBody:
      "Ứng dụng sử dụng vị trí của bạn để hiển thị các thiết bị sạc gần đó và hỗ trợ chức năng bản đồ.",
  },
  [PERMISSION_KEYS.CAMERA]: {
    infoPlistKey: "NSCameraUsageDescription",
    title: "Cho phép truy cập camera",
    fallbackBody:
      "Ứng dụng sử dụng camera để quét mã QR khi tương tác với trụ sạc và cung cấp thông tin phản ảnh sự cố sạc.",
  },
  [PERMISSION_KEYS.PHOTO_LIBRARY]: {
    infoPlistKey: "NSPhotoLibraryUsageDescription",
    title: "Cho phép truy cập thư viện ảnh",
    fallbackBody:
      "Ứng dụng cần truy cập thư viện ảnh để bạn chọn và tải lên hình ảnh giấy phép lái xe khi thêm xe vào hệ thống.",
  },
  [PERMISSION_KEYS.NOTIFICATIONS]: {
    infoPlistKey: "NSUserNotificationUsageDescription",
    title: "Cho phép gửi thông báo",
    fallbackBody:
      "Ứng dụng gửi thông báo về trạng thái thanh toán, thông báo trạng thái sạc xe và cảnh báo tài khoản.",
  },
};

// app.json là file người sửa tay: một giá trị sai kiểu hoặc toàn khoảng trắng
// lọt vào đó không được phép biến popup thành "[object Object]" hay ô trống.
const usableText = (value) =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

// Trả { title, body }, hoặc null nếu khoá không thuộc bốn quyền đã biết — để
// chỗ gọi tự quyết định, thay vì bịa ra một nội dung không ai viết.
const resolvePermissionCopy = (key, infoPlist) => {
  const entry = PERMISSION_COPY[key];

  if (!entry) return null;

  return {
    title: entry.title,
    body: usableText(infoPlist?.[entry.infoPlistKey]) || entry.fallbackBody,
  };
};

// Có hiện popup mồi hay không. CHỈ dùng cho việc đó.
//
// TUYỆT ĐỐI không dùng hàm này để bỏ qua lời gọi request(): trên Android
// `canAskAgain` là false cả khi quyền chưa từng được hỏi, và cờ didAsk của Expo
// không đáng tin (android:allowBackup="true" + Google Auto Backup). Lỗi đó đã
// xảy ra một lần với quyền vị trí — xem đầu utils/locationPermission.js.
//
// Đọc trạng thái hỏng thì vẫn mồi: hiện thừa một lời giải thích chỉ hơi phiền,
// còn bỏ qua thì người dùng lại gặp hộp thoại hệ thống không có ngữ cảnh — đúng
// thứ tính năng này sinh ra để tránh.
const shouldPrime = (current) => current?.granted !== true;

module.exports = {
  PERMISSION_KEYS,
  PERMISSION_COPY,
  resolvePermissionCopy,
  shouldPrime,
};
