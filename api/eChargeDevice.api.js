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
  // Bỏ trường nào thì trường đó giữ nguyên: sửa mỗi địa chỉ không được đụng tới
  // toạ độ, và ngược lại (xem utils/deviceLocationPatch.js phía backend).
  updateMyDevice: async ({ deviceCode, name, address, latitude, longitude }) => {
    return await api.patch("/api/e-charge-device/my-device", {
      deviceCode,
      name,
      address,
      latitude,
      longitude,
    });
  },
  unclaimDevice: async ({ deviceCode }) => {
    return await api.delete("/api/e-charge-device/claim", {
      data: { deviceCode },
    });
  },
};

export default eChargeDeviceApi;
