const normalizeAddress = (address) => {
  if (!address) return "";

  return (
    address
      // lowercase
      .toLowerCase()

      // bỏ dấu tiếng Việt
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")

      // đ -> d
      .replace(/đ/g, "d")

      // bỏ dấu câu
      .replace(/[^\w\s]/g, "")

      // bỏ khoảng trắng dư
      .replace(/\s+/g, " ")
      .trim()
  );
};

export default normalizeAddress;
