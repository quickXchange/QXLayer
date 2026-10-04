import { createContext, useContext } from 'react';
import type { CurrentPrincipal } from '@workspace/api-client-react';

export const PrincipalContext = createContext<CurrentPrincipal | null>(null);
export function usePrincipal() {
  const p = useContext(PrincipalContext);
  if (!p) throw new Error('No principal');
  return p;
}
export type Permission = 'branding.manage' | 'domains.manage' | 'configuration.manage' | 'resources.manage';
export function useCan(tenantId?: string) {
  const p = usePrincipal();
  const isSuper = p.role === 'super_admin';
  const m = tenantId && p.memberships ? p.memberships.find((x) => x.tenantId === tenantId) : undefined;
  // Legacy principals without memberships fall back to role and tenantId.
  const legacyOk = !p.memberships && (!tenantId || p.tenantId === tenantId);
  const role = isSuper ? p.role : m ? m.role : legacyOk || !tenantId ? p.role : 'unassigned';
  const perms: string[] = m ? m.permissions : [];
  const isAdmin = isSuper || role === 'client_admin';
  return {
    createClients: isSuper,
    editModules: isSuper,
    editTenant: isAdmin,
    manageCatalog: isSuper,
    manageSubscription: isSuper,
    manageStaffGrants: isAdmin,
    has: (perm: Permission) => isAdmin || (role === 'staff' && perms.includes(perm)),
    permissions: perms,
    role,
  };
}
