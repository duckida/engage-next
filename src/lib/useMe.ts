import { useQuery } from "@tanstack/react-query";
import { api } from "./api";

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: api.me,
    retry: false,
    staleTime: 5 * 60_000,
    // /api/me answers 200 with `user: null` when logged out, so this is a
    // stable state — never refetch it on mount/focus/reconnect.
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}
