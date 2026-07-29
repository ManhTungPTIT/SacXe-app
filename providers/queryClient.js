import { QueryClient, focusManager } from "@tanstack/react-query";
import { AppState } from "react-native";

export const queryClient = new QueryClient();

// React Query dựa vào sự kiện focus của trình duyệt, thứ không tồn tại trong
// React Native — thiếu cầu nối này thì refetchOnWindowFocus không bao giờ chạy,
// và dữ liệu đổi lúc app nằm dưới nền (admin duyệt cộng tiền, phiên sạc trừ
// tiền) chỉ hiện ra khi mở lại app từ đầu.
AppState.addEventListener("change", (status) => {
  focusManager.setFocused(status === "active");
});
