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
      color: Colors.successGreen,
      iconWrapperStyle: styles.notificationIconSuccess,
    };
  }

  if (
    normalizedTitle.includes("bắt đầu") ||
    normalizedTitle.includes("bat dau")
  ) {
    return {
      icon: "flash",
      color: Colors.warningOrange,
      iconWrapperStyle: styles.notificationIconWarning,
    };
  }

  if (
    normalizedTitle.includes("dừng") ||
    normalizedTitle.includes("ngắt") ||
    normalizedTitle.includes("dung")
  ) {
    return {
      icon: "alert-circle",
      color: Colors.errorTextDark,
      iconWrapperStyle: styles.notificationIconError,
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
  page = 1,
  limit = 10,
  onPageChange,
  notificationsModalVisible,
  handleCloseNotificationsModal,
  onNotificationPress,
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

  const totalItems = notifications?.total ?? notificationItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));
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
                  <TouchableOpacity
                    key={
                      item?._id ||
                      `${item?.createdAt || item?.updatedAt || "notification"}-${index}`
                    }
                    activeOpacity={0.82}
                    onPress={() => onNotificationPress?.(item)}
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
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : (
            <View style={styles.emptyStateContainer}>
              <View style={styles.emptyIconWrapper}>
                <Ionicons
                  name="notifications-off-outline"
                  size={24}
                  color={Colors.textSlate}
                />
              </View>
              <Text style={styles.emptyTitle}>Chưa có thông báo nào</Text>
              <Text style={styles.emptyDescription}>
                Khi có cập nhật mới về phiên sạc, bạn sẽ thấy tại đây.
              </Text>
            </View>
          )}

          {totalPages > 1 && (
            <View style={styles.paginationContainer}>
              <TouchableOpacity
                style={styles.pageButton}
                onPress={() => onPageChange?.(Math.max(1, page - 1))}
                disabled={page === 1}
                activeOpacity={0.5}
              >
                <Ionicons
                  name="chevron-back"
                  size={14}
                  color={page === 1 ? Colors.inactive : Colors.textPrimary}
                />
                <Text
                  style={[
                    styles.pageButtonText,
                    page === 1 && styles.pageButtonTextDisabled,
                  ]}
                >
                  Trước
                </Text>
              </TouchableOpacity>

              <Text style={styles.pageInfoText}>
                {page} / {totalPages}
              </Text>

              <TouchableOpacity
                style={styles.pageButton}
                onPress={() => onPageChange?.(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                activeOpacity={0.5}
              >
                <Text
                  style={[
                    styles.pageButtonText,
                    page === totalPages && styles.pageButtonTextDisabled,
                  ]}
                >
                  Sau
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={14}
                  color={
                    page === totalPages ? Colors.inactive : Colors.textPrimary
                  }
                />
              </TouchableOpacity>
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
    backgroundColor: Colors.overlayBgLight,
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
    backgroundColor: Colors.white,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
    shadowColor: Colors.textDarkGray,
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
    backgroundColor: Colors.borderMuted,
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
    color: Colors.textDarkGray,
  },
  headerSubtitle: {
    marginTop: 3,
    fontSize: 12,
    color: Colors.textSlate,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.bgLightMuted,
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
    backgroundColor: Colors.bgLightMuted,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderMuted,
    padding: 11,
    marginBottom: 10,
  },
  unreadItem: {
    borderColor: Colors.borderGreenLight,
    backgroundColor: Colors.cardBgGreen,
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
    backgroundColor: Colors.successBgLight,
  },
  notificationIconWarning: {
    backgroundColor: Colors.warningBg || Colors.whiteTranslucent20, // Fallback if warningBg is not in Colors
  },
  notificationIconError: {
    backgroundColor: Colors.errorBgLight2,
  },
  notificationIconDefault: {
    backgroundColor: Colors.cardBgGreen,
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
    color: Colors.textPrimaryDark,
    marginRight: 8,
  },
  unreadBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  unreadBadgeText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: "600",
  },
  notificationBody: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textSecondaryDark,
  },
  notificationTime: {
    marginTop: 8,
    fontSize: 11,
    color: Colors.textSlateLight,
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
    backgroundColor: Colors.bgLightMuted,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.textDarkGray,
  },
  emptyDescription: {
    marginTop: 6,
    color: Colors.textSlate,
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  closeHint: {
    marginTop: 4,
    textAlign: "center",
    fontSize: 11,
    color: Colors.textSlateLight,
  },
  paginationContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    gap: 16,
  },
  pageButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  pageButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.textPrimary,
  },
  pageButtonTextDisabled: {
    color: Colors.inactive,
  },
  pageInfoText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
});

export default NotificationComponent;
