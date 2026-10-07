import { useListMyAdminPanels, getListMyAdminPanelsQueryKey, useListMyWhiteLabelRequests, getListMyWhiteLabelRequestsQueryKey } from '@workspace/api-client-react';
import { usePrincipal } from '@/lib/principal';
import { currentDemoIntent, customerQueriesAllowed } from './demo-query-policy';

export function useAdminPanels(enabled = true) {
  const p = usePrincipal();
  return useListMyAdminPanels({ query: { queryKey: getListMyAdminPanelsQueryKey(), enabled: enabled && customerQueriesAllowed(p.demo, currentDemoIntent()), refetchInterval: 10000, refetchOnWindowFocus: true } });
}
export function useMyRequests() {
  const p = usePrincipal();
  return useListMyWhiteLabelRequests({ query: { queryKey: getListMyWhiteLabelRequestsQueryKey(), enabled: customerQueriesAllowed(p.demo, currentDemoIntent()), refetchInterval: 10000, refetchOnWindowFocus: true } });
}
export const money = (v: string | null, c: string | null) => (v == null ? 'Pending operator pricing' : `${c ?? ''} ${v}`.trim());
