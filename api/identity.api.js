import { api } from "./client";

export const identityApi = {
  extractCardIdInfo: (data) => {
    const formData = new FormData();

    formData.append("frontCard", data.frontCardImage);
    formData.append("backCard", data.backCardImage);
    return api.post("/api/identity/extract-card-id-info", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },
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
