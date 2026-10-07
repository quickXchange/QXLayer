import { useQueryClient } from '@tanstack/react-query';
import {
  getGetProviderFoundationQueryKey, getGetTenantProviderFoundationQueryKey,
  useCreateProviderDefinition, useUpdateProviderDefinition, useCreateProviderAssignment, useUpdateProviderAssignment,
  useRemoveProviderAssignment, useSaveProviderPolicy, useRemoveProviderPolicy,
} from '@workspace/api-client-react';

export function errMsg(e: unknown): string {
  const x = e as { data?: { error?: string; message?: string }; message?: string } | null;
  return x?.data?.error ?? x?.data?.message ?? x?.message ?? 'The request failed.';
}

/** Mutations that invalidate the global bundle and the affected tenant bundle. */
export function useProviderMutations() {
  const qc = useQueryClient();
  const global = () => qc.invalidateQueries({ queryKey: getGetProviderFoundationQueryKey() });
  const both = (tenantId: string) => Promise.all([global(), qc.invalidateQueries({ queryKey: getGetTenantProviderFoundationQueryKey(tenantId) })]);
  const allTenants = () => qc.invalidateQueries({ predicate: (q) => { const k = q.queryKey[0]; return typeof k === 'string' && /^\/api\/tenants\/[^/]+\/provider-foundation$/.test(k); } });
  const catalog = () => Promise.all([global(), allTenants()]);
  const tenantVars = (_d: unknown, v: { tenantId: string }) => both(v.tenantId);
  return {
    create: useCreateProviderDefinition({ mutation: { onSuccess: () => catalog() } }),
    update: useUpdateProviderDefinition({ mutation: { onSuccess: () => catalog() } }),
    assign: useCreateProviderAssignment({ mutation: { onSuccess: tenantVars } }),
    configure: useUpdateProviderAssignment({ mutation: { onSuccess: tenantVars } }),
    unassign: useRemoveProviderAssignment({ mutation: { onSuccess: tenantVars } }),
    savePolicy: useSaveProviderPolicy({ mutation: { onSuccess: tenantVars } }),
    removePolicy: useRemoveProviderPolicy({ mutation: { onSuccess: tenantVars } }),
  };
}
