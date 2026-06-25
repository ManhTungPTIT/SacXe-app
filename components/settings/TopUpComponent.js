import React from "react";
import {
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { Colors } from "../../constants/color";

const TOP_UP_OPTIONS = [50000, 100000, 200000, 300000, 400000, 500000];

const TopUpComponent = ({
  topUpModalVisible,
  handleCloseTopUpModal,
  qrGenerated,
  timeLeft,
  selectedAmount,
  setSelectedAmount,
  customAmount,
  setCustomAmount,
  handleConfirmTopUp,
  setQrGenerated,
  setTimeLeft,
}) => {
  return (
    <Modal
      visible={topUpModalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleCloseTopUpModal}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            {qrGenerated ? (
              <View style={styles.qrContainer}>
                <Text style={styles.modalTitle}>QR Code nạp tiền</Text>
                <Text style={styles.qrCountdownText}>
                  Hết hạn sau: {timeLeft}s. Vui lòng quét mã trước khi hết hạn
                  để nạp tiền.
                </Text>
                <Image
                  source={{ uri: qrGenerated }}
                  style={styles.qrImage}
                  resizeMode="contain"
                />
                <TouchableOpacity
                  style={styles.qrCloseButton}
                  onPress={() => {
                    handleCloseTopUpModal();
                    setCustomAmount("");
                    setSelectedAmount(null);
                    setQrGenerated(false);
                    setTimeLeft(0);
                  }}
                >
                  <Text style={styles.qrCloseButtonText}>Đóng</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={styles.modalTitle}>Chọn mức nạp</Text>
                <View style={styles.topUpOptionsContainer}>
                  {TOP_UP_OPTIONS.map((amount) => {
                    const isSelected =
                      selectedAmount === amount && customAmount === "";
                    return (
                      <TouchableOpacity
                        key={amount}
                        style={[
                          styles.topUpOption,
                          isSelected && styles.topUpOptionSelected,
                        ]}
                        onPress={() => {
                          setSelectedAmount(amount);
                          setCustomAmount("");
                        }}
                      >
                        <Text
                          style={[
                            styles.topUpAmountText,
                            isSelected && styles.topUpAmountTextSelected,
                          ]}
                        >
                          {amount.toLocaleString("vi-VN")}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {/* // Nhập số tiền khác */}
                <View style={styles.customAmountContainer}>
                  <Text style={styles.inputLabel}>Số tiền khác</Text>
                  <TextInput
                    style={styles.input}
                    value={customAmount}
                    onChangeText={(text) => {
                      const numericText = text.replace(/[^0-9]/g, "");
                      setCustomAmount(numericText);
                      const numericValue = parseInt(numericText, 10);
                      setSelectedAmount(
                        isNaN(numericValue) ? null : numericValue,
                      );
                    }}
                    placeholder="Nhập số tiền khác"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                    returnKeyType="done"
                    onSubmitEditing={Keyboard.dismiss}
                  />
                </View>
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={handleCloseTopUpModal}
                  >
                    <Text style={styles.cancelButtonText}>Hủy</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    disabled={!selectedAmount}
                    style={[styles.modalButton, styles.saveButton]}
                    onPress={handleConfirmTopUp}
                  >
                    <Text style={styles.saveButtonText}>Tiếp tục</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 32,
  },
  logoutButton: {
    backgroundColor: "#FF3B30",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: "center",
    width: "100%",
  },
  logoutButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 24,
    width: "85%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#333",
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: "#333",
    backgroundColor: "#f9f9f9",
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
    backgroundColor: "#e0e0e0",
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  saveButton: {
    backgroundColor: Colors.primary,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
  topUpOptionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  topUpOption: {
    width: "48%",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 12,
    backgroundColor: "#fff",
  },
  topUpOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: "rgba(26,73,215,0.08)",
  },
  topUpAmountText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  topUpAmountTextSelected: {
    color: Colors.primary,
  },
  qrContainer: {
    alignItems: "center",
  },
  qrCountdownText: {
    marginBottom: 10,
    fontWeight: "600",
    textAlign: "center",
    color: "#333",
  },
  qrImage: {
    width: 300,
    height: 300,
    marginBottom: 20,
  },
  qrCloseButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  qrCloseButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
  customAmountContainer: {
    marginBottom: 16,
  },
});

export default TopUpComponent;
