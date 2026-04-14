import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
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

const getInitialIdentityImages = (user = {}) => ({
  front: getProfileText(
    user?.cardImages?.frontCard?.previewUrl ||
      user?.cardImages?.frontCard?.downloadUrl,
  ),
  back: getProfileText(
    user?.cardImages?.backCard?.previewUrl ||
      user?.cardImages?.backCard?.downloadUrl,
  ),
});

const getEmptyIdentityFiles = () => ({
  front: null,
  back: null,
});

const getFileNameFromUri = (uri, fallback) => {
  const normalizedUri = getProfileText(uri).split("?")[0];

  if (!normalizedUri) {
    return fallback;
  }

  const fileName = normalizedUri.substring(normalizedUri.lastIndexOf("/") + 1);
  return fileName || fallback;
};

const getMimeTypeFromUri = (uri) => {
  const normalizedUri = getProfileText(uri).toLowerCase();

  if (normalizedUri.endsWith(".png")) return "image/png";
  if (normalizedUri.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
};

const ProfileComponent = ({
  user,
  profileModalVisible,
  handleCloseProfileModal,
}) => {
  const updateProfileMutation = useAuth.useUpdateProfile();

  const [profileForm, setProfileForm] = useState(() =>
    getInitialFormState(user),
  );
  const [identityImages, setIdentityImages] = useState(() =>
    getInitialIdentityImages(user),
  );
  const [identityFiles, setIdentityFiles] = useState(() =>
    getEmptyIdentityFiles(),
  );

  useEffect(() => {
    if (!profileModalVisible) return;
    setProfileForm(getInitialFormState(user));
    setIdentityImages(getInitialIdentityImages(user));
    setIdentityFiles(getEmptyIdentityFiles());
  }, [profileModalVisible, user]);

  const handleChangeField = (field, value) => {
    setProfileForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handlePickIdentityImage = async (side, source) => {
    const isCameraSource = source === "camera";
    const permission = isCameraSource
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Thông báo",
        isCameraSource
          ? "Vui lòng cấp quyền camera để chụp ảnh CCCD."
          : "Vui lòng cấp quyền truy cập thư viện để chọn ảnh CCCD.",
      );
      return;
    }

    const pickerOptions = {
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    };

    const result = isCameraSource
      ? await ImagePicker.launchCameraAsync(pickerOptions)
      : await ImagePicker.launchImageLibraryAsync(pickerOptions);

    if (result.canceled) {
      return;
    }

    const selectedAsset = result.assets?.[0];
    const selectedImageUri = selectedAsset?.uri;

    if (!selectedImageUri) {
      return;
    }

    setIdentityImages((prev) => ({
      ...prev,
      [side]: selectedImageUri,
    }));

    setIdentityFiles((prev) => ({
      ...prev,
      [side]: {
        uri: selectedImageUri,
        fileName:
          selectedAsset?.fileName ||
          getFileNameFromUri(selectedImageUri, `${side}-card.jpg`),
        mimeType:
          selectedAsset?.mimeType || getMimeTypeFromUri(selectedImageUri),
      },
    }));
  };

  const handleSelectIdentityImageOption = (side) => {
    Alert.alert("Chọn ảnh CCCD", "Bạn muốn chụp mới hay tải ảnh lên?", [
      {
        text: "Chụp ảnh",
        onPress: () => handlePickIdentityImage(side, "camera"),
      },
      {
        text: "Tải lên từ thư viện",
        onPress: () => handlePickIdentityImage(side, "library"),
      },
      {
        text: "Hủy",
        style: "cancel",
      },
    ]);
  };

  const handleRemoveIdentityImage = (side) => {
    setIdentityImages((prev) => ({
      ...prev,
      [side]: "",
    }));

    setIdentityFiles((prev) => ({
      ...prev,
      [side]: null,
    }));
  };

  const handleSaveProfile = () => {
    const fullName = profileForm.fullName.trim();
    const phoneNumber = profileForm.phoneNumber.trim();
    const placeOfResidence = profileForm.address.trim();

    if (!fullName) {
      Alert.alert("Thông báo", "Vui lòng nhập họ và tên.");
      return;
    }

    if (!identityImages.front || !identityImages.back) {
      Alert.alert(
        "Thông báo",
        "Cập nhật thông tin cá nhân bắt buộc phải có đủ ảnh CCCD 2 mặt.",
      );
      return;
    }

    const hasAnyNewCardFile = Boolean(
      identityFiles.front || identityFiles.back,
    );

    if (hasAnyNewCardFile && (!identityFiles.front || !identityFiles.back)) {
      Alert.alert(
        "Thông báo",
        "Khi thay đổi ảnh CCCD, vui lòng chọn lại cả mặt trước và mặt sau.",
      );
      return;
    }

    const payload = new FormData();
    payload.append("name", fullName);
    payload.append("phoneNumber", phoneNumber);
    payload.append("placeOfResidence", placeOfResidence);

    if (hasAnyNewCardFile) {
      payload.append("frontCard", {
        uri: identityFiles.front.uri,
        name: identityFiles.front.fileName || "front-card.jpg",
        type: identityFiles.front.mimeType || "image/jpeg",
      });

      payload.append("backCard", {
        uri: identityFiles.back.uri,
        name: identityFiles.back.fileName || "back-card.jpg",
        type: identityFiles.back.mimeType || "image/jpeg",
      });
    }

    updateProfileMutation.mutate(payload, {
      onSuccess: () => {
        handleCloseProfileModal();
        Alert.alert("Thành công", "Cập nhật thông tin thành công.");
      },
      onError: (error) => {
        Alert.alert(
          "Lỗi",
          error?.response?.data?.message ||
            "Không thể cập nhật thông tin. Vui lòng thử lại.",
        );
      },
    });
  };

  return (
    <Modal
      visible={!!profileModalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleCloseProfileModal}
    >
      <TouchableWithoutFeedback onPress={handleCloseProfileModal}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback
            onPress={Keyboard.dismiss}
            accessible={false}
          >
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
                      color="#FFFFFF"
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
                  <Ionicons name="close" size={20} color="#4B5563" />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.formScroll}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Họ và tên</Text>
                  <TextInput
                    value={profileForm.fullName}
                    onChangeText={(text) => handleChangeField("fullName", text)}
                    style={styles.input}
                    placeholder="Nhập họ và tên"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Số điện thoại</Text>
                  <TextInput
                    value={profileForm.phoneNumber}
                    onChangeText={(text) =>
                      handleChangeField("phoneNumber", text)
                    }
                    style={styles.input}
                    placeholder="Nhập số điện thoại"
                    placeholderTextColor="#9CA3AF"
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
                    placeholderTextColor="#9CA3AF"
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
                    placeholderTextColor="#9CA3AF"
                    multiline={true}
                    textAlignVertical="top"
                  />
                </View>

                <View style={styles.imageSection}>
                  <Text style={styles.imageSectionTitle}>Ảnh CCCD 2 mặt</Text>
                  <Text style={styles.imageSectionHint}>
                    Bạn có thể chụp mới hoặc tải ảnh mặt trước và mặt sau để
                    hoàn thiện hồ sơ định danh.
                  </Text>

                  <View style={styles.imageItem}>
                    <Text style={styles.imageLabel}>Mặt trước CCCD</Text>
                    <TouchableOpacity
                      activeOpacity={0.88}
                      style={styles.imageUploadBox}
                      onPress={() => handleSelectIdentityImageOption("front")}
                    >
                      {identityImages.front ? (
                        <Image
                          source={{ uri: identityImages.front }}
                          style={styles.identityImagePreview}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.imagePlaceholderWrap}>
                          <Ionicons
                            name="cloud-upload-outline"
                            size={22}
                            color="#4B5563"
                          />
                          <Text style={styles.imagePlaceholderText}>
                            Chạm để chụp hoặc tải ảnh mặt trước
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>

                    {identityImages.front ? (
                      <View style={styles.imageActionsRow}>
                        <TouchableOpacity
                          style={[
                            styles.imageActionButton,
                            styles.imageReselect,
                          ]}
                          onPress={() =>
                            handleSelectIdentityImageOption("front")
                          }
                        >
                          <Text style={styles.imageReselectText}>Chọn lại</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.imageActionButton, styles.imageRemove]}
                          onPress={() => handleRemoveIdentityImage("front")}
                        >
                          <Text style={styles.imageRemoveText}>Xóa ảnh</Text>
                        </TouchableOpacity>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.imageItem}>
                    <Text style={styles.imageLabel}>Mặt sau CCCD</Text>
                    <TouchableOpacity
                      activeOpacity={0.88}
                      style={styles.imageUploadBox}
                      onPress={() => handleSelectIdentityImageOption("back")}
                    >
                      {identityImages.back ? (
                        <Image
                          source={{ uri: identityImages.back }}
                          style={styles.identityImagePreview}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.imagePlaceholderWrap}>
                          <Ionicons
                            name="cloud-upload-outline"
                            size={22}
                            color="#4B5563"
                          />
                          <Text style={styles.imagePlaceholderText}>
                            Chạm để chụp hoặc tải ảnh mặt sau
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>

                    {identityImages.back ? (
                      <View style={styles.imageActionsRow}>
                        <TouchableOpacity
                          style={[
                            styles.imageActionButton,
                            styles.imageReselect,
                          ]}
                          onPress={() =>
                            handleSelectIdentityImageOption("back")
                          }
                        >
                          <Text style={styles.imageReselectText}>Chọn lại</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.imageActionButton, styles.imageRemove]}
                          onPress={() => handleRemoveIdentityImage("back")}
                        >
                          <Text style={styles.imageRemoveText}>Xóa ảnh</Text>
                        </TouchableOpacity>
                      </View>
                    ) : null}
                  </View>
                </View>
              </ScrollView>

              <View style={styles.footerActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.cancelButton]}
                  onPress={handleCloseProfileModal}
                >
                  <Text style={styles.cancelButtonText}>Hủy</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    styles.saveButton,
                    updateProfileMutation.isPending &&
                      styles.saveButtonDisabled,
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
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  modalCard: {
    width: "100%",
    maxWidth: 460,
    maxHeight: "92%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
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
    color: "#111827",
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    color: "#6B7280",
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#F3F4F6",
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
    color: "#374151",
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    color: "#111827",
    backgroundColor: "#FFFFFF",
  },
  inputMultiline: {
    minHeight: 86,
  },
  cccdSection: {
    marginTop: 4,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: "#D1FAE5",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#F9FFFB",
  },
  cccdHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  cccdTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#065F46",
  },
  cccdBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  cccdBadgeReady: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
  },
  cccdBadgeEmpty: {
    backgroundColor: "#FFF7ED",
    borderColor: "#FED7AA",
  },
  cccdBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  cccdBadgeTextReady: {
    color: "#047857",
  },
  cccdBadgeTextEmpty: {
    color: "#C2410C",
  },
  cccdHint: {
    marginTop: 8,
    marginBottom: 10,
    fontSize: 12,
    lineHeight: 18,
    color: "#4B5563",
  },
  imageSection: {
    marginTop: 14,
    marginBottom: 6,
  },
  imageSectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  imageSectionHint: {
    marginTop: 5,
    marginBottom: 12,
    fontSize: 12,
    color: "#6B7280",
    lineHeight: 18,
  },
  imageItem: {
    marginBottom: 12,
  },
  imageLabel: {
    marginBottom: 7,
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  imageUploadBox: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderStyle: "dashed",
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  imagePlaceholderWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  imagePlaceholderText: {
    marginTop: 6,
    fontSize: 12,
    color: "#4B5563",
    textAlign: "center",
  },
  identityImagePreview: {
    width: "100%",
    height: "100%",
  },
  imageActionsRow: {
    marginTop: 8,
    flexDirection: "row",
    gap: 8,
  },
  imageActionButton: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  imageReselect: {
    borderColor: "#BBF7D0",
    backgroundColor: "#F0FDF4",
  },
  imageReselectText: {
    color: "#166534",
    fontSize: 13,
    fontWeight: "600",
  },
  imageRemove: {
    borderColor: "#FECACA",
    backgroundColor: "#FEF2F2",
  },
  imageRemoveText: {
    color: "#B91C1C",
    fontSize: 13,
    fontWeight: "600",
  },
  footerActions: {
    flexDirection: "row",
    marginTop: 14,
    marginBottom: 14,
    gap: 10,
  },
  actionButton: {
    flex: 1,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  cancelButton: {
    backgroundColor: "#EEF2F7",
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
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
    color: "#FFFFFF",
  },
});

export default ProfileComponent;
