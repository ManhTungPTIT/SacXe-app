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
                <Text style={styles.modalTitle}>QR Code nạp tài khoản sạc</Text>
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
                        <View style={styles.topUpAmountRow}>
                          <Text
                            style={[
                              styles.topUpAmountText,
                              isSelected && styles.topUpAmountTextSelected,
                            ]}
                          >
                            {amount.toLocaleString("vi-VN")}
                          </Text>
                          <Text
                            style={[
                              styles.topUpAmountUnit,
                              isSelected && styles.topUpAmountUnitSelected,
                            ]}
                          >
                            {" "}VND
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {/* // Nhập số tiền khác */}
                <View style={styles.customAmountContainer}>
                  <Text style={styles.inputLabel}>Số tiền khác</Text>
                  <View style={styles.inputWrapper}>
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
                      placeholderTextColor={Colors.textMuted}
                      keyboardType="numeric"
                      returnKeyType="done"
                      onSubmitEditing={Keyboard.dismiss}
                    />
                    <Text style={styles.inputUnitLabel}>VND</Text>
                  </View>
                  <Text style={styles.noteText}>
                    * Tiền trong tài khoản sạc không thể chuyển lại về tài khoản ngân hàng của bạn.
                  </Text>
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
                    style={[
                      styles.modalButton, 
                      styles.saveButton,
                      !selectedAmount && styles.saveButtonDisabled
                    ]}
                    onPress={handleConfirmTopUp}
                  >
                    <Text style={[
                      styles.saveButtonText,
                      !selectedAmount && styles.saveButtonTextDisabled
                    ]}>
                      Tiếp tục
                    </Text>
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
    backgroundColor: Colors.white,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 32,
  },
  logoutButton: {
    backgroundColor: Colors.danger,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: "center",
    width: "100%",
  },
  logoutButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlayBg,
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: Colors.white,
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
    color: Colors.textPrimary,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  inputWrapper: {
    position: "relative",
    justifyContent: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    paddingRight: 52,
    fontSize: 15,
    color: Colors.textPrimary,
    backgroundColor: Colors.cardBgLight,
    marginBottom: 16,
  },
  inputUnitLabel: {
    position: "absolute",
    right: 12,
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textSecondary,
    top: 0,
    bottom: 16,
    textAlignVertical: "center",
    lineHeight: 44,
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
  saveButton: {
    backgroundColor: Colors.primary,
  },
  saveButtonDisabled: {
    backgroundColor: Colors.cardBgGreen,
    borderWidth: 1,
    borderColor: Colors.borderGreenLight,
    opacity: 0.8,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.white,
  },
  saveButtonTextDisabled: {
    color: Colors.primary,
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
    borderColor: Colors.borderLight,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 12,
    backgroundColor: Colors.white,
  },
  topUpOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.blueTranslucent08,
  },
  topUpAmountRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  topUpAmountText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  topUpAmountTextSelected: {
    color: Colors.primary,
  },
  topUpAmountUnit: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  topUpAmountUnitSelected: {
    color: Colors.primary,
  },
  qrContainer: {
    alignItems: "center",
  },
  qrCountdownText: {
    marginBottom: 10,
    fontWeight: "600",
    textAlign: "center",
    color: Colors.textPrimary,
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
    color: Colors.white,
  },
  customAmountContainer: {
    marginBottom: 16,
  },
  noteText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: "italic",
    marginTop: 4,
    lineHeight: 16,
  },
});

export default TopUpComponent;
