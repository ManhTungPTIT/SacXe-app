import { useQuery } from "@tanstack/react-query";
import eChargeDeviceApi from "../api/eChargeDevice.api";

export const useEChargeDeviceQuery = {
  useGetDevices: ({ deviceCode }) => {
    const { data, isLoading, isError, ...rest } = useQuery({
      queryKey: ["E_CHARGE_DEVICE", deviceCode],
      queryFn: async () => {
        try {
          const response = await eChargeDeviceApi.getDevice({
            deviceCode,
          });
          return response;
        } catch (error) {
          throw error;
        }
      },
      enabled: !!deviceCode,
      retry: false,
      refetchOnWindowFocus: false,
    });
    return { data, isLoading, isError, ...rest };
  },
  useFindAllDevices: ({ latitude, longitude, enabled = true }) => {
    const hasCoordinates =
      Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude));

    const { data, isLoading, isError, ...rest } = useQuery({
      queryKey: ["E_CHARGE_DEVICE", "ALL", latitude, longitude],
      queryFn: async () => {
        try {
          const response = await eChargeDeviceApi.findAllDevices({
            latitude: Number(latitude),
            longitude: Number(longitude),
          });
          return response;
        } catch (error) {
          throw error;
        }
      },
      enabled: enabled && hasCoordinates,
      retry: false,
      refetchOnWindowFocus: false,
    });
    return { data, isLoading, isError, ...rest };
  },
};
