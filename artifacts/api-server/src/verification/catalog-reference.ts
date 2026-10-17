import type { DatabaseClient } from "@workspace/db";
import reference from "../products/exchange/catalog-reference.json";
import { validateCatalogEntry, validateCatalogMetadata } from "../products/exchange/global-catalog";
import type { GlobalCatalogEntry } from "@workspace/api-zod";

/** Operator-invoked import, never startup seeding. Conflicts preserve existing choices. */
export async function seedReferenceCatalog(client: DatabaseClient) {
  for (const e of reference.entries) {
    validateCatalogEntry(e as GlobalCatalogEntry);
    await client.query(`INSERT INTO global_exchange_catalog(kind,id,code,name,status,logo_url,metadata)
      VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING`,
      [e.kind,e.id,e.code,e.name,e.status,e.logoUrl,JSON.stringify(e.metadata)]);
    if (e.kind==="assets") await client.query("INSERT INTO asset_catalog(id,symbol,name) VALUES($1,$2,$3) ON CONFLICT DO NOTHING",[e.id,e.code,e.name]);
    if (e.kind==="networks") await client.query("INSERT INTO network_catalog(id,name,testnet) VALUES($1,$2,$3) ON CONFLICT DO NOTHING",[e.id,e.name,"testnet" in e.metadata && e.metadata.testnet===true]);
  }
  for (const l of reference.links) {
    validateCatalogMetadata(l.kind,l.metadata);
    await client.query(`INSERT INTO global_exchange_catalog_links(id,kind,source_id,target_id,enabled,verified,metadata)
      VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING`,
      [l.id,l.kind,l.sourceId,l.targetId,l.enabled,l.verified,JSON.stringify(l.metadata)]);
    if (l.kind==="asset_network") {
      const m=l.metadata as {legacyAssetNetworkId:string};
      await client.query("INSERT INTO asset_network_catalog(id,asset_id,network_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING",[m.legacyAssetNetworkId,l.sourceId,l.targetId]);
    }
  }
}
