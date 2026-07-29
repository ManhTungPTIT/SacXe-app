import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { transactionApi } from "../api/transaction.api";
import { socket } from "../services/socket.service";
import { useAuthStore } from "../stores/auth.store";

export const useTransactionQuery = {
  generateQR: () => {
    const queryClient = useQueryClient();
    const { mutate, ...rest } = useMutation({
      mutationFn: (data) => transactionApi.generateQR(data),
      onSuccess: (data) => {
        queryClient.invalidateQueries(["CURRENT_TRANSACTION", data]);
        const userId = useAuthStore.getState().user?._id;
        socket.emit("transaction_update", `user_${userId}`);
      },
      onError: (error) => {
        console.error("Error generating QR code:", error);
      },
    });
    return { mutate, ...rest };
  },
  useClaimTransaction: () => {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: (transactionId) =>
        transactionApi.claimTransaction(transactionId),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["TRANSACTION_HISTORY"] });
      },
    });
  },
  useCancelTransaction: () => {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: (transactionId) =>
        transactionApi.cancelTransaction(transactionId),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["TRANSACTION_HISTORY"] });
      },
    });
  },
  useGetTransactionHistory: (status) => {
    const { data, isLoading, isError, ...rest } = useQuery({
      queryKey: ["TRANSACTION_HISTORY", status],
      queryFn: () => transactionApi.getTransactionHistory(status),
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    });
    return { data, isLoading, isError, ...rest };
  },
};
