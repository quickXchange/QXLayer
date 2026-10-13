import type { QueryClient } from "@tanstack/react-query";
import { getGetSupabaseAuthSessionQueryKey } from "@workspace/api-client-react";

/**
 * Never remove active observers or the session query which determines identity.
 * Resetting drops old account data and refetches mounted observers in place.
 */
export async function resetAccountQueries(qc: QueryClient) {
  const sessionKey = getGetSupabaseAuthSessionQueryKey()[0];
  const filters = { predicate: (q: { queryKey: readonly unknown[] }) => q.queryKey[0] !== sessionKey };
  await qc.cancelQueries(filters);
  // Do not block authentication/navigation on unrelated page requests.
  void qc.resetQueries(filters);
}
