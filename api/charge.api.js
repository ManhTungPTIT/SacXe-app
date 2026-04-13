import { api } from "./client";

export const chargeApi = {
  initiate: async (data) => {
    return api.post("/api/charge/initiate", data);
  },
  terminate: async () => {
    return api.post("/api/charge/terminate");
  },
  getDevices: async ({ deviceCode }) => {
    return api.get("/api/charge/devices", {
      params: {
        deviceCode,
      },
    });
  },
};
