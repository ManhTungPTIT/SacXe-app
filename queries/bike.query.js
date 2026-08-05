import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { bikeApi } from "../api/bike.api";

export const useBike = {
  useRegister: () => {
    const queryClient = useQueryClient();
    const { mutate, ...rest } = useMutation({
      mutationFn: (data) => bikeApi.registerBike(data),
      onSuccess: (data) => {
        queryClient.setQueryData(["USERS_BIKE"], data);
      },
    });
    return { mutate, ...rest };
  },
  useGetMyBike: () => {
    const { data, isLoading, isError, ...rest } = useQuery({
      queryKey: ["USERS_BIKE"],

      queryFn: async () => {
        try {
          return await bikeApi.getMyBike();
        } catch (error) {
          throw error;
        }
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    });
    return { data, isLoading, isError, ...rest };
  },
};
