import { createContext, useContext } from 'react';
import type { CurrentPrincipal } from '@workspace/api-client-react';

export const PrincipalContext = createContext<CurrentPrincipal | null>(null);
export function usePrincipal() {
  const p = useContext(PrincipalContext);
  if (!p) throw new Error('No principal');
  return p;
}
export function useCan() {
  const p = usePrincipal();
  return {
    createClients: p.role === 'super_admin',
    editModules: p.role === 'super_admin',
    editTenant: p.role === 'super_admin' || p.role === 'client_admin',
    manageCatalog: p.role === 'super_admin',
    manageSubscription: p.role === 'super_admin',
    role: p.role,
  };
}
