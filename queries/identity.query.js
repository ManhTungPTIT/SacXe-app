import { useMutation } from "@tanstack/react-query";
import { identityApi } from "../api/identity.api";

export const useIdentity = {
  useExtractRegistrationInfo: () => {
    return useMutation({
      mutationFn: (data) => identityApi.extractRegistrationInfo(data),
    });
  },
};
