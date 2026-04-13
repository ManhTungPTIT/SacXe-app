import React, { useCallback, useRef, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { Colors } from "../constants/color";
import { useFeedbackQuery } from "../queries/feedback.query";

const normalizeScannedCode = (rawData) => {
  const value = rawData?.trim();

  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value);

    if (typeof parsed === "string") {
      return parsed.trim();
    }

    const fromObject =
      parsed?.deviceCode || parsed?.device_code || parsed?.code;

    if (fromObject) {
      return String(fromObject).trim();
    }
  } catch (error) {
    // Ignore parse errors and fallback to regex/plain text.
  }

  const queryMatch = value.match(
    /[?&](?:deviceCode|device_code|code)=([^&#]+)/i,
  );
  if (queryMatch?.[1]) {
    return decodeURIComponent(queryMatch[1]).trim();
  }

  return value;
};

const FeedbackScreen = () => {
  const scannedRef = useRef(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [isScannerVisible, setIsScannerVisible] = useState(false);
  const [deviceCode, setDeviceCode] = useState("");
  const [message, setMessage] = useState("");
  const [photoUri, setPhotoUri] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [image, setImage] = useState(null);

  const feedbackMutation = useFeedbackQuery.useCreateFeedback();

  const openScanner = useCallback(async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert(
          "Cần quền camera",
          "Bạn cần cấp quyền camera để quét mã thiết bị.",
        );
        return;
      }
    }

    scannedRef.current = false;
    setIsScannerVisible(true);
  }, [permission?.granted, requestPermission]);

  const closeScanner = useCallback(() => {
    setIsScannerVisible(false);
    scannedRef.current = false;
  }, []);

  const handleBarcodeScanned = useCallback(({ data }) => {
    if (scannedRef.current) {
      return;
    }

    const scannedCode = normalizeScannedCode(data);
    if (!scannedCode) {
      Alert.alert("Mã không hợp lệ", "Vui lòng quét lại mã thiết bị.");
      return;
    }

    scannedRef.current = true;
    setDeviceCode(scannedCode);
    setIsScannerVisible(false);
  }, []);

  const handleTakePhoto = useCallback(async () => {
    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
    if (!cameraPermission.granted) {
      Alert.alert(
        "Cần quền camera",
        "Bạn cần cấp quyền camera để chup ảnh đính kèm.",
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      setPhotoUri(result.assets[0].uri);
      const asset = result.assets[0];
      const imageData = {
        uri: asset.uri,
        type: asset.type || "image/jpeg",
        name: asset.fileName || `photo_${Date.now()}.jpg`,
      };
      setImage(imageData);
    }
  }, []);

  const canSubmit = Boolean(deviceCode.trim() && message.trim());

  const handleSubmit = async () => {
    if (!canSubmit) {
      Alert.alert(
        "Thiếu thông tin",
        "Vui lòng quét mã thiết bị và nhập nội dung phản ánh.",
      );
      return;
    }

    setIsSubmitting(true);

    feedbackMutation.mutate(
      {
        deviceCode,
        content: message,
        photoUri,
        image,
      },
      {
        onSuccess: () => {
          setMessage("");
          setPhotoUri("");
          setImage(null);
          setDeviceCode("");
          setIsSubmitting(false);
          Alert.alert(
            "Gửi phản ánh thành công",
            "Cảm ơn bạn đã gửi phản ánh. Chúng tôi sẽ xem xét và xử lý trong thời gian sớm nhất.",
          );
        },
        onError: (error) => {
          console.error("Error submitting feedback:", error);
          setIsSubmitting(false);
          Alert.alert(
            "Gửi phản ánh thất bại",
            error?.response?.data?.message ||
              "Đã có lỗi xảy ra. Vui lòng thử lại sau.",
          );
        },
      },
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerCard}>
          <View style={styles.headerIconWrap}>
            <Ionicons
              name="chatbox-ellipses"
              size={24}
              color={Colors.primary}
            />
          </View>
          <Text style={styles.headerTitle}>Phản ánh sự cố sạc</Text>
          <Text style={styles.headerDescription}>
            Quét mã thiết bị để xác định đúng tòa nhà, sau đó gửi mô tả và hình
            ảnh để đội ngũ vận hành hỗ trợ nhanh hơn.
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>1. Mã thiết bị</Text>

          <View style={styles.deviceCodeBox}>
            <Ionicons name="qr-code" size={20} color={Colors.primary} />
            <Text style={styles.deviceCodeText} numberOfLines={2}>
              {deviceCode || "Chưa quét mã thiết bị"}
            </Text>
          </View>

          <TouchableOpacity style={styles.primaryButton} onPress={openScanner}>
            <Ionicons name="scan" size={18} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>
              {deviceCode ? "Quét lại mã" : "Quét mã thiết bị"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>
            2. Hình ảnh đính kèm (tùy chọn)
          </Text>

          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.previewImage} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons
                name="image-outline"
                size={26}
                color={Colors.inactive}
              />
              <Text style={styles.imagePlaceholderText}>
                Chưa có ảnh đính kèm
              </Text>
            </View>
          )}

          <View style={styles.photoActionsRow}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleTakePhoto}
            >
              <Ionicons name="camera" size={18} color={Colors.primary} />
              <Text style={styles.secondaryButtonText}>Chụp ảnh</Text>
            </TouchableOpacity>

            {photoUri ? (
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => setPhotoUri("")}
              >
                <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
                <Text style={styles.removeButtonText}>Bỏ ảnh</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>3. Nội dung phản ánh</Text>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Mô tả sự cố, ví dụ: ổ cắm sạc không vào điện, màn hình báo lỗi..."
            placeholderTextColor="#9AA0A6"
            style={styles.messageInput}
            multiline
            textAlignVertical="top"
            maxLength={700}
          />
          <Text style={styles.charCount}>{message.length}/700</Text>
        </View>

        <TouchableOpacity
          style={[
            styles.submitButton,
            (!canSubmit || isSubmitting) && styles.submitButtonDisabled,
          ]}
          disabled={!canSubmit || isSubmitting}
          onPress={handleSubmit}
        >
          <Ionicons name="send" size={18} color="#FFFFFF" />
          <Text style={styles.submitButtonText}>
            {isSubmitting ? "Đang gửi..." : "Gửi phản ánh"}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={isScannerVisible}
        animationType="slide"
        onRequestClose={closeScanner}
      >
        <View style={styles.scannerContainer}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{
              barcodeTypes: ["qr", "code128", "ean13"],
            }}
            onBarcodeScanned={handleBarcodeScanned}
          />

          <View style={styles.scannerOverlay} pointerEvents="none">
            <View style={styles.scannerFrame} />
            <Text style={styles.scannerGuideText}>
              Đặt mã QR vào khung để quét. Hệ thống sẽ tự động nhận diện mã
              thiết bị và đóng camera sau khi quét thành công.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.closeScannerButton}
            onPress={closeScanner}
          >
            <Ionicons name="close" size={22} color="#FFFFFF" />
            <Text style={styles.closeScannerText}>Đóng</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F4F7F5",
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 150,
    gap: 14,
  },
  headerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E7EEE9",
  },
  headerIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#EAF9EF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#15211A",
  },
  headerDescription: {
    marginTop: 6,
    color: "#5D6760",
    lineHeight: 20,
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E7EEE9",
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#19231D",
  },
  deviceCodeBox: {
    minHeight: 54,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D8E7DD",
    backgroundColor: "#F7FCF9",
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  deviceCodeText: {
    flex: 1,
    color: "#243128",
    fontWeight: "600",
  },
  primaryButton: {
    height: 46,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
  imagePlaceholder: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D8E0DA",
    borderStyle: "dashed",
    height: 180,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FBFDFC",
    gap: 8,
  },
  imagePlaceholderText: {
    color: "#76817A",
  },
  previewImage: {
    width: "100%",
    height: 220,
    borderRadius: 12,
    backgroundColor: "#E5E5EA",
  },
  photoActionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#B9D8C3",
    backgroundColor: "#F2FBF5",
    height: 44,
    paddingHorizontal: 14,
  },
  secondaryButtonText: {
    color: Colors.primary,
    fontWeight: "700",
  },
  removeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    backgroundColor: "#FF6B6B",
    height: 44,
    paddingHorizontal: 14,
  },
  removeButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  messageInput: {
    minHeight: 140,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D8E0DA",
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: "#1F2822",
    backgroundColor: "#FBFDFC",
  },
  charCount: {
    alignSelf: "flex-end",
    color: "#7C867F",
    fontSize: 12,
  },
  submitButton: {
    marginTop: 4,
    height: 52,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
  },
  submitButtonDisabled: {
    opacity: 0.55,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  scannerFrame: {
    width: 260,
    height: 260,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: "#FFFFFF",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  scannerGuideText: {
    marginTop: 20,
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
    paddingHorizontal: 28,
  },
  closeScannerButton: {
    position: "absolute",
    top: 14,
    right: 14,
    borderRadius: 999,
    paddingHorizontal: 14,
    height: 42,
    backgroundColor: "rgba(0,0,0,0.45)",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  closeScannerText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});

export default FeedbackScreen;
