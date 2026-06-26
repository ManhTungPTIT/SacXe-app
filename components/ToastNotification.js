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
}) => {
  const insets = useSafeAreaInsets();
  const topOffset = insets.top > 0 ? insets.top + 8 : (Platform.OS === "ios" ? 50 : 30);
  const translateY = useRef(new Animated.Value(-150)).current;

  // PanResponder to track swipe up gestures
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (evt, gestureState) => {
        // Only allow swiping up (negative dy)
        if (gestureState.dy < 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dy < -30 || gestureState.vy < -0.5) {
          // Swipe up detected - dismiss toast
          dismissToast();
        } else {
          // Reset to default position
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 8,
          }).start();
        }
      },
    })
  ).current;

  const showToast = () => {
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 8,
    }).start();
  };

  const dismissToast = () => {
    Animated.timing(translateY, {
      toValue: -150,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      if (onDismiss) {
        onDismiss();
      }
    });
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

  return (
    <Animated.View
      style={[
        styles.toastContainer,
        {
          transform: [{ translateY }],
          top: topOffset,
        },
      ]}
      {...panResponder.panHandlers}
    >
      <View style={styles.toastContent}>
        {/* Left Side: Green Icon Wrapper */}
        <View style={styles.iconWrapper}>
          <Ionicons name="checkmark-circle" size={24} color={Colors.toastSuccessText} />
        </View>

        {/* Middle: Title & Message */}
        <View style={styles.textContainer}>
          <Text style={styles.titleText}>{title}</Text>
          <Text style={styles.messageText}>{message}</Text>
        </View>
      </View>
      
      {/* Top drag/dismiss pill indicator */}
      <View style={styles.dismissIndicator} />
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
    color: Colors.toastSuccessText, // Deep Green text
    marginBottom: 2,
  },
  messageText: {
    fontSize: 13,
    color: Colors.toastSuccessDesc, // Dark gray/green text
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
