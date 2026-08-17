// Tài khoản dùng cho các đợt duyệt ứng dụng (App Store / CH Play). Người duyệt
// không thể đứng cạnh một trụ sạc thật, nên luồng nhà dân trả về đúng thông báo
// "ở xa trụ" cho họ — luồng này đã bỏ kiểm tra khoảng cách với người dùng thường.
const REVIEWER_MARKER = "reviewer";

// Đăng nhập bằng email (LoginScreen), nên email chính là "tài khoản đang nhập".
const getAccountIdentifier = (user) => {
  const email = user?.email;
  return typeof email === "string" ? email : "";
};

const isReviewerAccount = (user) =>
  getAccountIdentifier(user).toLowerCase().includes(REVIEWER_MARKER);

module.exports = {
  REVIEWER_MARKER,
  getAccountIdentifier,
  isReviewerAccount,
};
