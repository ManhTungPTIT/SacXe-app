import { io } from "socket.io-client";
const SOCKET_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

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
