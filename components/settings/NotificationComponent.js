import React, { useMemo } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/color";

const getNotificationText = (item) =>
  item?.body || item?.message || item?.content || "Không có nội dung";

const formatNotificationTime = (dateValue) => {
  if (!dateValue) return "";

  const parsedDate = new Date(dateValue);
  if (Number.isNaN(parsedDate.getTime())) return "";

  return parsedDate.toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const getNotificationMeta = (title = "") => {
  const normalizedTitle = String(title).toLowerCase();

  if (
    normalizedTitle.includes("hoàn tất") ||
    normalizedTitle.includes("hoan tat")
  ) {
    return {
      icon: "checkmark-done",
      color: "#0F9D58",
      iconWrapperStyle: styles.notificationIconSuccess,
    };
  }

  if (
    normalizedTitle.includes("bắt đầu") ||
    normalizedTitle.includes("bat dau")
  ) {
    return {
      icon: "flash",
      color: "#F57C00",
      iconWrapperStyle: styles.notificationIconWarning,
    };
  }

  return {
    icon: "notifications",
    color: Colors.primary,
    iconWrapperStyle: styles.notificationIconDefault,
  };
};

const NotificationComponent = ({
  notifications,
  notificationsModalVisible,
  handleCloseNotificationsModal,
}) => {
  const { height: screenHeight } = useWindowDimensions();

  const notificationItems = useMemo(() => {
    if (Array.isArray(notifications)) {
      return notifications;
    }

    if (Array.isArray(notifications?.notifications)) {
      return notifications.notifications;
    }

    return [];
  }, [notifications]);

  const unreadCount = notificationItems.filter((item) => !item?.isRead).length;
  const listMaxHeight = Math.min(screenHeight * 0.55, 420);
  const dynamicStyles = useMemo(
    () =>
      StyleSheet.create({
        listScrollHeight: {
          maxHeight: listMaxHeight,
        },
      }),
    [listMaxHeight],
  );

  return (
    <Modal
      visible={!!notificationsModalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleCloseNotificationsModal}
    >
      <View style={styles.overlay}>
        <Pressable
          style={styles.backdropPressable}
          onPress={handleCloseNotificationsModal}
        />

        <View style={styles.sheetContainer}>
          <View style={styles.sheetHandle} />

          <View style={styles.headerRow}>
            <View>
              <Text style={styles.headerTitle}>Thông báo</Text>
            </View>

            <TouchableOpacity
              style={styles.closeButton}
              activeOpacity={0.8}
              onPress={handleCloseNotificationsModal}
            >
              <Ionicons name="close" size={18} color="#1F2937" />
            </TouchableOpacity>
          </View>

          {notificationItems.length > 0 ? (
            <ScrollView
              style={[styles.listScroll, dynamicStyles.listScrollHeight]}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
              keyboardShouldPersistTaps="handled"
            >
              {notificationItems.map((item, index) => {
                const meta = getNotificationMeta(item?.title);
                const showUnread = item?.isRead === false;

                return (
                  <View
                    key={
                      item?._id ||
                      `${item?.createdAt || item?.updatedAt || "notification"}-${index}`
                    }
                    style={[
                      styles.notificationItem,
                      showUnread && styles.unreadItem,
                    ]}
                  >
                    <View
                      style={[
                        styles.notificationIconWrapper,
                        meta.iconWrapperStyle,
                      ]}
                    >
                      <Ionicons name={meta.icon} size={18} color={meta.color} />
                    </View>

                    <View style={styles.notificationContent}>
                      <View style={styles.notificationTitleRow}>
                        <Text
                          style={styles.notificationTitle}
                          numberOfLines={1}
                        >
                          {item?.title || "Thông báo"}
                        </Text>
                        {showUnread ? (
                          <View style={styles.unreadBadge}>
                            <Text style={styles.unreadBadgeText}>Mới</Text>
                          </View>
                        ) : null}
                      </View>

                      <Text style={styles.notificationBody}>
                        {getNotificationText(item)}
                      </Text>

                      <Text style={styles.notificationTime}>
                        {formatNotificationTime(
                          item?.createdAt || item?.updatedAt,
                        )}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          ) : (
            <View style={styles.emptyStateContainer}>
              <View style={styles.emptyIconWrapper}>
                <Ionicons
                  name="notifications-off-outline"
                  size={24}
                  color="#64748B"
                />
              </View>
              <Text style={styles.emptyTitle}>Chưa có thông báo nào</Text>
              <Text style={styles.emptyDescription}>
                Khi có cập nhật mới về phiên sạc, bạn sẽ thấy tại đây.
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 14,
  },
  backdropPressable: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetContainer: {
    width: "100%",
    maxHeight: "90%",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 6,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 42,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#D1D5DB",
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
  },
  headerSubtitle: {
    marginTop: 3,
    fontSize: 12,
    color: "#64748B",
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
  },
  listScroll: {
    flexGrow: 0,
  },
  listContent: {
    paddingVertical: 6,
    paddingBottom: 8,
  },
  notificationItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 11,
    marginBottom: 10,
  },
  unreadItem: {
    borderColor: "#BEEAD1",
    backgroundColor: "#F4FCF7",
  },
  notificationIconWrapper: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  notificationIconSuccess: {
    backgroundColor: "#EAF9EF",
  },
  notificationIconWarning: {
    backgroundColor: "#FFF3E8",
  },
  notificationIconDefault: {
    backgroundColor: "#EAF8EE",
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  notificationTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginRight: 8,
  },
  unreadBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  unreadBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
  },
  notificationBody: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 18,
    color: "#475569",
  },
  notificationTime: {
    marginTop: 8,
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "500",
  },
  emptyStateContainer: {
    paddingVertical: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyIconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  emptyDescription: {
    marginTop: 6,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  closeHint: {
    marginTop: 4,
    textAlign: "center",
    fontSize: 11,
    color: "#94A3B8",
  },
});

export default NotificationComponent;
