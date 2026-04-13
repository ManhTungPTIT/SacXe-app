import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authApi } from "../api/auth.api";
import { useAuthStore } from "../stores/auth.store";

export const useAuth = {
  useRegister: () => {
    return useMutation({
      mutationFn: (data) => authApi.register(data),
    });
  },
  useLogin: () => {
    const queryClient = useQueryClient();
    const { mutate, ...rest } = useMutation({
      mutationFn: (data) => authApi.login(data),
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      },
      onError: (error) => {
        console.error("Login error:", error);
      },
    });
    return { mutate, ...rest };
  },
  useGetMe: () => {
    const { data, isLoading, isError, ...rest } = useQuery({
      queryKey: ["ME"],
      queryFn: () => authApi.getMe(),
      retry: 1, // Không retry nếu 401
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 phút
    });
    return { data, isLoading, isError, ...rest };
  },
  useUpdateProfile: () => {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: (data) => authApi.updateProfile(data),
      onSuccess: (response) => {
        const updatedUser = response?.user || response?.data?.user;

        if (updatedUser) {
          queryClient.setQueryData(["ME"], (prevData) => ({
            ...(prevData || {}),
            user: updatedUser,
          }));
        }

        queryClient.invalidateQueries({ queryKey: ["ME"] });
      },
      onError: (error) => {
        console.error("Update profile error:", error);
      },
    });
  },
  useLogout: () => {
    const logout = useAuthStore((state) => state.logout);
    return useMutation({
      mutationFn: () => authApi.logout(),
      onSettled: async () => {
        await logout();
      },
    });
  },
};
