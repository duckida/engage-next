import { useQuery } from "@tanstack/react-query";
import { api, ApiError } from "./api";

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: api.me,
    // Never retry: /api/me answers 200 with `user: null` when logged out, so a
    // rejection means the server itself is unreachable. Retrying just spins.
    retry: false,
    staleTime: 5 * 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

/** True when the API is missing entirely rather than merely unauthenticated. */
export function isApiMissing(error: unknown): boolean {
  const code = (error as ApiError | undefined)?.code;
  return code === "no_api" || code === "offline";
}
