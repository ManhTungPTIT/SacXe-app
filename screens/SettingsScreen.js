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
import { SafeAreaView } from "react-native-safe-area-context";
import ToastNotification from "../components/ToastNotification";

const SETTINGS_ACTIONS = [
  {
    key: "profile",
    label: "THÔNG TIN CÁ NHÂN",
    icon: "person-circle-outline",
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
    label: "VỀ ENOVO",
    icon: "information-circle-outline",
  },
];

const SettingsScreen = ({ navigation }) => {
  const storeUser = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const logoutMutation = useAuth.useLogout();
  const { data: userData } = useAuth.useGetMe();
  const { data: transactionHistory } =
    useTransactionQuery.useGetTransactionHistory("completed");
  const {
    data: bike,
    isLoading: isLoadingBikeData,
    isError,
  } = useBike.useGetMyBike();

  const generateQRMutation = useTransactionQuery.generateQR();

  const [topUpModalVisible, setTopUpModalVisible] = useState(false);
  const [transationHistoryModalVisible, setTransactionHistoryModalVisible] =
    useState(false);
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [customAmount, setCustomAmount] = useState("");
  const [qrGenerated, setQrGenerated] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [logoutConfirmVisible, setLogoutConfirmVisible] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [myBikeModalVisible, setMyBikeModalVisible] = useState(false);
  const [notificationsModalVisible, setNotificationsModalVisible] =
    useState(false);
  const [aboutEnovoModalVisible, setAboutEnovoModalVisible] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const { data: notifications } = useNotificationQuery.useGetNotifications(true);
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
    return notificationItems.filter((item) => !item?.isRead).length;
  }, [notificationItems]);

  const ownerName = userData?.user?.name || storeUser?.name || "Người dùng";
  const ownerBalance = Number(
    userData?.user?.balance ||
    userData?.user?.ownerId?.balance ||
    storeUser?.balance ||
    storeUser?.ownerId?.balance ||
    0,
  );
  const ownerInitial = ownerName?.trim()?.charAt(0)?.toUpperCase() || "U";

  useEffect(() => {
    if (!qrGenerated) return;

    setTimeLeft(300);

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setQrGenerated(null);
          handleCloseTopUpModal();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [qrGenerated]);

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
    setTimeLeft(0);
  };

  const handleConfirmTopUp = () => {
    if (!selectedAmount) {
      Alert.alert("Thông báo", "Vui lòng chọn mức nạp");
      return;
    }
    generateQRMutation.mutate(selectedAmount, {
      onSuccess: (data) => {
        setQrGenerated(data?.qrCodeUrl);
      },
      onError: (error) => {
        Alert.alert(
          "Thông báo",
          error?.response?.data?.message || "Có lỗi xảy ra. Vui lòng thử lại.",
        );
        console.error("Error generating QR code:", error);
      },
    });
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

    if (actionKey === "my-bike") {
      setMyBikeModalVisible(true);
      return;
    }

    if (actionKey === "notifications") {
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
                >
                  <Text style={styles.balanceLabel}>Số dư khả dụng</Text>
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
                      Lịch sử giao dịch
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.topUpButton}
                    onPress={handleOpenTopUpModal}
                  >
                    <Ionicons
                      name="wallet-outline"
                      size={16}
                      color={Colors.white}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.topUpButtonText}>Nạp tiền</Text>
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

            {/* Modal nạp tiền */}
            <TopUpComponent
              topUpModalVisible={topUpModalVisible}
              handleCloseTopUpModal={handleCloseTopUpModal}
              selectedAmount={selectedAmount}
              setSelectedAmount={setSelectedAmount}
              customAmount={customAmount}
              setCustomAmount={setCustomAmount}
              handleConfirmTopUp={handleConfirmTopUp}
              qrGenerated={qrGenerated}
              setQrGenerated={setQrGenerated}
              timeLeft={timeLeft}
              setTimeLeft={setTimeLeft}
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

            <ProfileComponent
              user={userData?.user}
              profileModalVisible={profileModalVisible}
              handleCloseProfileModal={() => setProfileModalVisible(false)}
              onProfileUpdated={() => {
                setToastMessage("Cập nhật thông tin thành công.");
                setToastVisible(true);
              }}
            />

            {/* Component thông báo */}
            <NotificationComponent
              notifications={notifications}
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
        message={toastMessage}
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
  balanceLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 6,
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
});

export default SettingsScreen;
