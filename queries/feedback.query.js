import { useMutation } from "@tanstack/react-query";
import { feedbackApi } from "../api/feedback.api";

export const useFeedbackQuery = {
  useCreateFeedback: () => {
    return useMutation({
      mutationFn: (data) => feedbackApi.createFeedback(data),
    });
  },
};
