import { useGetPlatformManagement, getGetPlatformManagementQueryKey } from '@workspace/api-client-react';

export interface PmCustomer { id: string; name: string; email: string | null; status: string; createdAt: string | null; tenantIds: string[] }
export interface PmProject { tenantId: string; customerIds: string[]; planId: string | null; planName: string | null; addonIds: string[]; logoUrl: string | null; updatedAt: string }
export interface PmAudit { id: string; tenantId: string | null; actorId: string; eventType: string; description: string; resource: string | null; result: string | null; createdAt: string }
export interface PmProvider { id: string; name: string; category: string; capabilities: string[]; status: string; logoUrl: string | null; implemented: boolean }
export interface Pm { customers: PmCustomer[]; projects: PmProject[]; audit: PmAudit[]; providers: PmProvider[]; directoryAvailable: boolean; customerTotal: number | null; directoryError: string | null }

/** Owner-only read-only aggregate. */
export function usePlatform() {
  const q = useGetPlatformManagement({ query: { queryKey: getGetPlatformManagementQueryKey(), staleTime: 30000 } });
  return { ...q, pm: q.data as Pm | undefined };
}

export const uniq = (xs: string[]) => Array.from(new Set(xs));

/** Real subscription usage: unique customers for assigned projects, tenant count separately. */
export function usage(projects: PmProject[], match: (p: PmProject) => boolean) {
  const hit = projects.filter(match);
  return { customers: uniq(hit.flatMap((p) => p.customerIds)).length, tenants: hit.length };
}
export const unassignedProjects = (projects: PmProject[]) => projects.filter((p) => !p.planId).length;
export const publicSiteHref = (slug: string) => `/private-label-website/${slug}`;
