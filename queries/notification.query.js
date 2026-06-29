import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationApi } from "../api/notification.api";

const markNotificationReadInData = (data, notificationId) => {
  if (Array.isArray(data)) {
    return data.map((item) =>
      item?._id === notificationId ? { ...item, isRead: true } : item,
    );
  }

  if (Array.isArray(data?.notifications)) {
    const selectedNotification = data.notifications.find(
      (item) => item?._id === notificationId,
    );
    const shouldDecreaseUnread =
      selectedNotification && selectedNotification?.isRead === false;

    return {
      ...data,
      unreadTotal:
        shouldDecreaseUnread && typeof data.unreadTotal === "number"
          ? Math.max(0, data.unreadTotal - 1)
          : data.unreadTotal,
      notifications: data.notifications.map((item) =>
        item?._id === notificationId ? { ...item, isRead: true } : item,
      ),
    };
  }

  return data;
};

export const useNotificationQuery = {
  useGetNotifications: ({ enabled, page = 1, limit = 10 }) => {
    const { data, isLoading, isError, ...rest } = useQuery({
      queryKey: ["NOTIFICATIONS", page, limit],
      queryFn: async () => {
        try {
          const response = await notificationApi.getNotifications({
            page,
            limit,
          });
          return response;
        } catch (error) {
          throw error;
        }
      },
      enabled: !!enabled,
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

        const previousNotifications = queryClient.getQueriesData({
          queryKey: ["NOTIFICATIONS"],
        });

        queryClient.setQueriesData({ queryKey: ["NOTIFICATIONS"] }, (oldData) =>
          markNotificationReadInData(oldData, notificationId),
        );

        return { previousNotifications };
      },
      onError: (_error, _notificationId, context) => {
        if (Array.isArray(context?.previousNotifications)) {
          context.previousNotifications.forEach(([queryKey, data]) => {
            queryClient.setQueryData(queryKey, data);
          });
        }
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ["NOTIFICATIONS"] });
      },
    });
  },
};
