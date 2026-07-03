import { useMutation, useQueryClient } from "@tanstack/react-query";
import { chargeApi } from "../api/charge.api";

export const useChargeQuery = {
  useInitiate: () => {
    const queryClient = useQueryClient();
    const { mutate, ...rest } = useMutation({
      mutationFn: (data) => chargeApi.initiate(data),
      onSuccess: (data) => {
        queryClient.invalidateQueries(["CURRENT_CHARGE_SESSION", data]);
      },
      onError: (error) => {
        console.error("Error initiating charge session:", error);
      },
    });
    return { mutate, ...rest };
  },
  useTerminate: () => {
    const queryClient = useQueryClient();
    const { mutate, ...rest } = useMutation({
      mutationFn: () => chargeApi.terminate(),
      onSuccess: (data) => {
        queryClient.invalidateQueries(["CURRENT_CHARGE_SESSION"]);
      },
      onError: (error) => {
        const errorMessage = error?.response?.data?.message || "";
        if (errorMessage.includes("Xe chưa đang")) {
          return;
        }

        console.error("Error terminating charge session:", error);
      },
    });
    return { mutate, ...rest };
  },
};
