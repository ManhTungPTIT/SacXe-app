import { api } from "./client";

export const chargeApi = {
  initiate: async (data) => {
    return api.post("/api/charge/initiate", data);
  },
  terminate: async ({ historyId } = {}) => {
    return api.post("/api/charge/terminate", { historyId });
  },
  getDevices: async ({ deviceCode }) => {
    return api.get("/api/charge/devices", {
      params: {
        deviceCode,
      },
    });
  },
};
