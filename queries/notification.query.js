import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationApi } from "../api/notification.api";

const markNotificationReadInData = (data, notificationId) => {
  if (Array.isArray(data)) {
    return data.map((item) =>
      item?._id === notificationId ? { ...item, isRead: true } : item,
    );
  }

  if (Array.isArray(data?.notifications)) {
    return {
      ...data,
      notifications: data.notifications.map((item) =>
        item?._id === notificationId ? { ...item, isRead: true } : item,
      ),
    };
  }

  return data;
};

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
  useMarkAsRead: () => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: (notificationId) => notificationApi.markAsRead(notificationId),
      onMutate: async (notificationId) => {
        await queryClient.cancelQueries({ queryKey: ["NOTIFICATIONS"] });

        const previousNotifications = queryClient.getQueryData(["NOTIFICATIONS"]);

        queryClient.setQueryData(["NOTIFICATIONS"], (oldData) =>
          markNotificationReadInData(oldData, notificationId),
        );

        return { previousNotifications };
      },
      onError: (_error, _notificationId, context) => {
        if (context?.previousNotifications !== undefined) {
          queryClient.setQueryData(
            ["NOTIFICATIONS"],
            context.previousNotifications,
          );
        }
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ["NOTIFICATIONS"] });
      },
    });
  },
};
