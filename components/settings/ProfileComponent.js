import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/color";
import { useAuth } from "../../queries/auth.query";

const getProfileText = (value) =>
  typeof value === "string" ? value : value ? String(value) : "";

const getInitialFormState = (user = {}) => ({
  fullName: getProfileText(user?.name),
  phoneNumber: getProfileText(user?.phoneNumber || user?.phone),
  email: getProfileText(user?.email),
  address: getProfileText(user?.placeOfResidence || user?.address),
});


const ProfileComponent = ({
  user,
  profileModalVisible,
  handleCloseProfileModal,
  onProfileUpdated,
}) => {
  const updateProfileMutation = useAuth.useUpdateProfile();
  const deleteAccountMutation = useAuth.useDeleteAccount();

  const [profileForm, setProfileForm] = useState(() =>
    getInitialFormState(user),
  );
  const [isDeletePasswordFormVisible, setIsDeletePasswordFormVisible] =
    useState(false);
  const [deletePassword, setDeletePassword] = useState("");

  useEffect(() => {
    if (!profileModalVisible) return;
    setProfileForm(getInitialFormState(user));
    setIsDeletePasswordFormVisible(false);
    setDeletePassword("");
  }, [profileModalVisible, user]);

  const handleChangeField = (field, value) => {
    setProfileForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const openAppSettings = async () => {
    try {
      await Linking.openSettings();
    } catch (error) {
      Alert.alert(
        "Thông báo",
        "Không thể mở Cài đặt tự động. Vui lòng mở Cài đặt của thiết bị và cấp quyền cho ứng dụng.",
      );
    }
  };

  const submitProfileUpdate = () => {
    const fullName = profileForm.fullName.trim();
    const phoneNumber = profileForm.phoneNumber.trim();
    const placeOfResidence = profileForm.address.trim();

    if (!fullName) {
      Alert.alert("Thông báo", "Vui lòng nhập họ và tên.");
      return;
    }

    let finalPhone = "";
    if (phoneNumber) {
      const cleanPhone = phoneNumber.replace(/[\s-]/g, "");
      const vnf_regex = /^(0|\+84|84)(3|5|7|8|9)([0-9]{8})$/;
      if (!vnf_regex.test(cleanPhone)) {
        Alert.alert(
          "Thông báo",
          "Số điện thoại không hợp lệ. Vui lòng nhập lại số điện thoại.",
        );
        return;
      }
      finalPhone = cleanPhone;
    }

    const payload = new FormData();
    payload.append("name", fullName);
    payload.append("phoneNumber", finalPhone);
    payload.append("placeOfResidence", placeOfResidence);

    updateProfileMutation.mutate(payload, {
      onSuccess: () => {
        handleCloseProfileModal();
        onProfileUpdated?.();
      },
      onError: (error) => {
        Alert.alert(
          "Thông báo",
          error?.response?.data?.message ||
          "Không thể cập nhật thông tin. Vui lòng thử lại.",
        );
      },
    });
  };

  const handleSaveProfile = () => {
    if (updateProfileMutation.isPending) {
      return;
    }

    Alert.alert(
      "Xác nhận",
      "Bạn có chắc chắn muốn cập nhật thông tin cá nhân với những thay đổi hiện tại không?",
      [
        {
          text: "Để sau",
          style: "cancel",
        },
        {
          text: "Xác nhận",
          onPress: submitProfileUpdate,
        },
      ],
    );
  };

  const handlePressDeleteAccount = () => {
    if (deleteAccountMutation.isPending) {
      return;
    }

    setIsDeletePasswordFormVisible(true);
  };

  const handleCancelDeleteAccount = () => {
    if (deleteAccountMutation.isPending) {
      return;
    }

    setDeletePassword("");
    setIsDeletePasswordFormVisible(false);
  };

  const handleConfirmDeleteAccount = () => {
    const password = deletePassword.trim();

    if (!password) {
      Alert.alert(
        "Thông báo",
        "Vui lòng nhập mật khẩu để xác nhận xóa tài khoản.",
      );
      return;
    }

    Alert.alert(
      "Xác nhận",
      "Bạn sẽ không thể khôi phục tài khoản cũ hoặc tạo tài khoản mới cùng với Email/Số điện thoại đã đăng ký này trong tương lai. Bạn có chắc chắn muốn xóa tài khoản không?",
      [
        {
          text: "Hủy",
          style: "cancel",
        },
        {
          text: "Xóa tài khoản",
          style: "destructive",
          onPress: () => {
            deleteAccountMutation.mutate(password, {
              onSuccess: () => {
                setDeletePassword("");
                setIsDeletePasswordFormVisible(false);
                handleCloseProfileModal();
                Alert.alert("Thông báo", "Tài khoản đã được xóa thành công.");
              },
              onError: (error) => {
                Alert.alert(
                  "Thông báo",
                  error?.response?.data?.message ||
                  "Không thể xóa tài khoản. Vui lòng kiểm tra mật khẩu và thử lại.",
                );
              },
            });
          },
        },
      ],
    );
  };

  return (
    <Modal
      visible={!!profileModalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleCloseProfileModal}
    >
      <View style={styles.overlay}>
        <Pressable
          style={styles.overlayBackdrop}
          onPress={handleCloseProfileModal}
        />
        <KeyboardAvoidingView
          style={styles.modalCard}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconWrap}>
                <Ionicons
                  name="person-circle-outline"
                  size={18}
                  color={Colors.white}
                />
              </View>

              <View>
                <Text style={styles.title}>Thông tin cá nhân</Text>
                <Text style={styles.subtitle}>
                  Cập nhật dữ liệu hiển thị trên tài khoản của bạn
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleCloseProfileModal}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={20} color={Colors.textSecondaryDark} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.formScroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Họ và tên</Text>
              <TextInput
                value={profileForm.fullName}
                onChangeText={(text) => handleChangeField("fullName", text)}
                style={styles.input}
                placeholder="Nhập họ và tên"
                placeholderTextColor={Colors.grayMuted}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Số điện thoại</Text>
              <TextInput
                value={profileForm.phoneNumber}
                onChangeText={(text) => handleChangeField("phoneNumber", text)}
                style={styles.input}
                placeholder="Nhập số điện thoại"
                placeholderTextColor={Colors.grayMuted}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                value={profileForm.email}
                onChangeText={(text) => handleChangeField("email", text)}
                style={styles.input}
                placeholder="Nhập email"
                placeholderTextColor={Colors.grayMuted}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nơi thường trú</Text>
              <TextInput
                value={profileForm.address}
                onChangeText={(text) => handleChangeField("address", text)}
                style={[styles.input, styles.inputMultiline]}
                placeholder="Nhập nơi thường trú"
                placeholderTextColor={Colors.grayMuted}
                multiline={true}
                textAlignVertical="top"
              />
            </View>


          </ScrollView>
          <View style={styles.footerActions}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.saveButton,
                updateProfileMutation.isPending && styles.saveButtonDisabled,
              ]}
              onPress={handleSaveProfile}
              disabled={updateProfileMutation.isPending}
            >
              <Text style={styles.saveButtonText}>
                {updateProfileMutation.isPending
                  ? "Đang cập nhật..."
                  : "Lưu thông tin"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.deleteFooterActions}>
            {!isDeletePasswordFormVisible ? (
              <TouchableOpacity
                style={[
                  styles.deleteActionButton,
                  styles.deleteButton,
                  deleteAccountMutation.isPending &&
                  styles.deleteButtonDisabled,
                ]}
                onPress={handlePressDeleteAccount}
                disabled={deleteAccountMutation.isPending}
              >
                <Text style={styles.deleteAccountButtonText}>
                  {deleteAccountMutation.isPending
                    ? "Đang xóa tài khoản..."
                    : "Xóa tài khoản"}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.deleteConfirmCard}>
                <Text style={styles.deleteConfirmLabel}>
                  Nhập mật khẩu để xác nhận xóa tài khoản.
                </Text>
                <TextInput
                  value={deletePassword}
                  onChangeText={setDeletePassword}
                  style={styles.deletePasswordInput}
                  placeholder="Nhập mật khẩu"
                  placeholderTextColor={Colors.grayMuted}
                  secureTextEntry={true}
                  autoCapitalize="none"
                  editable={!deleteAccountMutation.isPending}
                />

                <View style={styles.deleteConfirmActions}>
                  <TouchableOpacity
                    style={[
                      styles.deleteConfirmAction,
                      styles.deleteConfirmCancel,
                    ]}
                    onPress={handleCancelDeleteAccount}
                    disabled={deleteAccountMutation.isPending}
                  >
                    <Text style={styles.deleteConfirmCancelText}>Hủy</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.deleteConfirmAction,
                      styles.deleteConfirmSubmit,
                      deleteAccountMutation.isPending &&
                      styles.deleteButtonDisabled,
                    ]}
                    onPress={handleConfirmDeleteAccount}
                    disabled={deleteAccountMutation.isPending}
                  >
                    <Text style={styles.deleteConfirmSubmitText}>
                      {deleteAccountMutation.isPending
                        ? "Đang xóa tài khoản..."
                        : "Xóa tài khoản"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlayBg,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  overlayBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    width: "100%",
    maxWidth: 460,
    maxHeight: "92%",
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 6,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  headerLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingRight: 8,
  },
  headerIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.textPrimaryDark,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.bgGrayLight,
    alignItems: "center",
    justifyContent: "center",
  },
  formScroll: {
    maxHeight: 520,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    marginBottom: 6,
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textSecondaryDark,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.borderMuted,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    color: Colors.textPrimaryDark,
    backgroundColor: Colors.white,
  },
  inputMultiline: {
    minHeight: 86,
  },

  deleteFooterActions: {
    marginBottom: 14,
  },
  deleteActionButton: {
    width: "100%",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  deleteButton: {
    backgroundColor: Colors.danger,
  },
  deleteButtonDisabled: {
    opacity: 0.7,
  },
  deleteAccountButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.white,
  },
  deleteConfirmCard: {
    width: "100%",
    borderWidth: 1,
    borderColor: Colors.errorBorderLight,
    borderRadius: 12,
    backgroundColor: Colors.errorBgLight2,
    padding: 12,
  },
  deleteConfirmLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.errorTextDark,
    marginBottom: 8,
  },
  deletePasswordInput: {
    borderWidth: 1,
    borderColor: Colors.errorBorderMuted,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    color: Colors.textPrimaryDark,
    backgroundColor: Colors.white,
  },
  deleteConfirmActions: {
    marginTop: 10,
    flexDirection: "row",
    gap: 8,
  },
  deleteConfirmAction: {
    flex: 1,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  deleteConfirmCancel: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.borderMuted,
  },
  deleteConfirmCancelText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textSecondaryDark,
  },
  deleteConfirmSubmit: {
    backgroundColor: Colors.danger,
  },
  deleteConfirmSubmitText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.white,
  },
  footerActions: {
    flexDirection: "row",
    marginTop: 14,
    marginBottom: 14,
    gap: 10,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  saveButton: {
    backgroundColor: Colors.primary,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.white,
  },
});

export default ProfileComponent;
