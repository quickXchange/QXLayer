import { useQueryClient } from '@tanstack/react-query';
import { getGetTenantQueryKey, getGetTenantSubscriptionQueryKey, getListTenantsQueryKey, getGetPlatformOverviewQueryKey, getListPlatformActivityQueryKey, getListPlansQueryKey, getListAddonsQueryKey, getGetCustomerNotificationsQueryKey, getGetWhiteLabelCatalogQueryKey } from '@workspace/api-client-react';
export function useInvalidateTenant() {
  const qc = useQueryClient();
  return (tenantId?: string) => {
    if (tenantId) {
      qc.invalidateQueries({ queryKey: getGetTenantQueryKey(tenantId) });
      qc.invalidateQueries({ queryKey: getGetTenantSubscriptionQueryKey(tenantId) });
    }
    qc.invalidateQueries({ queryKey: getListTenantsQueryKey() });
    qc.invalidateQueries({ queryKey: getGetPlatformOverviewQueryKey() });
    qc.invalidateQueries({ queryKey: getListPlatformActivityQueryKey() });
    qc.invalidateQueries({ queryKey: getGetCustomerNotificationsQueryKey() });
    qc.invalidateQueries({ queryKey: getListPlansQueryKey() });
    qc.invalidateQueries({ queryKey: getListAddonsQueryKey() });
  };
}
export function useInvalidateCatalog() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: getListPlansQueryKey() });
    qc.invalidateQueries({ queryKey: getListAddonsQueryKey() });
    qc.invalidateQueries({ queryKey: getGetWhiteLabelCatalogQueryKey() });
    qc.invalidateQueries({ queryKey: getGetCustomerNotificationsQueryKey() });
    qc.invalidateQueries({ queryKey: getListPlatformActivityQueryKey() });
    qc.invalidateQueries({ queryKey: getGetPlatformOverviewQueryKey() });
    qc.invalidateQueries({ queryKey: getListTenantsQueryKey() });
    qc.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).includes('/tenants/') });
    qc.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).includes('/subscription') });
  };
}
