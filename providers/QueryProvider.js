import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./queryClient";

export const QueryProvider = ({ children }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);
