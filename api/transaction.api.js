import { api } from "./client";

export const transactionApi = {
  generateQR: async (amount) => {
    return api.post("/api/payment/generate-qr", {
      amount: amount,
    });
  },
  cancelTransaction: async (transactionId) => {
    return api.post(`/api/payment/transactions/${transactionId}/cancel`);
  },
  getTransactionHistory: async (status) => {
    return api.get("/api/payment/history", {
      params: { status },
    });
  },
};
