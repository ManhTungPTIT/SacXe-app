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
  claimDevice: async ({ deviceCode }) => {
    return await api.post("/api/e-charge-device/claim", { deviceCode });
  },
  getMyDevices: async () => {
    return await api.get("/api/e-charge-device/my-devices");
  },
  unclaimDevice: async ({ deviceCode }) => {
    return await api.delete("/api/e-charge-device/claim", {
      data: { deviceCode },
    });
  },
};

export default eChargeDeviceApi;
