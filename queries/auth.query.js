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
        queryClient.invalidateQueries({ queryKey: ["ME"] });
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
      // "always" chứ không phải true: số dư là tiền, mở app lên phải là số mới
      // nhất chứ không chờ hết staleTime. Chỉ tốn 1 request mỗi lần app quay
      // lại foreground, và nó bù được mọi sự kiện socket bị lỡ lúc chạy nền.
      refetchOnWindowFocus: "always",
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
  useDeleteAccount: () => {
    const queryClient = useQueryClient();
    const logout = useAuthStore((state) => state.logout);
    return useMutation({
      mutationFn: (password) => authApi.deleteAccount(password),
      onSuccess: async () => {
        await logout();
        queryClient.removeQueries({ queryKey: ["ME"] });
      },
    });
  },
};
