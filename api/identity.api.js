import { api } from "./client";

export const identityApi = {
  extractRegistrationInfo: (data) => {
    const formData = new FormData();

    formData.append("file", data.file);

    return api.post("/api/identity/extract-registration-info", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },
};
