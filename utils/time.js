export const vietnamDate = (date) =>
  new Date(date).toLocaleDateString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
  });

export const vietnamTime = (date) =>
  new Date(date).toLocaleTimeString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
  });

export const calculateChargingDurationFormatted = (start, end) => {
  const diffMs = new Date(end) - new Date(start);

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours}h ${minutes}m`;
};
