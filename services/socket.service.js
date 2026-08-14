import { io } from "socket.io-client";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";

const SOCKET_URL = Constants.expoConfig?.extra?.apiUrl || "http://localhost:3000";

const ACCESS_TOKEN_KEY = "access_token";

// PHẢI nối vào namespace "/mobile", KHÔNG phải namespace gốc "/".
//
// Backend đăng ký hai handler `telemetry_data` với hai giao thức khác nhau:
//   - /mobile (configs/socket/mobile.namespace.js): không tham số, server tự
//     suy userId từ JWT rồi tự tìm mọi phiên đang sạc để join room.
//   - /        (configs/socket/legacy.namespace.js): @deprecated, ĐÒI tham số
//     room id; nhận undefined là `return` ngay, không join gì cả.
//
// App đã chuyển sang gọi `socket.emit("telemetry_data")` không tham số. Nối vào
// namespace gốc thì lời gọi đó rơi vào nhánh `return` của handler cũ -> socket
// không bao giờ vào room telemetry -> app không nhận được `wave_data` -> màn
// "đang tìm thiết bị" hết giờ sau DEVICE_CHECK_TIMEOUT_MS (16s) và tự gọi dừng
// sạc. Nhìn từ ngoài y hệt "bấm sạc không tạo được phiên", trong khi backend đã
// tạo History đúng và phần cứng đã báo có thiết bị.
//
// Mọi sự kiện khác vẫn tới nơi: socketStore phát song song sang cả /mobile lẫn
// namespace gốc, và /mobile tự `socket.join(userId)` lúc kết nối nên
// emitToUser (charge_billing_update, thông báo, giao dịch...) vẫn nhận đủ.
export const socket = io(`${SOCKET_URL}/mobile`, {
  transports: ["websocket"],
  autoConnect: false,
  // Dạng hàm, không phải object tĩnh: socket.io gọi lại ở MỖI lần kết nối/kết
  // nối lại. Access token sống ngắn và được xoay bởi interceptor refresh trong
  // api/client.js — chụp một lần lúc load module thì sau khi xoay, mọi lần
  // reconnect đều mang token đã hết hạn và bị middleware authUser từ chối.
  auth: (cb) => {
    SecureStore.getItemAsync(ACCESS_TOKEN_KEY)
      .then((token) => cb({ token }))
      .catch(() => cb({}));
  },
});

export const connectSocket = () => {
  if (!socket.connected) {
    socket.connect();
  }
};

export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
  }
};

export const joinRoom = (roomId) => {
  socket.emit("join_room", roomId);
};
