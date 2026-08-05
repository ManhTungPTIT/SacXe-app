import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ImageBackground,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
  Alert,
} from "react-native";
import { Colors } from "../constants/color";
import Entypo from "@expo/vector-icons/Entypo";
import { useAuth } from "../queries/auth.query";
import { TouchableWithoutFeedback } from "react-native";

const registerBackground = require("../assets/background.png");
const sacXeLogo = require("../assets/logo.png");

const isIOS = Platform.OS === "ios";
const AUTH_INPUT_SCROLL_DELAY_MS = 120;

const RegisterScreen = ({ navigation }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] =
    useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scrollViewRef = useRef(null);

  const scrollToInput = useCallback((y) => {
    if (!isIOS) return;

    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y, animated: true });
    }, AUTH_INPUT_SCROLL_DELAY_MS);
  }, []);

  const registerMutation = useAuth.useRegister();

  const handleRegister = () => {
    if (password !== confirmPassword) {
      Alert.alert("Thông báo", "Mật khẩu và xác nhận mật khẩu không khớp.");
      return;
    }
    if (!name || !email || !password) {
      Alert.alert("Thông báo", "Vui lòng điền đầy đủ thông tin bắt buộc.");
      return;
    }

    const trimmedPhone = phoneNumber.trim();
    let finalPhone = "";
    if (trimmedPhone) {
      const cleanPhone = trimmedPhone.replace(/[\s-]/g, "");
      const vnf_regex = /^(0|\+84|84)(3|5|7|8|9)([0-9]{8})$/;
      if (!vnf_regex.test(cleanPhone)) {
        Alert.alert(
          "Thông báo",
          "Số điện thoại không hợp lệ. Vui lòng nhập đúng định dạng Việt Nam.",
        );
        return;
      }
      finalPhone = cleanPhone;
    }

    setIsSubmitting(true);
    registerMutation.mutate(
      {
        name,
        email,
        password,
        phoneNumber: finalPhone,
      },
      {
        onSuccess: (data) => {
          setName("");
          setEmail("");
          setPassword("");
          setConfirmPassword("");
          navigation.navigate("Login");
        },
        onError: (error) => {
          Alert.alert(
            "Thông báo",
            error.response?.data?.message ||
            "Đăng ký thất bại. Vui lòng thử lại.",
          );
        },
        onSettled: () => {
          setIsSubmitting(false);
        },
      },
    );
  };

  return (
    <ImageBackground
      source={registerBackground}
      style={styles.background}
      resizeMode="cover"
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView
            style={styles.keyboardView}
            behavior={isIOS ? undefined : "height"}
            enabled={!isIOS}
          >
            <ScrollView
              ref={scrollViewRef}
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={isIOS ? "interactive" : "none"}
              automaticallyAdjustKeyboardInsets={isIOS}
            >
              <Image source={sacXeLogo} style={styles.logo} resizeMode="contain" />
              <View style={styles.container}>
                <Text style={styles.title}>Đăng ký</Text>

                {/* <TextInput
                  style={styles.input}
                  placeholder="Số điện thoại (Không bắt buộc)"
                  placeholderTextColor={Colors.textPlaceholder}
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                /> */}

                <TextInput
                  style={styles.input}
                  placeholder="Tên đầy đủ"
                  placeholderTextColor={Colors.textPlaceholder}
                  value={name}
                  onChangeText={setName}
                  keyboardType="default"
                  autoCapitalize="none"
                  onFocus={() => scrollToInput(90)}
                />

                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor={Colors.textPlaceholder}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  onFocus={() => scrollToInput(190)}
                />

                <View style={styles.passwordField}>
                  <TextInput
                    style={[styles.input, styles.passwordInput]}
                    placeholder="Mật khẩu"
                    keyboardType="password"
                    placeholderTextColor={Colors.textPlaceholder}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!isPasswordVisible}
                    onFocus={() => scrollToInput(320)}
                  />
                  <TouchableOpacity
                    style={styles.passwordToggle}
                    onPress={() => setIsPasswordVisible((prev) => !prev)}
                    activeOpacity={0.7}
                  >
                    <Entypo
                      name={isPasswordVisible ? "eye" : "eye-with-line"}
                      size={20}
                      color={Colors.primary}
                      style={styles.passwordToggleIcon}
                    />
                  </TouchableOpacity>
                </View>

                <View style={styles.passwordField}>
                  <TextInput
                    style={[styles.input, styles.passwordInput]}
                    placeholder="Xác nhận mật khẩu"
                    placeholderTextColor={Colors.textPlaceholder}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!isConfirmPasswordVisible}
                    onFocus={() => scrollToInput(430)}
                  />
                  <TouchableOpacity
                    style={styles.passwordToggle}
                    onPress={() => setIsConfirmPasswordVisible((prev) => !prev)}
                    activeOpacity={0.7}
                  >
                    <Entypo
                      name={isConfirmPasswordVisible ? "eye" : "eye-with-line"}
                      size={20}
                      color={Colors.primary}
                      style={styles.passwordToggleIcon}
                    />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.button}
                  onPress={handleRegister}
                  disabled={isSubmitting}
                >
                  <Text style={styles.buttonText}>
                    {isSubmitting ? "Đang đăng ký..." : "Đăng ký"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.linkButton}
                  onPress={() => navigation.navigate("Login")}
                >
                  <Text style={styles.linkText}>
                    Đã có tài khoản?{" "}
                    <Text style={styles.linkHighlight}>Đăng nhập</Text>
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  overlay: {
    backgroundColor: Colors.grayTranslucent34,
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingBottom: 180,
  },
  container: {
    borderWidth: 1,
    borderColor: Colors.borderGreenLight,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 24,
    shadowColor: Colors.shadowGreen,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 5,
  },
  logo: {
    width: "150%",
    height: 150,
    alignSelf: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 32,
    color: Colors.secondary,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.borderGreenLight,
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
    color: Colors.textPrimary,
  },
  passwordField: {
    position: "relative",
  },
  passwordInput: {
    paddingRight: 72,
  },
  passwordToggle: {
    position: "absolute",
    right: 10,
    top: 11,
  },
  passwordToggleIcon: {
    opacity: 0.95,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
    shadowColor: Colors.shadowGreen,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "600",
  },
  linkButton: {
    marginTop: 24,
    alignItems: "center",
  },
  linkText: {
    fontSize: 14,
    color: Colors.secondary,
  },
  linkHighlight: {
    color: Colors.secondary,
    fontWeight: "600",
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.secondary,
    marginBottom: 8,
  },
  imageButtons: {
    backgroundColor: Colors.whiteTranslucent,
    borderRadius: 12,
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
    width: "100%",
    aspectRatio: "16/9",
  },
  imageButton: {
    flex: 1,
    height: "100%",
    borderWidth: 1,
    borderColor: Colors.borderGreenLight,
    borderRadius: 12,
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
    borderStyle: "dashed",
  },
  imageButtonText: {
    marginTop: 8,
    fontSize: 14,
    color: Colors.primary,
  },
  imageContainer: {
    width: "100%",
    marginBottom: 16,
    position: "relative",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
    borderRadius: 12,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.secondary,
    fontWeight: "500",
  },
  disabled: {
    opacity: 0.5,
  },
  imageDisabled: {
    opacity: 0.5,
  },
  image: {
    width: "100%",
    aspectRatio: "16/9",
    borderRadius: 12,
    marginBottom: 8,
  },
});

export default RegisterScreen;
