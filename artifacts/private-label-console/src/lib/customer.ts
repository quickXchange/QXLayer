import { useListMyAdminPanels, getListMyAdminPanelsQueryKey, useListMyWhiteLabelRequests, getListMyWhiteLabelRequestsQueryKey } from '@workspace/api-client-react';

export function useAdminPanels() {
  return useListMyAdminPanels({ query: { queryKey: getListMyAdminPanelsQueryKey(), refetchInterval: 10000, refetchOnWindowFocus: true } });
}
export function useMyRequests() {
  return useListMyWhiteLabelRequests({ query: { queryKey: getListMyWhiteLabelRequestsQueryKey(), refetchInterval: 10000, refetchOnWindowFocus: true } });
}
export const money = (v: string | null, c: string | null) => (v == null ? 'Pending operator pricing' : `${c ?? ''} ${v}`.trim());
