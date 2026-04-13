import { useQuery } from "@tanstack/react-query";
import { notificationApi } from "../api/notification.api";

export const useNotificationQuery = {
  useGetNotifications: (notificationsModalVisible) => {
    const { data, isLoading, isError, ...rest } = useQuery({
      queryKey: ["NOTIFICATIONS"],
      queryFn: async () => {
        try {
          const response = await notificationApi.getNotifications();
          return response;
        } catch (error) {
          throw error;
        }
      },
      enabled: !!notificationsModalVisible,
      retry: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
    return { data, isLoading, isError, ...rest };
  },
};
