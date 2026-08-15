import React from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/color";

const HIGHLIGHTS = [
  "Quét mã QR để bắt đầu phiên sạc nhanh gọn.",
  "Theo dõi trạng thái sạc và dữ liệu thời gian thực.",
  "Xem bản đồ trạm sạc gần bạn và chỉ đường nhanh.",
  "Quản lý lịch sử sạc, giao dịch và số dư tài khoản.",
  "Gửi góp ý ngay trong ứng dụng để được hỗ trợ kịp thời.",
];

const AboutEnovoComponent = ({
  aboutEnovoModalVisible,
  handleCloseAboutEnovoModal,
}) => {
  return (
    <Modal
      visible={!!aboutEnovoModalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleCloseAboutEnovoModal}
    >
      <TouchableWithoutFeedback onPress={handleCloseAboutEnovoModal}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalCard}>
              <View style={styles.headerRow}>
                <View style={styles.headerLeft}>
                  <View style={styles.logoBadge}>
                    <Ionicons name="flash" size={20} color={Colors.white} />
                  </View>
                  <Text style={styles.title}>Về SạcXeĐê</Text>
                </View>
                <TouchableOpacity
                  onPress={handleCloseAboutEnovoModal}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={20} color={Colors.textSecondaryDark} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.description}>
                  Enovo là nền tảng hỗ trợ sạc xe điện an toàn và tiện lợi, được
                  xây dựng để giúp bạn tìm trạm sạc, kích hoạt phiên sạc, theo
                  dõi quá trình sử dụng và quản lý tài khoản trên cùng một ứng
                  dụng.
                </Text>

                <Text style={styles.sectionTitle}>Điểm nổi bật</Text>
                {HIGHLIGHTS.map((item, index) => (
                  <View key={String(index)} style={styles.featureItem}>
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color={Colors.primary}
                    />
                    <Text style={styles.featureText}>{item}</Text>
                  </View>
                ))}

                <Text style={styles.sectionTitle}>Cam kết dịch vụ</Text>
                <Text style={styles.description}>
                  Chúng tôi liên tục cải tiến hệ thống để tăng độ ổn định, tối
                  ưu trải nghiệm người dùng và nâng cao mức độ an toàn trong mỗi
                  phiên sạc.
                </Text>

                <Text style={styles.supportText}>
                  Cần hỗ trợ? Hay vào mục "Góp ý và thắc mắc" trong Settings để
                  gửi thông tin cho đội vận hành.
                </Text>
              </ScrollView>

              <TouchableOpacity
                style={styles.doneButton}
                onPress={handleCloseAboutEnovoModal}
              >
                <Text style={styles.doneButtonText}>Đóng</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlayBg,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  modalCard: {
    width: "100%",
    maxWidth: 440,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logoBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.textPrimaryDark,
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.bgGrayLight,
  },
  content: {
    maxHeight: 420,
  },
  description: {
    fontSize: 14,
    color: Colors.textSecondaryDark,
    lineHeight: 21,
  },
  sectionTitle: {
    marginTop: 14,
    marginBottom: 8,
    fontSize: 15,
    fontWeight: "700",
    color: Colors.textPrimaryDark,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 8,
  },
  featureText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondaryDark,
    lineHeight: 19,
  },
  supportText: {
    marginTop: 12,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  doneButton: {
    marginTop: 14,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  doneButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: "700",
  },
});

export default AboutEnovoComponent;
