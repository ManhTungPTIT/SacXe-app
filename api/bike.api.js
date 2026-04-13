import { api } from "./client";

export const bikeApi = {
  registerBike: (data) => {
    const formData = new FormData();

    formData.append("type", data.type);
    formData.append("bikeOwnerName", data.bikeOwnerName);
    formData.append("vehicleRegistrationCard", data.vehicleRegistrationCard);
    formData.append("licensePlate", data.licensePlate);

    return api.post("/api/bike/register", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },
  getMyBike: async () => {
    try {
      const response = await api.get("/api/bike/my-bike");
      return response;
    } catch (error) {
      console.error("API: getMyBike error:", {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
      throw error;
    }
  },
};
