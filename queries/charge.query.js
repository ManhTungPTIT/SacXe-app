import { useMutation, useQueryClient } from "@tanstack/react-query";
import { chargeApi } from "../api/charge.api";

export const useChargeQuery = {
  useInitiate: () => {
    const queryClient = useQueryClient();
    const { mutate, ...rest } = useMutation({
      mutationFn: (data) => chargeApi.initiate(data),
      onSuccess: (data) => {
        queryClient.invalidateQueries(["CURRENT_CHARGE_SESSION", data]);
        queryClient.invalidateQueries({ queryKey: ["activeSessions"] });
        queryClient.invalidateQueries({ queryKey: ["latestHistory"] });
      },
    });
    return { mutate, ...rest };
  },
  useTerminate: () => {
    const queryClient = useQueryClient();
    const { mutate, ...rest } = useMutation({
      mutationFn: (data) => chargeApi.terminate(data),
      onSuccess: (data) => {
        queryClient.invalidateQueries(["CURRENT_CHARGE_SESSION"]);
        queryClient.invalidateQueries({ queryKey: ["activeSessions"] });
        queryClient.invalidateQueries({ queryKey: ["latestHistory"] });
      },
      onError: (error) => {
        const errorMessage = error?.response?.data?.message || "";
        if (errorMessage.includes("Xe chưa đang")) {
          return;
        }
      },
    });
    return { mutate, ...rest };
  },
};
