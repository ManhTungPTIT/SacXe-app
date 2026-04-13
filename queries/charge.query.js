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
        console.error("Error terminating charge session:", error);
      },
    });
    return { mutate, ...rest };
  },
};
