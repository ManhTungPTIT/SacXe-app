import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Colors } from "../constants/color";
import { useAuth } from "../queries/auth.query";
import { useAuthStore } from "../stores/auth.store";

const loginBackground = require("../assets/background.png");

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const loginMutation = useAuth.useLogin();
  const login = useAuthStore((state) => state.login);

  const handleLogin = () => {
    if (!email || !password) {
      alert("Vui lòng nhập đầy đủ email và mật khẩu.");
      return;
    }
    loginMutation.mutate(
      {
        email,
        password,
      },
      {
        onError: (error) => {
          alert(
            error.response?.data?.message ||
              "Đăng nhập thất bại. Vui lòng thử lại.",
          );
        },
        onSuccess: async (data) => {
          // Lưu access token, refresh token và user vào SecureStore
          await login(data.accessToken, data.refreshToken, data.user);
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
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          style={styles.keyboardWrap}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.container}>
            <Text style={styles.title}>Đăng nhập</Text>

            <TextInput
              style={styles.input}
              placeholder="Email hoặc số điện thoại"
              placeholderTextColor="#7A8087"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <TextInput
              style={styles.input}
              placeholder="Mật khẩu"
              placeholderTextColor="#7A8087"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <TouchableOpacity style={styles.button} onPress={handleLogin}>
              <Text style={styles.buttonText}>Đăng nhập</Text>
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
        </KeyboardAvoidingView>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  overlay: {
    backgroundColor: "rgba(56, 55, 55, 0.34)",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  keyboardWrap: {
    width: "100%",
  },
  container: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#D8EFDC",
    paddingHorizontal: 18,
    paddingVertical: 24,
    shadowColor: "#0E4120",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 5,
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
    borderColor: "#D7E9DB",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
    color: "#1D1D1F",
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#0E4120",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonText: {
    color: "#FFFFFF",
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
