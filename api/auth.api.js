import { api } from "./client";

export const authApi = {
  register: (data) => {
    return api.post("/api/auth/register", data);
  },
  login: (data) => {
    return api.post("/api/auth/login", data);
  },
  getMe: () => {
    return api.get("/api/auth/me");
  },
  updateProfile: (data) => {
    const isFormData =
      typeof FormData !== "undefined" && data instanceof FormData;

    if (isFormData) {
      return api.put("/api/user/update-info", data, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
    }

    return api.put("/api/user/update-info", data);
  },
  // Gọi khi đăng xuất để invalidate refresh token ở server
  logout: () => {
    return api.post("/api/auth/logout", {
      isDeleteExpoPushToken: true, // Xóa token push khi logout
    });
  },
  deleteAccount: (password) => {
    return api.delete("/api/auth/delete-account", {
      data: { password },
    });
  },
};
