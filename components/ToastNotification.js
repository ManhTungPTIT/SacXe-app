import React, { useEffect, useRef } from "react";
import {
  Animated,
  PanResponder,
  StyleSheet,
  Text,
  View,
  Dimensions,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "../constants/color";


const ToastNotification = ({
  visible,
  title = "Thành công",
  message,
  onDismiss,
  duration = 4000,
  type = "success",
}) => {
  const insets = useSafeAreaInsets();
  const topOffset = insets.top > 0 ? insets.top + 8 : (Platform.OS === "ios" ? 50 : 30);
  const translateY = useRef(new Animated.Value(-150)).current;
  const translateX = useRef(new Animated.Value(0)).current;

  // PanResponder to track swipe gestures (up, left, right)
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (evt, gestureState) => {
        // Allow horizontal swipe or upward swipe
        if (Math.abs(gestureState.dx) > Math.abs(gestureState.dy)) {
          translateX.setValue(gestureState.dx);
        } else if (gestureState.dy < 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (
          gestureState.dy < -30 ||
          gestureState.vy < -0.5 ||
          Math.abs(gestureState.dx) > 50 ||
          Math.abs(gestureState.vx) > 0.5
        ) {
          // Swipe detected - dismiss toast
          dismissToast(gestureState.dx, gestureState.vx);
        } else {
          // Reset to default position
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 8,
          }).start();
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 8,
          }).start();
        }
      },
    })
  ).current;

  const showToast = () => {
    translateY.setValue(-150);
    translateX.setValue(0);
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 8,
    }).start();
  };

  const dismissToast = (dx = 0, vx = 0) => {
    const screenWidth = Dimensions.get("window").width;
    const isHorizontalSwipe = Math.abs(dx) > 50 || Math.abs(vx) > 0.5;

    if (isHorizontalSwipe) {
      // Vuốt ngang: chỉ animate translateX, giữ translateY tại chỗ
      const toValueX = (dx > 0 || vx > 0) ? screenWidth : -screenWidth;
      Animated.timing(translateX, {
        toValue: toValueX,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        if (onDismiss) {
          onDismiss();
        }
      });
    } else {
      // Vuốt lên: chỉ animate translateY
      Animated.timing(translateY, {
        toValue: -150,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        if (onDismiss) {
          onDismiss();
        }
      });
    }
  };

  useEffect(() => {
    if (visible) {
      showToast();

      const timer = setTimeout(() => {
        dismissToast();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      // Ensure it is hidden
      translateY.setValue(-150);
    }
  }, [visible]);

  if (!visible) return null;

  const isWarning = type === "warning";

  const currentStyles = {
    bg: isWarning ? Colors.errorBgLight2 : Colors.toastSuccessBg,
    border: isWarning ? Colors.errorBorderMuted : Colors.successBorder,
    title: isWarning ? Colors.errorTextDark : Colors.toastSuccessText,
    desc: isWarning ? Colors.errorText : Colors.toastSuccessDesc,
    icon: isWarning ? "alert-circle" : "checkmark-circle",
    iconColor: isWarning ? Colors.errorTextDark : Colors.toastSuccessText,
    bar: isWarning ? Colors.errorBorderMuted : Colors.toastProgressBar,
  };

  return (
    <Animated.View
      style={[
        styles.toastContainer,
        {
          transform: [{ translateY }, { translateX }],
          top: topOffset,
          backgroundColor: currentStyles.bg,
          borderColor: currentStyles.border,
        },
      ]}
      {...panResponder.panHandlers}
    >
      <View style={styles.toastContent}>
        {/* Left Side: Icon Wrapper */}
        <View style={[styles.iconWrapper, { backgroundColor: currentStyles.border }]}>
          <Ionicons name={currentStyles.icon} size={24} color={currentStyles.iconColor} />
        </View>

        {/* Middle: Title & Message */}
        <View style={styles.textContainer}>
          <Text style={[styles.titleText, { color: currentStyles.title }]}>{title}</Text>
          <Text style={[styles.messageText, { color: currentStyles.desc }]}>{message}</Text>
        </View>
      </View>

      {/* Top drag/dismiss pill indicator */}
      <View style={[styles.dismissIndicator, { backgroundColor: currentStyles.bar }]} />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  toastContainer: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 9999,
    backgroundColor: Colors.toastSuccessBg, // Muted Pastel Green Background
    borderWidth: 1,
    borderColor: Colors.successBorder, // Subtle Green border
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  toastContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.successBorder,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    paddingRight: 8,
  },
  titleText: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },
  messageText: {
    fontSize: 13,
    lineHeight: 18,
  },

  dismissIndicator: {
    width: 32,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.toastProgressBar,
    alignSelf: "center",
    marginTop: 8,
    marginBottom: -4,
  },
});

export default ToastNotification;
