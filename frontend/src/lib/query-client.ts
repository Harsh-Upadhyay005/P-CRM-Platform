import { QueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // 30 s
      retry: (failureCount, error) => {
        // Don't retry for 4xx errors generally, except 429
        if (error instanceof AxiosError && error.response && error.response.status < 500 && error.response.status !== 429) {
            return false;
        }
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
  },
});
