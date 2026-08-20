import { useEffect, useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Linking,
  Modal,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/color";
import { useIdentity } from "../../queries/identity.query";
import { useBike } from "../../queries/bike.query";
import {
  primeAndRequest,
  PERMISSION_KEYS,
} from "../../services/permissionPriming";
const BikeRegistration = ({
  isUpdating,
  headerTitle,
  onCancel,
  onSuccess,
  stepper = null,
}) => {
  // Luồng đăng ký lần đầu đi vào từ "Sạc trụ công cộng", nên nó vẫn là một bước
  // của màn Phiên sạc: giữ nguyên banner tiêu đề của màn đó và dùng lại đúng
  // hàng "Chọn loại trụ khác" như InitiateChargeComponent, thay vì đổi tiêu đề
  // rồi nhét mũi tên vào banner. Luồng Cập nhật giấy tờ xe vào từ Cài đặt nên
  // không thuộc màn Phiên sạc — nó giữ tiêu đề riêng và mũi tên trong banner.
  const showChargeModeBackRow = !isUpdating && !!onCancel;
  const [type, setType] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [registrationImage, setRegistrationImage] = useState(null);
  const [registrationFile, setRegistrationFile] = useState(null);
  const [choosingType, setChoosingType] = useState("takePhoto");
  const [isExtractingRegistrationInfo, setIsExtractingRegistrationInfo] =
    useState(false);
  const [bikeOwnerName, setBikeOwnerName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);

  const extractRegistrationInfoMutation =
    useIdentity.useExtractRegistrationInfo();
  const bikeRegistrationMutation = useBike.useRegister();

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

  const pickImage = async () => {
    const mediaLibraryPermission = await primeAndRequest({
      key: PERMISSION_KEYS.PHOTO_LIBRARY,
      getStatus: ImagePicker.getMediaLibraryPermissionsAsync,
      request: ImagePicker.requestMediaLibraryPermissionsAsync,
    });

    if (!mediaLibraryPermission.granted) {
      if (mediaLibraryPermission.canAskAgain === false) {
        Alert.alert(
          "Thông báo",
          "Bạn đã từ chối quyền truy cập thư viện. Vui lòng mở Cài đặt để bật lại quyền này.",
          [
            {
              text: "Mở cài đặt",
              onPress: openAppSettings,
            },
            {
              text: "Để sau",
              style: "cancel",
            },
          ],
        );
      } else {
        Alert.alert(
          "Thông báo",
          "Cần quyền truy cập thư viện để chọn ảnh đăng ký xe.",
        );
      }
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      const imageData = {
        uri: asset.uri,
        type: asset.mimeType || "image/jpeg",
        name: asset.fileName || `${type}_card_${Date.now()}.jpg`,
      };
      setRegistrationImage(result.assets[0].uri);
      setRegistrationFile(imageData);
    }

    setChoosingType("pickImage");
  };

  const takePhoto = async () => {
    // Cùng quyền camera với màn quét QR (expo-camera và expo-image-picker khai
    // chung android.permission.CAMERA / NSCameraUsageDescription), nên người đã
    // quét trụ rồi sẽ không thấy popup mồi lần nữa.
    const { status } = await primeAndRequest({
      key: PERMISSION_KEYS.CAMERA,
      getStatus: ImagePicker.getCameraPermissionsAsync,
      request: ImagePicker.requestCameraPermissionsAsync,
    });
    if (status !== "granted") {
      Alert.alert("Thông báo", "Cần quyền truy cập camera để chụp ảnh");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      const imageData = {
        uri: asset.uri,
        type: asset.mimeType || "image/jpeg",
        name: asset.fileName || `${type}_card_${Date.now()}.jpg`,
      };
      setRegistrationImage(result.assets[0].uri);
      setRegistrationFile(imageData);
    }
    setChoosingType("takePhoto");
  };

  const handleChangeImagePress = () => {
    Alert.alert(
      "Thay đổi ảnh",
      "Chọn phương thức tải lên ảnh mới",
      [
        {
          text: "Hủy",
          style: "cancel",
        },
        {
          text: "Thư viện ảnh",
          onPress: pickImage,
        },
        {
          text: "Chụp ảnh mới",
          onPress: takePhoto,
        },
      ],
      { cancelable: true }
    );
  };

  useEffect(() => {
    if (registrationFile && !isExtractingRegistrationInfo) {
      setIsExtractingRegistrationInfo(true);
      extractRegistrationInfoMutation.mutate(
        { file: registrationFile },
        {
          onSuccess: (data) => {
            const { registrationInfo } = data;
            setType(registrationInfo.vehicleType || "");
            setLicensePlate(registrationInfo.licensePlate || "");
            setBikeOwnerName(registrationInfo.ownerName || "");
          },
          onError: (error) => {
            Alert.alert(
              "Thông báo",
              error.response?.data?.message ||
              "Trích xuất thông tin đăng ký thất bại. Vui lòng thử lại.",
            );
          },
          onSettled: () => {
            setIsExtractingRegistrationInfo(false);
          },
        },
      );
    }
  }, [registrationFile]);

  const handleSubmit = () => {
    const trimmedOwnerName = bikeOwnerName?.trim();
    const trimmedType = type?.trim();
    const trimmedLicensePlate = licensePlate?.trim();

    if (!registrationFile && !registrationImage) {
      Alert.alert("Thông báo", "Vui lòng tải lên ảnh đăng ký xe.");
      return;
    }
    if (!trimmedOwnerName) {
      Alert.alert("Thông báo", "Vui lòng nhập tên chủ xe.");
      return;
    }
    if (!trimmedType) {
      Alert.alert("Thông báo", "Vui lòng nhập loại xe.");
      return;
    }
    if (!trimmedLicensePlate) {
      Alert.alert("Thông báo", "Vui lòng nhập biển số xe.");
      return;
    }

    setIsSubmitting(true);
    const data = {
      type: trimmedType,
      licensePlate: trimmedLicensePlate.toUpperCase(),
      bikeOwnerName: trimmedOwnerName,
      vehicleRegistrationCard: registrationFile,
    };
    bikeRegistrationMutation.mutate(data, {
      onError: (error) => {
        Alert.alert(
          "Thông báo",
          error.response?.data?.message ||
          "Đăng ký xe thất bại. Vui lòng thử lại.",
        );
      },
      onSuccess: (data) => {
        // Reset form
        setType("");
        setLicensePlate("");
        setBikeOwnerName("");
        setRegistrationImage(null);
        setRegistrationFile(null);
        if (onSuccess) {
          onSuccess();
        } else if (isUpdating && onCancel) {
          onCancel();
        }
      },
      onSettled: () => {
        setIsSubmitting(false);
      },
    });
  };

  return (
    <View style={styles.root}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View
              style={[
                styles.headerSection,
                showChargeModeBackRow && styles.headerSectionWithBackRow,
              ]}
            >
              {isUpdating && onCancel && (
                <TouchableOpacity style={styles.backButton} onPress={onCancel}>
                  <Ionicons
                    name="arrow-back"
                    size={24}
                    color={Colors.secondary}
                  />
                </TouchableOpacity>
              )}
              <Text style={styles.title}>
                {headerTitle ||
                  (isUpdating ? "Cập nhật giấy tờ xe" : "Đăng ký sạc xe")}
              </Text>
            </View>

            {showChargeModeBackRow && (
              <TouchableOpacity
                style={styles.backRow}
                onPress={onCancel}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="arrow-back" size={18} color={Colors.primary} />
                <Text style={styles.backText}>Chọn loại trụ khác</Text>
              </TouchableOpacity>
            )}

            {/* Thanh 3 bước của luồng công cộng, nhận nguyên khối từ ChargeScreen.
                Truyền phần tử thay vì cờ + số bước để component này không phải
                biết luồng công cộng có mấy bước hay đang ở bước nào — nó chỉ là
                một trong ba màn của luồng đó. */}
            {stepper}

            <View style={styles.infoDescriptionBox}>
              <View style={styles.infoDescriptionHeader}>
                <Ionicons
                  name="information-circle-outline"
                  size={20}
                  color={Colors.infoBlue}
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.infoDescriptionTitle}>Tại sao cần cung cấp giấy đăng ký xe?</Text>
              </View>
              <Text style={styles.infoDescriptionText}>
                • <Text style={{ fontWeight: "700" }}>Xác minh phương tiện:</Text> Liên kết thông tin biển số và chủ sở hữu chính xác với tài khoản của bạn.{"\n"}
                • <Text style={{ fontWeight: "700" }}>Đảm bảo an toàn sạc:</Text> Giúp hệ thống quản lý và phê duyệt quyền kích hoạt sạc cho các xe đủ tiêu chuẩn, phòng tránh rủi ro cháy nổ.{"\n"}
                • <Text style={{ fontWeight: "700" }}>Trích xuất thông tin tự động:</Text> Công nghệ AI sẽ tự động đọc ảnh và điền trước thông tin, tiết kiệm thời gian nhập tay cho bạn.
              </Text>
            </View>

            <Text style={styles.label}>Ảnh giấy đăng ký xe</Text>
            <View style={styles.imageContainer}>
              {isExtractingRegistrationInfo && (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="large" color={Colors.primary} />
                  <Text style={styles.loadingText}>
                    Đang trích xuất thông tin...
                  </Text>
                </View>
              )}
              {registrationImage ? (
                <View style={styles.imageWrapper}>
                  <TouchableOpacity
                    onPress={() => setIsPreviewVisible(true)}
                    disabled={isExtractingRegistrationInfo}
                    activeOpacity={0.9}
                  >
                    <Image
                      source={{ uri: registrationImage }}
                      style={[
                        styles.image,
                        isExtractingRegistrationInfo && styles.imageDisabled,
                      ]}
                    />
                  </TouchableOpacity>
                  {!isExtractingRegistrationInfo && (
                    <TouchableOpacity
                      style={styles.editPenButton}
                      onPress={handleChangeImagePress}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="create-outline" size={16} color={Colors.white} />
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <View
                  style={[
                    styles.imageButtons,
                    isExtractingRegistrationInfo && styles.disabled,
                  ]}
                >
                  <TouchableOpacity
                    style={styles.imageButton}
                    onPress={pickImage}
                    disabled={isExtractingRegistrationInfo}
                  >
                    <Ionicons
                      name="images-outline"
                      size={24}
                      color={Colors.primary}
                    />
                    <Text style={styles.imageButtonText}>Thư viện</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.imageButton}
                    onPress={takePhoto}
                    disabled={isExtractingRegistrationInfo}
                  >
                    <Ionicons
                      name="camera-outline"
                      size={24}
                      color={Colors.primary}
                    />
                    <Text style={styles.imageButtonText}>Chụp ảnh</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Chỉ hiển thị các input khi đã trích xuất xong */}
            {registrationImage && !isExtractingRegistrationInfo && (
              <>
                <Text style={styles.label}>Chủ xe</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nhập tên chủ xe"
                  value={bikeOwnerName}
                  onChangeText={setBikeOwnerName}
                />

                <Text style={styles.label}>Loại xe</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nhập loại xe"
                  value={type}
                  onChangeText={setType}
                />

                <Text style={styles.label}>Biển số xe</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nhập biển số xe"
                  value={licensePlate}
                  onChangeText={setLicensePlate}
                  autoCapitalize="characters"
                />

                <TouchableOpacity
                  style={styles.button}
                  onPress={handleSubmit}
                  disabled={isSubmitting}
                >
                  <Text style={styles.buttonText}>
                    {isSubmitting
                      ? isUpdating
                        ? "Đang cập nhật..."
                        : "Đang đăng ký..."
                      : isUpdating
                        ? "Cập nhật"
                        : "Đăng ký"}
                  </Text>
                </TouchableOpacity>

                {isUpdating && (
                  <TouchableOpacity
                    style={styles.cancelFormButton}
                    onPress={onCancel}
                    disabled={isSubmitting}
                  >
                    <Text style={styles.cancelFormButtonText}>Hủy bỏ</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>

      <Modal
        visible={isPreviewVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsPreviewVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsPreviewVisible(false)}>
          <View style={styles.previewOverlay}>
            <TouchableWithoutFeedback onPress={() => { }}>
              <View style={styles.previewContent}>
                {registrationImage && (
                  <Image
                    source={{ uri: registrationImage }}
                    style={styles.previewImage}
                    resizeMode="contain"
                  />
                )}

                {!isExtractingRegistrationInfo && (
                  <TouchableOpacity
                    style={styles.previewChangeButton}
                    onPress={() => {
                      setIsPreviewVisible(false);
                      handleChangeImagePress();
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="camera"
                      size={18}
                      color={Colors.white}
                      style={{ marginRight: 8 }}
                    />
                    <Text style={styles.previewChangeButtonText}>Thay đổi ảnh</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.previewCloseButton}
                  onPress={() => setIsPreviewVisible(false)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="close" size={24} color={Colors.white} />
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
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
    paddingBottom: 48,
    paddingHorizontal: 24,
    backgroundColor: Colors.secondary,
  },
  headerSection: {
    backgroundColor: Colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    paddingHorizontal: 48,
    marginHorizontal: -24,
    marginBottom: 32,
    position: "relative",
  },
  // Banner nhường chỗ cho hàng "Chọn loại trụ khác" ngay dưới nó, nên khoảng hở
  // 32 của bố cục cũ dồn xuống dưới hàng back thay vì nằm trên nó.
  headerSectionWithBackRow: {
    marginBottom: 16,
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    marginBottom: 20,
  },
  backText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: "700",
  },
  backButton: {
    position: "absolute",
    left: 24,
    justifyContent: "center",
    alignItems: "center",
    height: "100%",
  },
  cancelFormButton: {
    backgroundColor: Colors.bgGrayLight,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 12,
    borderWidth: 1,
    borderColor: Colors.borderMuted,
  },
  cancelFormButtonText: {
    color: Colors.textSecondaryDark,
    fontSize: 16,
    fontWeight: "700",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.secondary,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingHorizontal: 0,
    paddingVertical: 12,
    fontSize: 18,
    color: Colors.textDark,
    marginBottom: 24,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 16,
  },
  buttonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "700",
  },
  imageContainer: {
    marginBottom: 32,
    position: "relative",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.whiteTranslucent80,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
    borderRadius: 6,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.primary,
    fontWeight: "600",
  },
  disabled: {
    opacity: 0.5,
  },
  imageDisabled: {
    opacity: 0.5,
  },
  imageButtons: {
    flexDirection: "row",
    gap: 16,
  },
  imageButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingVertical: 24,
    alignItems: "center",
    backgroundColor: Colors.cardBgLight,
  },
  imageButtonText: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  image: {
    width: "100%",
    height: 200,
    borderRadius: 6,
  },
  imageWrapper: {
    position: "relative",
    width: "100%",
    height: 200,
    borderRadius: 6,
    overflow: "hidden",
  },
  previewChangeButton: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 60 : 40,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  previewChangeButtonText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: "700",
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: Colors.blackTranslucent90,
    justifyContent: "center",
    alignItems: "center",
  },
  previewContent: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  previewImage: {
    width: "90%",
    height: "80%",
  },
  previewCloseButton: {
    position: "absolute",
    top: Platform.OS === "ios" ? 60 : 40,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.whiteTranslucent20,
    justifyContent: "center",
    alignItems: "center",
  },
  infoDescriptionBox: {
    backgroundColor: "#F4F9FD",
    borderWidth: 1,
    borderColor: "#E1F3FE",
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
  },
  infoDescriptionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  infoDescriptionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.infoBlue,
  },
  infoDescriptionText: {
    fontSize: 12.5,
    color: "#4A5568",
    lineHeight: 18,
  },
  editPenButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: Colors.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});

export default BikeRegistration;
