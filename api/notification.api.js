import { api } from "./client";

export const notificationApi = {
  registerPushToken: async (token) => {
    try {
      return api.post("/api/user/push-token", { expoPushToken: token });
    } catch (error) {
      throw error;
    }
  },
  getNotifications: async () => {
    try {
      const response = await api.get("/api/notification/get-notifications");
      return response;
    } catch (error) {
      throw error;
    }
  },
  markAsRead: async (notificationId) => {
    try {
      return api.patch(`/api/notification/${notificationId}/read`);
    } catch (error) {
      throw error;
    }
  },

  removePushToken: async () => {
    return api.delete("/api/user/push-token");
  },
};
