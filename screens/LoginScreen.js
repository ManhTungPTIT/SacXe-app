import React, { useCallback, useRef, useState } from "react";
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
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
} from "react-native";
import { Colors } from "../constants/color";
import { useAuth } from "../queries/auth.query";
import { useAuthStore } from "../stores/auth.store";
import Entypo from "@expo/vector-icons/Entypo";

const loginBackground = require("../assets/background.png");
const enovoLogo = require("../assets/logo.png");

const isIOS = Platform.OS === "ios";
const AUTH_INPUT_SCROLL_DELAY_MS = 120;

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scrollViewRef = useRef(null);

  const scrollToInput = useCallback((y) => {
    if (!isIOS) return;

    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y, animated: true });
    }, AUTH_INPUT_SCROLL_DELAY_MS);
  }, []);

  const loginMutation = useAuth.useLogin();
  const login = useAuthStore((state) => state.login);

  const handleLogin = () => {
    if (!email || !password) {
      Alert.alert("Thông báo", "Vui lòng nhập đầy đủ email và mật khẩu.");
      return;
    }
    setIsSubmitting(true);
    loginMutation.mutate(
      {
        email,
        password,
      },
      {
        onError: (error) => {
          console.error("Login error:", error);
          Alert.alert(
            "Thông báo",
            error.response?.data?.message ||
            "Đăng nhập thất bại. Vui lòng thử lại.",
          );
        },
        onSuccess: async (data) => {
          // Lưu access token, refresh token và user vào SecureStore
          await login(data.accessToken, data.refreshToken, data.user);
        },
        onSettled: () => {
          setIsSubmitting(false);
        },
      },
    );
  };

  return (
    <ImageBackground
      source={loginBackground}
      style={styles.background}
      resizeMode="cover"
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView
            style={styles.keyboardWrap}
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
              <Image source={enovoLogo} style={styles.logo} resizeMode="contain" />
              <View style={styles.container}>
                <Text style={styles.title}>Đăng nhập</Text>

                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor={Colors.textPlaceholder}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  onFocus={() => scrollToInput(80)}
                />

                <View style={styles.passwordField}>
                  <TextInput
                    style={[styles.input, styles.passwordInput]}
                    placeholder="Mật khẩu"
                    placeholderTextColor={Colors.textPlaceholder}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!isPasswordVisible}
                    onFocus={() => scrollToInput(190)}
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

                <TouchableOpacity
                  style={styles.button}
                  disabled={isSubmitting}
                  onPress={handleLogin}
                >
                  <Text style={styles.buttonText}>
                    {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.linkButton}
                  onPress={() => navigation.navigate("Register")}
                >
                  <Text style={styles.linkText}>
                    Chưa có tài khoản?{" "}
                    <Text style={styles.linkHighlight}>Đăng ký</Text>
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
  keyboardWrap: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingBottom: 96,
  },
  container: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.cardBorderGreen,
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
});

export default LoginScreen;
