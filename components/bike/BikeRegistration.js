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
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/color";
import { useIdentity } from "../../queries/identity.query";
import { useBike } from "../../queries/bike.query";

const BikeRegistration = () => {
  const [type, setType] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [registrationImage, setRegistrationImage] = useState(null);
  const [registrationFile, setRegistrationFile] = useState(null);
  const [choosingType, setChoosingType] = useState("takePhoto");
  const [isExtractingRegistrationInfo, setIsExtractingRegistrationInfo] =
    useState(false);
  const [bikeOwnerName, setBikeOwnerName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    const mediaLibraryPermission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

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
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
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
    setIsSubmitting(true);
    const data = {
      type,
      licensePlate,
      bikeOwnerName,
      vehicleRegistrationCard: registrationFile,
    };
    bikeRegistrationMutation.mutate(data, {
      onError: (error) => {
        console.error("Error during bike registration:", error);
        Alert.alert(
          "Thông báo",
          error.response?.data?.message ||
            "Đăng ký xe thất bại. Vui lòng thử lại.",
        );
      },
      onSuccess: (data) => {
        Alert.alert("Thành công", "Đăng ký xe thành công!");
        // Reset form
        setType("");
        setLicensePlate("");
        setBikeOwnerName("");
        setRegistrationImage(null);
        setRegistrationFile(null);
      },
      onSettled: () => {
        setIsSubmitting(false);
      },
    });
  };

  return (
    <View style={styles.container}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.container}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.title}>Đăng ký sạc xe</Text>

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
                <TouchableOpacity
                  onPress={() => {
                    choosingType === "pickImage" ? pickImage() : takePhoto();
                  }}
                  disabled={isExtractingRegistrationInfo}
                >
                  <Image
                    source={{ uri: registrationImage }}
                    style={[
                      styles.image,
                      isExtractingRegistrationInfo && styles.imageDisabled,
                    ]}
                  />
                </TouchableOpacity>
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
                    {isSubmitting ? "Đang đăng ký..." : "Đăng ký"}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 32,
    color: "#333",
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E5EA",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  imageContainer: {
    marginBottom: 16,
    position: "relative",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
    borderRadius: 8,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.primary,
    fontWeight: "500",
  },
  disabled: {
    opacity: 0.5,
  },
  imageDisabled: {
    opacity: 0.5,
  },
  imageButtons: {
    flexDirection: "row",
    gap: 12,
  },
  imageButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E5E5EA",
    borderRadius: 8,
    paddingVertical: 20,
    alignItems: "center",
    borderStyle: "dashed",
  },
  imageButtonText: {
    marginTop: 8,
    fontSize: 14,
    color: Colors.primary,
  },
  image: {
    width: "100%",
    height: 200,
    borderRadius: 8,
  },
});

export default BikeRegistration;
