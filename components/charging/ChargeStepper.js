import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Colors } from "../../constants/color";
import publicChargeSteps from "../../utils/publicChargeSteps";

const { PUBLIC_CHARGE_STEPS } = publicChargeSteps;

// Thanh 3 bước hướng dẫn của luồng sạc trụ công cộng, hiện cho người dùng lần
// đầu (chưa có giấy tờ xe lúc vào luồng — xem ChargeScreen: isPublicOnboarding).
//
// Thuần trình bày: KHÔNG bấm được. Cho bấm để nhảy bước tức là mở đường bỏ qua
// bước đăng ký giấy tờ, thứ mà cả luồng công cộng dựng ra để bắt buộc.
//
// `currentStep` do utils/publicChargeSteps.resolvePublicChargeStep tính, không
// tự suy ở đây — hai chỗ suy riêng là hai chỗ trôi khỏi nhau.
const ChargeStepper = ({ currentStep }) => {
  return (
    <View style={styles.container}>
      {PUBLIC_CHARGE_STEPS.map((label, index) => {
        const stepNumber = index + 1;
        const isDone = stepNumber < currentStep;
        const isActive = stepNumber === currentStep;
        const isLast = stepNumber === PUBLIC_CHARGE_STEPS.length;

        return (
          <React.Fragment key={label}>
            <View style={styles.step}>
              <View
                style={[
                  styles.circle,
                  isDone && styles.circleDone,
                  isActive && styles.circleActive,
                ]}
              >
                {isDone ? (
                  <Ionicons name="checkmark" size={14} color={Colors.white} />
                ) : (
                  <Text
                    style={[
                      styles.circleText,
                      isActive && styles.circleTextActive,
                    ]}
                  >
                    {stepNumber}
                  </Text>
                )}
              </View>
              <Text
                style={[
                  styles.label,
                  (isDone || isActive) && styles.labelReached,
                  isActive && styles.labelActive,
                ]}
                numberOfLines={2}
              >
                {label}
              </Text>
            </View>

            {/* Đường nối nằm NGANG HÀNG với chấm tròn, không phải giữa cả khối:
                nhãn dài hai dòng sẽ kéo khối cao lên và đường nối trôi xuống
                dưới chấm nếu căn theo khối. */}
            {isLast ? null : (
              <View style={[styles.connector, isDone && styles.connectorDone]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
};

const CIRCLE_SIZE = 26;

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  step: {
    alignItems: "center",
    width: 78,
  },
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  circleDone: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  circleActive: {
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  circleText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  circleTextActive: {
    color: Colors.primary,
  },
  label: {
    marginTop: 6,
    fontSize: 11,
    lineHeight: 14,
    textAlign: "center",
    color: Colors.textSecondary,
  },
  labelReached: {
    color: Colors.textPrimary,
  },
  labelActive: {
    color: Colors.primary,
    fontWeight: "700",
  },
  connector: {
    flex: 1,
    height: 1.5,
    marginTop: CIRCLE_SIZE / 2,
    backgroundColor: Colors.border,
  },
  connectorDone: {
    backgroundColor: Colors.primary,
  },
});

export default ChargeStepper;
