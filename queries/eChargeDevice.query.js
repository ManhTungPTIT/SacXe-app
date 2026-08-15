import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import eChargeDeviceApi from "../api/eChargeDevice.api";

const MY_DEVICES_KEY = ["E_CHARGE_DEVICE", "MY_DEVICES"];

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
  useFindAllDevices: ({ latitude, longitude }) => {
    const { data, isLoading, isError, ...rest } = useQuery({
      queryKey: ["E_CHARGE_DEVICE", "ALL", latitude, longitude],
      queryFn: async () => {
        try {
          const response = await eChargeDeviceApi.findAllDevices({
            latitude,
            longitude,
          });
          return response;
        } catch (error) {
          throw error;
        }
      },
      retry: false,
      refetchOnWindowFocus: false,
    });
    return { data, isLoading, isError, ...rest };
  },
  useGetMyDevices: () => {
    const { data, isLoading, isError, ...rest } = useQuery({
      queryKey: MY_DEVICES_KEY,
      queryFn: async () => {
        const response = await eChargeDeviceApi.getMyDevices();
        return response;
      },
      retry: false,
      refetchOnWindowFocus: false,
    });
    return { data, isLoading, isError, ...rest };
  },
  useClaimDevice: () => {
    const queryClient = useQueryClient();
    const { mutate, ...rest } = useMutation({
      mutationFn: ({ deviceCode }) =>
        eChargeDeviceApi.claimDevice({ deviceCode }),
      onSuccess: () =>
        queryClient.invalidateQueries({ queryKey: MY_DEVICES_KEY }),
    });
    return { mutate, ...rest };
  },
  useUpdateMyDevice: () => {
    const queryClient = useQueryClient();
    const { mutate, ...rest } = useMutation({
      mutationFn: ({ deviceCode, address, latitude, longitude }) =>
        eChargeDeviceApi.updateMyDevice({
          deviceCode,
          address,
          latitude,
          longitude,
        }),
      onSuccess: () =>
        queryClient.invalidateQueries({ queryKey: MY_DEVICES_KEY }),
    });
    return { mutate, ...rest };
  },
  useUnclaimDevice: () => {
    const queryClient = useQueryClient();
    const { mutate, ...rest } = useMutation({
      mutationFn: ({ deviceCode }) =>
        eChargeDeviceApi.unclaimDevice({ deviceCode }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: MY_DEVICES_KEY });
      },
    });
    return { mutate, ...rest };
  },
};
