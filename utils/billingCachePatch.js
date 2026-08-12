// Phần THUẦN của việc vá cache react-query khi nhận `charge_billing_update`.
//
// Tách khỏi RootNavigator để kiểm thử được bằng `node --test`; phần còn lại ở
// component chỉ là lớp bọc gọi queryClient.setQueryData/setQueriesData.
//
// Vì sao cần vá cache thay vì refetch: màn Trang chủ đọc `["latestHistory"]`,
// màn Lịch sử đọc `["history", page, limit]`. Không vá thì hai màn đó đứng yên
// tới lần refetch kế tiếp (chỉ xảy ra mỗi khi năng lượng tăng 0.02 kWh) nên
// luôn thấp hơn con số ở màn phiên sạc — màn đó đọc thẳng `wave_data`.
//
// Gói `type: "energy_update"` là của phiên NHÀ DÂN: điện miễn phí nên chỉ mang
// năng lượng, không có price/billedAmount/balance. Nó phải vá được năng lượng mà
// không đụng gì tới các trường tiền.

const normalizeId = (value) =>
  value === undefined || value === null ? "" : String(value).trim();

// Số tiền đại diện của một phiên, khớp `$max: ["$price","$billedAmount"]` mà
// backend dùng khi gộp thống kê tháng (history.service.js).
const getSessionAmount = (history) =>
  Math.max(
    Number(history?.lastKnownPrice) || 0,
    Number(history?.billedAmount) || 0,
    Number(history?.price) || 0,
  );

// Năng lượng đại diện, khớp `$max: ["$energy","$lastKnownEnergy"]`.
const getSessionEnergy = (history) =>
  Math.max(
    Number(history?.lastKnownEnergy) || 0,
    Number(history?.energy) || 0,
  );

// Áp payload lên MỘT bản ghi phiên. Trường nào payload không mang thì giữ
// nguyên — nhờ vậy gói energy_update (chỉ có `energy`) không xoá mất giá tiền.
// `price`/`energy` chốt chỉ được ghi khi payload báo isFinal.
const applyBillingToHistory = (history, data) => ({
  ...history,
  billedAmount: data?.billedAmount ?? history.billedAmount,
  lastKnownPrice: data?.price ?? history.lastKnownPrice,
  lastKnownEnergy: data?.energy ?? history.lastKnownEnergy,
  price: data?.isFinal ? (data?.price ?? history.price) : history.price,
  energy: data?.isFinal ? (data?.energy ?? history.energy) : history.energy,
  totalTime: data?.totalTime ?? history.totalTime,
  stopReason: data?.stopReason ?? history.stopReason,
});

// Vá cache `["latestHistory"]`. Trả về oldData nguyên vẹn nếu gói không thuộc
// phiên đang nằm trong cache.
const patchLatestHistory = (oldData, data) => {
  const incomingHistoryId = normalizeId(data?.historyId);
  const cachedHistoryId = normalizeId(oldData?._id);

  if (!oldData || (incomingHistoryId && cachedHistoryId !== incomingHistoryId)) {
    return oldData;
  }

  return applyBillingToHistory(oldData, data);
};

// Vá cache `["history", page, limit]`: cập nhật đúng phiên trong danh sách rồi
// cộng phần CHÊNH vào monthlyStats/totalStats, để thống kê tháng không đứng yên
// trong lúc phiên vẫn chạy. Cộng delta chứ không tính lại tổng vì cache chỉ giữ
// một trang, không đủ dữ liệu để tính lại.
const patchHistoryList = (oldData, data) => {
  const incomingHistoryId = normalizeId(data?.historyId);

  if (!incomingHistoryId || !Array.isArray(oldData?.histories)) {
    return oldData;
  }

  let amountDelta = 0;
  let energyDelta = 0;

  const histories = oldData.histories.map((history) => {
    if (normalizeId(history?._id) !== incomingHistoryId) {
      return history;
    }

    const updated = applyBillingToHistory(history, data);
    amountDelta += getSessionAmount(updated) - getSessionAmount(history);
    energyDelta += getSessionEnergy(updated) - getSessionEnergy(history);
    return updated;
  });

  if (!amountDelta && !energyDelta) {
    return { ...oldData, histories };
  }

  const applyDelta = (stats) =>
    stats
      ? {
          ...stats,
          totalAmount: (Number(stats.totalAmount) || 0) + amountDelta,
          totalEnergy: (Number(stats.totalEnergy) || 0) + energyDelta,
        }
      : stats;

  return {
    ...oldData,
    histories,
    monthlyStats: applyDelta(oldData.monthlyStats),
    totalStats: applyDelta(oldData.totalStats),
  };
};

// Gói CHỈ mang năng lượng (phiên nhà dân) -> không có ví để cập nhật, không có
// cảnh báo hết tiền, không có auto-stop. Phía component phải dừng sau khi vá
// cache, nếu không sẽ invalidate ["ME"] ở mọi gói telemetry (~5s) suốt phiên.
const isEnergyOnlyUpdate = (data) => data?.type === "energy_update";

module.exports = {
  getSessionAmount,
  getSessionEnergy,
  applyBillingToHistory,
  patchLatestHistory,
  patchHistoryList,
  isEnergyOnlyUpdate,
};
