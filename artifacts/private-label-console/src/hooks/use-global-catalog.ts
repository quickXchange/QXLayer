import { useQueryClient } from '@tanstack/react-query';
import { useGetGlobalExchangeCatalog, usePatchGlobalExchangeCatalog, getGetGlobalExchangeCatalogQueryKey, type GlobalCatalogEntry, type GlobalCatalogLink, type GlobalCatalogPatch } from '@workspace/api-client-react';

export type CatalogEntry = GlobalCatalogEntry;
export type CatalogLink = GlobalCatalogLink;
export type CatalogKind = GlobalCatalogEntry['kind'];
export type CatalogPatch = GlobalCatalogPatch;

export function useGlobalCatalog() { return useGetGlobalExchangeCatalog(); }
export function usePatchGlobalCatalog() {
  const qc = useQueryClient();
  return usePatchGlobalExchangeCatalog({ mutation: { onSuccess: (b) => { qc.setQueryData(getGetGlobalExchangeCatalogQueryKey(), b); } } });
}
