import type { QueryClient } from "@tanstack/react-query";
import { getGetWhiteLabelRequestQueryKey } from "@workspace/api-client-react";

/** Apply the committed mutation response before the follow-up timeline fetch. */
export function applyOrderResponse(client: QueryClient, id: string, response: unknown) {
  const value = response as { id?: string; status?: string; order?: unknown };
  const order = value?.id && value?.status ? value : value?.order;
  if (!order) return;
  client.setQueryData(getGetWhiteLabelRequestQueryKey(id), (previous: any) =>
    previous ? { ...previous, order } : previous);
}
