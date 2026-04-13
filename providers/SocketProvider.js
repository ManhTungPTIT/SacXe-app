import { createContext, useEffect } from "react";
import {
  connectSocket,
  disconnectSocket,
  socket,
} from "../services/socket.service";
import { useAuthStore } from "../stores/auth.store";

export const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const userId = useAuthStore((state) => state.user?._id);

  useEffect(() => {
    connectSocket();

    return () => {
      disconnectSocket();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, userId }}>
      {children}
    </SocketContext.Provider>
  );
};
