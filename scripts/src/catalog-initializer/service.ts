import { approvedKeys, approvedProducts } from "./approved";

export interface CatalogClient {
  query(sql: string, values?: unknown[]): Promise<{ rows: Record<string, unknown>[]; rowCount?: number | null }>;
}
export interface CatalogOptions { nodeEnv?: string; deployment?: string; apply?: boolean; restoreVisibility?: boolean }
export interface CatalogAction { key: string; action: "insert" | "restore_visibility" | "preserve_hidden" | "unchanged" }

export function assertDevelopment(nodeEnv: string | undefined, deployment = process.env.REPLIT_DEPLOYMENT) {
  if (nodeEnv !== "development" || deployment === "1") throw new Error("Catalog initialization is Development-only; no Production execution is supported.");
}

// The only write targets are reviewed landing_products keys. No DDL or generic import.
export async function initializeCatalog(client: CatalogClient, options: CatalogOptions = {}): Promise<CatalogAction[]> {
  assertDevelopment(options.nodeEnv, options.deployment);
  await client.query(options.apply ? "BEGIN" : "BEGIN READ ONLY");
  try {
    const modules = await client.query("SELECT key FROM module_catalog WHERE key=ANY($1::text[])", [approvedKeys]);
    const found = new Set(modules.rows.map(r => r.key));
    const missing = approvedKeys.filter(key => !found.has(key));
    if (missing.length) throw new Error(`Missing approved module dependencies: ${missing.join(", ")}. No other tables will be initialized.`);
    const existing = await client.query(
      `SELECT key,visible FROM landing_products WHERE key=ANY($1::text[])${options.apply ? " FOR UPDATE" : ""}`, [approvedKeys]);
    const byKey = new Map(existing.rows.map(r => [r.key, r]));
    const plan: CatalogAction[] = approvedProducts.map(p => ({
      key: p.key,
      action: !byKey.has(p.key) ? "insert" :
        byKey.get(p.key)?.visible === false ? (options.restoreVisibility ? "restore_visibility" : "preserve_hidden") : "unchanged",
    }));
    if (options.apply) for (const action of plan) {
      if (action.action === "insert") {
        const p = approvedProducts.find(p => p.key === action.key)!;
        await client.query(`INSERT INTO landing_products
          (key,visible,name,description,icon,starting_price,setup_fee,currency,billing_period,status,cta_label,display_order)
          VALUES ($1,true,$2,$3,$4,NULL,NULL,$5,$6,$7,$8,$9) ON CONFLICT (key) DO NOTHING`,
          [p.key, p.name, p.description, p.icon, p.currency, p.billingPeriod, p.status, p.ctaLabel, p.displayOrder]);
      } else if (action.action === "restore_visibility") {
        await client.query("UPDATE landing_products SET visible=true WHERE key=$1 AND visible=false", [action.key]);
      }
    }
    await client.query("COMMIT");
    return plan;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}
