import { useQueryClient } from '@tanstack/react-query';
import { getGetTenantQueryKey, getListTenantsQueryKey, getGetPlatformOverviewQueryKey, getListPlatformActivityQueryKey } from '@workspace/api-client-react';
export function useInvalidateTenant() {
  const qc = useQueryClient();
  return (tenantId?: string) => {
    if (tenantId) qc.invalidateQueries({ queryKey: getGetTenantQueryKey(tenantId) });
    qc.invalidateQueries({ queryKey: getListTenantsQueryKey() });
    qc.invalidateQueries({ queryKey: getGetPlatformOverviewQueryKey() });
    qc.invalidateQueries({ queryKey: getListPlatformActivityQueryKey() });
  };
}
