import { api } from "./client";

export const feedbackApi = {
  createFeedback: (data) => {
    const formData = new FormData();

    formData.append("deviceCode", data.deviceCode);
    formData.append("content", data.content);
    if (data.image) {
      formData.append("image", data.image);
    }
    return api.post("/api/feedback/create", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },
};
