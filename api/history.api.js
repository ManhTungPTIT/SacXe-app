import { api } from "./client";

export const historyApi = {
  getHistory: ({ page, limit }) => {
    return api.get(`/api/history/get?page=${page}&limit=${limit}`);
  },
  getLatestHistory: () => {
    return api.get("/api/history/get-latest");
  },
  getActiveSessions: () => {
    return api.get("/api/history/active");
  },
};
