import { useMutation } from "@tanstack/react-query";
import { identityApi } from "../api/identity.api";

export const useIdentity = {
  useExtractCardIdInfo: () => {
    return useMutation({
      mutationFn: (data) => identityApi.extractCardIdInfo(data),
    });
  },
  useExtractRegistrationInfo: () => {
    return useMutation({
      mutationFn: (data) => identityApi.extractRegistrationInfo(data),
    });
  },
};
