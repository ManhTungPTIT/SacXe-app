import { Platform } from "react-native";

// Bộ prop dùng chung cho các danh sách cuộn dài (lịch sử sạc, lịch sử tài khoản
// sạc). React Native không có prop "độ nhạy cuộn"; hai thứ thật sự đổi được cảm
// giác vuốt là quán tính và việc khoá trục.
export const SCROLL_FEEL = {
  // Android mặc định giảm tốc 0.985, cú vuốt tắt gần như ngay khi nhấc tay nên
  // phải vuốt nhiều lần mới đi hết danh sách. 0.995 cho quán tính trôi dài hơn,
  // gần với iOS (mặc định "normal" = 0.998, giữ nguyên).
  decelerationRate: Platform.OS === "android" ? 0.995 : "normal",
  // Cú vuốt hiếm khi thẳng đứng tuyệt đối. Khoá trục ngay khi bắt đầu kéo để
  // phần lệch ngang không bị tính vào việc chọn hướng gesture.
  directionalLockEnabled: true,
};
