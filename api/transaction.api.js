import { api } from "./client";

export const transactionApi = {
  generateQR: async (amount) => {
    return api.post("/api/payment/generate-qr", {
      amount: amount,
    });
  },
  getTransactionHistory: async (status) => {
    return api.get("/api/payment/history", {
      params: { status },
    });
  },
};
