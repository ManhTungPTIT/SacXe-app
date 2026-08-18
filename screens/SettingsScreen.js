import { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../stores/auth.store";
import { Colors } from "../constants/color";
import { useAuth } from "../queries/auth.query";
import { useTransactionQuery } from "../queries/transaction.query";
import TransactionHistoryComponent from "../components/settings/TransactionHistoryComponent";
import TopUpComponent from "../components/settings/TopUpComponent";
import { useBike } from "../queries/bike.query";
import NotificationComponent from "../components/settings/NotificationComponent";
import { useNotificationQuery } from "../queries/notification.query";
import AboutEnovoComponent from "../components/settings/AboutEnovoComponent";
import MyBikeComponent from "../components/bike/MyBikeComponent";
import ProfileComponent from "../components/settings/ProfileComponent";
import MyDevicesComponent from "../components/settings/MyDevicesComponent";
import { SafeAreaView } from "react-native-safe-area-context";
import ToastNotification from "../components/ToastNotification";
import { socket } from "../services/socket.service";

const SETTINGS_ACTIONS = [
  {
    key: "profile",
    label: "THÔNG TIN CÁ NHÂN",
    icon: "person-circle-outline",
  },
  {
    key: "my-devices",
    label: "TRỤ SẠC CỦA BẠN",
    icon: "hardware-chip-outline",
  },
  {
    key: "my-bike",
    label: "XE CỦA BẠN",
    icon: "car-sport-outline",
  },
  {
    key: "notifications",
    label: "THÔNG BÁO",
    icon: "notifications-outline",
  },
  {
    key: "feedback",
    label: "GÓP Ý & THẮC MẮC",
    icon: "chatbox-ellipses-outline",
  },
  {
    key: "about",
    label: "VỀ SẠC XE ĐÊ",
    icon: "information-circle-outline",
  },
];

const SettingsScreen = ({ navigation, route }) => {
  const NOTIFICATIONS_LIMIT = 10;
  const queryClient = useQueryClient();
  const storeUser = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const logoutMutation = useAuth.useLogout();
  const { data: userData } = useAuth.useGetMe();
  // Không lọc theo status: modal lịch sử chia sẵn ba tab từ cùng một danh sách,
  // gọi một lần thì đổi tab không phải chờ request.
  const { data: transactionHistory } =
    useTransactionQuery.useGetTransactionHistory();
  const {
    data: bike,
    isLoading: isLoadingBikeData,
    isError,
  } = useBike.useGetMyBike();

  const generateQRMutation = useTransactionQuery.generateQR();

  const [balanceInfoModalVisible, setBalanceInfoModalVisible] = useState(false);
  const [topUpModalVisible, setTopUpModalVisible] = useState(false);
  const [transationHistoryModalVisible, setTransactionHistoryModalVisible] =
    useState(false);
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [customAmount, setCustomAmount] = useState("");
  const [qrGenerated, setQrGenerated] = useState(null);
  const [qrExpiresAt, setQrExpiresAt] = useState(null);
  const [pendingTransactionId, setPendingTransactionId] = useState(null);
  const [logoutConfirmVisible, setLogoutConfirmVisible] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [myBikeModalVisible, setMyBikeModalVisible] = useState(false);
  const [myDevicesModalVisible, setMyDevicesModalVisible] = useState(false);
  const [notificationsModalVisible, setNotificationsModalVisible] =
    useState(false);
  const [notificationsPage, setNotificationsPage] = useState(1);
  const [aboutEnovoModalVisible, setAboutEnovoModalVisible] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("success");

  const { data: notifications } = useNotificationQuery.useGetNotifications({
    enabled: true,
    page: notificationsPage,
    limit: NOTIFICATIONS_LIMIT,
  });
  const markNotificationAsReadMutation = useNotificationQuery.useMarkAsRead();

  const notificationItems = useMemo(() => {
    if (Array.isArray(notifications)) {
      return notifications;
    }
    if (Array.isArray(notifications?.notifications)) {
      return notifications.notifications;
    }
    return [];
  }, [notifications]);

  const unreadCount = useMemo(() => {
    return (
      notifications?.unreadTotal ??
      notificationItems.filter((item) => !item?.isRead).length
    );
  }, [notifications?.unreadTotal, notificationItems]);

  const ownerName = userData?.user?.name || storeUser?.name || "Người dùng";

  const ownerBalance = useMemo(() => {
    return Number(
      userData?.user?.balance ||
      0,
    );
  }, [userData, storeUser]);

  const ownerInitial = ownerName?.trim()?.charAt(0)?.toUpperCase() || "U";

  // Giao dịch được cộng tiền (hệ thống tự khớp hoặc admin duyệt) trong lúc màn
  // QR đang mở: đóng màn lại, nếu không nó cứ quay vòng tới khi hết hạn.
  // RootNavigator đã lo phần cập nhật số dư và lịch sử.
  useEffect(() => {
    if (!pendingTransactionId) return;

    const handleTransactionCompleted = (payload) => {
      if (payload?.status !== "completed") return;

      const completedId = payload?.transaction?._id;
      if (completedId && String(completedId) !== String(pendingTransactionId)) {
        return;
      }

      handleCloseTopUpModal();
      showToast("Nạp tiền thành công, số dư đã được cập nhật.");
    };

    socket.on("transaction_update", handleTransactionCompleted);

    return () => {
      socket.off("transaction_update", handleTransactionCompleted);
    };
  }, [pendingTransactionId]);

  useEffect(() => {
    if (route?.params?.openTopUp) {
      handleOpenTopUpModal();
      navigation.setParams({ openTopUp: undefined });
    }
  }, [route?.params?.openTopUp]);

  const handleLogout = async () => {
    await logout();
    logoutMutation.mutate();
  };

  const handleOpenLogoutConfirm = () => {
    setLogoutConfirmVisible(true);
  };

  const handleCloseLogoutConfirm = () => {
    setLogoutConfirmVisible(false);
  };

  const handleConfirmLogout = async () => {
    setLogoutConfirmVisible(false);
    await handleLogout();
  };

  const handleOpenTopUpModal = () => {
    setSelectedAmount(null);
    setCustomAmount("");
    setTopUpModalVisible(true);
  };

  const handleCloseTopUpModal = () => {
    setTopUpModalVisible(false);
    setSelectedAmount(null);
    setCustomAmount("");
    setQrGenerated(null);
    setQrExpiresAt(null);
    setPendingTransactionId(null);
  };

  const showToast = (message, type = "success") => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const handleConfirmTopUp = () => {
    if (!selectedAmount) {
      Alert.alert("Thông báo", "Vui lòng chọn mức nạp");
      return;
    }
    generateQRMutation.mutate(selectedAmount, {
      onSuccess: (data) => {
        setQrGenerated(data?.qrCodeUrl);
        setQrExpiresAt(data?.expiresAt || null);
        setPendingTransactionId(data?.transactionId || null);
      },
      onError: (error) => {
        Alert.alert(
          "Thông báo",
          error?.response?.data?.message || "Có lỗi xảy ra. Vui lòng thử lại.",
        );
      },
    });
  };

  // Khách đóng màn QR mà chưa chuyển khoản xong. Không gọi API nào: giao dịch ở
  // lại "pending" cho tới hạn giữ, và mở lại được từ tab "Chưa xử lý".
  const handleCloseQrScreen = () => {
    handleCloseTopUpModal();
    // Giao dịch vừa tạo phải xuất hiện ngay ở tab "Chưa xử lý", nếu không khách
    // làm theo lời nhắc mà vào lịch sử lại không thấy gì.
    queryClient.invalidateQueries({ queryKey: ["TRANSACTION_HISTORY"] });
    showToast(
      "Giao dịch chưa hoàn thành. Quý khách có thể vào phần lịch sử giao dịch để hoàn thành giao dịch",
      "pending",
    );
  };

  // Bấm một giao dịch ở tab "Chưa xử lý": mở lại đúng mã QR cũ để quét tiếp.
  const handleOpenPendingTransaction = (transaction) => {
    if (!transaction?.qrCodeUrl) {
      Alert.alert(
        "Thông báo",
        "Giao dịch này không còn mã QR. Vui lòng tạo giao dịch nạp mới.",
      );
      return;
    }

    setTransactionHistoryModalVisible(false);
    setSelectedAmount(null);
    setCustomAmount("");
    setQrGenerated(transaction.qrCodeUrl);
    setQrExpiresAt(transaction.expiresAt || null);
    setPendingTransactionId(transaction._id || null);
    setTopUpModalVisible(true);
  };

  const handlePressNotification = (notification) => {
    if (!notification?._id || notification?.isRead) return;

    markNotificationAsReadMutation.mutate(notification._id);
  };

  const handlePressSettingsAction = (actionKey) => {
    if (actionKey === "profile") {
      setProfileModalVisible(true);
      return;
    }

    if (actionKey === "feedback") {
      navigation.navigate("Feedback");
      return;
    }

    if (actionKey === "my-devices") {
      setMyDevicesModalVisible(true);
      return;
    }

    if (actionKey === "my-bike") {
      setMyBikeModalVisible(true);
      return;
    }

    if (actionKey === "notifications") {
      setNotificationsPage(1);
      setNotificationsModalVisible(true);
      return;
    }

    if (actionKey === "about") {
      setAboutEnovoModalVisible(true);
      return;
    }

    Alert.alert("Thông báo", "Chức năng đang được phát triển.");
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.container}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.headerSection}>
              <Text style={styles.title}>Cài đặt</Text>
            </View>
            <View style={styles.bodyContainer}>
              <View style={styles.accountCard}>
                <View style={styles.accountHeader}>
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarText}>{ownerInitial}</Text>
                  </View>

                  <View style={styles.accountMeta}>
                    <Text style={styles.accountLabel}>Chủ tài khoản</Text>
                    <Text style={styles.accountName} numberOfLines={1}>
                      {ownerName}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.balanceCard}
                  activeOpacity={0.8}
                  onPress={() => setBalanceInfoModalVisible(true)}
                >
                  <View style={styles.balanceCardHeader}>
                    <Text style={styles.balanceLabel}>Số dư tài khoản sạc</Text>
                    <Ionicons
                      name="information-circle-outline"
                      size={20}
                      color={Colors.primary}
                    />
                  </View>
                  <Text style={styles.balanceValue}>
                    {ownerBalance.toLocaleString("vi-VN")} VND
                  </Text>
                </TouchableOpacity>

                <View style={styles.accountActions}>
                  <TouchableOpacity
                    style={styles.historyButton}
                    onPress={() => setTransactionHistoryModalVisible(true)}
                  >
                    <Ionicons
                      name="receipt-outline"
                      size={16}
                      color={Colors.secondary}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.historyButtonText}>
                      Lịch sử tài khoản sạc
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.topUpButton}
                    onPress={handleOpenTopUpModal}
                  >
                    <Ionicons
                      name="logo-usd"
                      size={16}
                      color={Colors.white}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.topUpButtonText}>Nạp tài khoản sạc</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.settingsActionList}>
                {SETTINGS_ACTIONS.map((item, index) => {
                  const isNotifications = item.key === "notifications";
                  const showBadge = isNotifications && unreadCount > 0;

                  return (
                    <TouchableOpacity
                      key={item.key}
                      style={[
                        styles.settingsActionItem,
                        index === SETTINGS_ACTIONS.length - 1 &&
                        styles.settingsActionItemLast,
                      ]}
                      onPress={() => handlePressSettingsAction(item.key)}
                    >
                      <View style={styles.settingsActionLeft}>
                        <Ionicons
                          name={item.icon}
                          size={18}
                          color={styles.settingsActionIcon.color}
                        />
                        <Text style={styles.settingsActionLabel}>
                          {item.label}
                        </Text>
                      </View>
                      <View style={styles.settingsActionRight}>
                        {showBadge && (
                          <View style={styles.badgeContainer}>
                            <Text style={styles.badgeText}>{unreadCount}</Text>
                          </View>
                        )}
                        <Ionicons
                          name="chevron-forward"
                          size={18}
                          color={Colors.textPlaceholder}
                        />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                style={styles.logoutButton}
                onPress={handleOpenLogoutConfirm}
                activeOpacity={0.86}
              >
                <Ionicons
                  name="log-out-outline"
                  size={18}
                  color={Colors.primary}
                />
                <Text style={styles.logoutButtonText}>Đăng xuất</Text>
              </TouchableOpacity>
            </View>

            {/* Modal xác nhận đăng xuất */}
            <Modal
              visible={logoutConfirmVisible}
              animationType="fade"
              transparent={true}
              onRequestClose={handleCloseLogoutConfirm}
            >
              <TouchableWithoutFeedback onPress={handleCloseLogoutConfirm}>
                <View style={styles.modalOverlay}>
                  <TouchableWithoutFeedback>
                    <View style={styles.confirmModalContent}>
                      <Text style={styles.confirmModalTitle}>
                        Xác nhận đăng xuất
                      </Text>
                      <Text style={styles.confirmModalMessage}>
                        Bạn có chắc chắn muốn đăng xuất ở thời điểm này không?
                      </Text>
                      <View style={styles.modalButtons}>
                        <TouchableOpacity
                          style={[styles.modalButton, styles.cancelButton]}
                          onPress={handleCloseLogoutConfirm}
                        >
                          <Text style={styles.cancelButtonText}>Hủy</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.modalButton,
                            styles.confirmLogoutButton,
                          ]}
                          onPress={handleConfirmLogout}
                        >
                          <Text style={styles.confirmLogoutButtonText}>
                            Đăng xuất
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </TouchableWithoutFeedback>
                </View>
              </TouchableWithoutFeedback>
            </Modal>

            {/* Modal thông tin tài khoản sạc */}
            <Modal
              visible={balanceInfoModalVisible}
              animationType="fade"
              transparent={true}
              onRequestClose={() => setBalanceInfoModalVisible(false)}
            >
              <TouchableWithoutFeedback onPress={() => setBalanceInfoModalVisible(false)}>
                <View style={styles.modalOverlay}>
                  <TouchableWithoutFeedback>
                    <View style={styles.infoModalContent}>
                      <View style={styles.infoDescriptionBox}>
                        <View style={styles.infoDescriptionHeader}>
                          <Ionicons
                            name="information-circle-outline"
                            size={20}
                            color={Colors.primary}
                            style={{ marginRight: 6 }}
                          />
                          <Text style={styles.infoDescriptionTitle}>Tài khoản sạc Sạc Xe Đê</Text>
                        </View>
                        <Text style={styles.infoDescriptionText}>
                          Tài khoản sạc là số dư trả trước được sử dụng để thanh toán các dịch vụ sạc xe điện do Sạc Xe Đê cung cấp.{"\n\n"}
                          <Text style={{ fontWeight: "700" }}>Lưu ý:</Text>{"\n"}
                          • Số dư chỉ được sử dụng để thanh toán dịch vụ sạc của Sạc Xe Đê.{"\n"}
                          • Không thể chuyển cho người dùng khác.{"\n"}
                          • Số dư trong tài khoản sạc không thể chuyển lại về tài khoản ngân hàng của bạn.{"\n"}
                          • Không thể quy đổi hoặc rút thành tiền mặt.{"\n"}
                          • Không dùng để thanh toán hàng hóa hoặc dịch vụ khác.{"\n"}
                          • Không phải ví điện tử và không có chức năng đầu tư hoặc sinh lãi.{"\n"}
                          • Chi phí sạc sẽ được tự động khấu trừ từ số dư trong quá trình sạc; phần chi phí còn lại sẽ được chốt khi phiên sạc kết thúc.{"\n\n"}
                          Vui lòng đảm bảo tài khoản sạc có đủ số dư trước khi bắt đầu phiên sạc để quá trình sử dụng dịch vụ diễn ra thuận lợi.
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={styles.closeInfoButton}
                        onPress={() => setBalanceInfoModalVisible(false)}
                      >
                        <Text style={styles.closeInfoButtonText}>Đóng</Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableWithoutFeedback>
                </View>
              </TouchableWithoutFeedback>
            </Modal>

            {/* Modal nạp tiền */}
            <TopUpComponent
              topUpModalVisible={topUpModalVisible}
              handleCloseTopUpModal={handleCloseTopUpModal}
              selectedAmount={selectedAmount}
              setSelectedAmount={setSelectedAmount}
              customAmount={customAmount}
              setCustomAmount={setCustomAmount}
              handleConfirmTopUp={handleConfirmTopUp}
              handleCloseQrScreen={handleCloseQrScreen}
              qrGenerated={qrGenerated}
              qrExpiresAt={qrExpiresAt}
            />

            {/* Component lịch sử giao dịch */}
            <TransactionHistoryComponent
              history={transactionHistory?.history || []}
              topUpModalTransactionHistoryVisible={
                transationHistoryModalVisible
              }
              handleCloseTransactionHistoryModal={() =>
                setTransactionHistoryModalVisible(false)
              }
              handleOpenPendingTransaction={handleOpenPendingTransaction}
            />

            {/* Component xe của tôi */}
            <MyBikeComponent
              bike={bike?.bike}
              myBikeModalVisible={myBikeModalVisible}
              handleCloseMyBikeModal={() => setMyBikeModalVisible(false)}
              onUpdateRegistration={() => {
                setMyBikeModalVisible(false);
                navigation.navigate("Charge", { isUpdating: true });
              }}
            />

            {/* Component thiết bị của tôi */}
            <MyDevicesComponent
              myDevicesModalVisible={myDevicesModalVisible}
              handleCloseMyDevicesModal={() => setMyDevicesModalVisible(false)}
              onDeviceUpdated={() => {
                showToast("Cập nhật thông tin trụ thành công.");
              }}
            />

            <ProfileComponent
              user={userData?.user}
              profileModalVisible={profileModalVisible}
              handleCloseProfileModal={() => setProfileModalVisible(false)}
              onProfileUpdated={() => {
                showToast("Cập nhật thông tin thành công.");
              }}
            />

            {/* Component thông báo */}
            <NotificationComponent
              notifications={notifications}
              page={notificationsPage}
              limit={NOTIFICATIONS_LIMIT}
              onPageChange={setNotificationsPage}
              notificationsModalVisible={notificationsModalVisible}
              handleCloseNotificationsModal={() =>
                setNotificationsModalVisible(false)
              }
              onNotificationPress={handlePressNotification}
            />

            <AboutEnovoComponent
              aboutEnovoModalVisible={aboutEnovoModalVisible}
              handleCloseAboutEnovoModal={() =>
                setAboutEnovoModalVisible(false)
              }
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
      <ToastNotification
        visible={toastVisible}
        title={toastType === "pending" ? "Chưa hoàn thành" : "Thành công"}
        message={toastMessage}
        type={toastType}
        onDismiss={() => setToastVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: Colors.white,
    paddingBottom: 24,
  },
  bodyContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.secondary,
  },
  headerSection: {
    alignItems: "center",
    backgroundColor: Colors.primary,
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  accountCard: {
    borderRadius: 16,
    backgroundColor: Colors.bgGreenTint,
    borderWidth: 1,
    borderColor: Colors.borderGreenLight2,
    padding: 14,
    marginBottom: 16,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  accountHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: "700",
  },
  accountMeta: {
    flex: 1,
  },
  accountLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  accountName: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  balanceCard: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.borderGreenLight,
  },
  balanceCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  balanceLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  balanceValue: {
    fontSize: 24,
    fontWeight: "800",
    color: Colors.primary,
  },
  accountActions: {
    flexDirection: "row",
    marginTop: 12,
    gap: 10,
  },
  historyButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderGreenLight,
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    backgroundColor: Colors.primary,
  },
  historyButtonText: {
    color: Colors.secondary,
    fontWeight: "600",
    fontSize: 13,
  },
  topUpButton: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  topUpButtonText: {
    color: Colors.white,
    fontWeight: "700",
    fontSize: 13,
  },
  settingsActionList: {
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 16,
  },
  settingsActionItem: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderMuted,
  },
  settingsActionItemLast: {
    borderBottomWidth: 0,
  },
  settingsActionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    paddingRight: 8,
  },
  settingsActionRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  badgeContainer: {
    backgroundColor: Colors.danger,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 5,
    marginRight: 6,
  },
  badgeText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: "800",
    lineHeight: 12,
    textAlign: "center",
  },
  settingsActionIcon: {
    color: Colors.textSecondary,
  },
  settingsActionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.cardBgGreen,
    borderWidth: 1,
    borderColor: Colors.borderGreenLight,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    width: "100%",
  },
  logoutButtonText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlayBg,
    justifyContent: "center",
    alignItems: "center",
  },
  confirmModalContent: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 24,
    width: "85%",
    maxWidth: 360,
  },
  confirmModalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    color: Colors.textPrimary,
    marginBottom: 10,
  },
  confirmModalMessage: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 16,
  },

  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: Colors.dividerMuted,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  confirmLogoutButton: {
    backgroundColor: Colors.danger,
  },
  confirmLogoutButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.white,
  },
  infoModalContent: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    width: "90%",
    maxWidth: 400,
  },
  infoDescriptionBox: {
    backgroundColor: "#F4F9FD",
    borderWidth: 1,
    borderColor: "#E1F3FE",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  infoDescriptionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  infoDescriptionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.primary,
  },
  infoDescriptionText: {
    fontSize: 13,
    color: "#4A5568",
    lineHeight: 20,
  },
  closeInfoButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  closeInfoButtonText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: "600",
  },
});

export default SettingsScreen;
