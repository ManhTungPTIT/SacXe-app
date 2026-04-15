import { io } from "socket.io-client";
import Constants from "expo-constants";

const SOCKET_URL = Constants.expoConfig?.extra?.apiUrl || "http://localhost:3000";

export const socket = io(SOCKET_URL, {
  transports: ["websocket"],
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
