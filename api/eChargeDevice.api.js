import { api } from "./client";

const eChargeDeviceApi = {
  getDevice: async ({ deviceCode }) => {
    return await api.get("/api/e-charge-device/get-by-device-id", {
      params: {
        deviceCode,
      },
    });
  },
  findAllDevices: async ({ latitude, longitude }) => {
    return await api.get("/api/e-charge-device/find-all", {
      params: {
        latitude,
        longitude,
      },
    });
  },
};

export default eChargeDeviceApi;
