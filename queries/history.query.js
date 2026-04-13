import { useQuery } from "@tanstack/react-query";
import { historyApi } from "../api/history.api";

export const useHistory = {
  useGetHistory: ({ page, limit }) => {
    return useQuery({
      queryKey: ["history", page, limit],
      queryFn: () => historyApi.getHistory({ page, limit }),
      retry: 3,
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    });
  },
  useGetLatestHistory: () => {
    return useQuery({
      queryKey: ["latestHistory"],
      queryFn: () => historyApi.getLatestHistory(),
      retry: 3,
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    });
  },
};
