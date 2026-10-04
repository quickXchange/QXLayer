import { withDatabase, type DatabaseClient } from "@workspace/db";
import { UpdateLandingProductBody } from "@workspace/api-zod";
import type { z } from "zod";
import { contextFor, requireSuperAdmin, type Principal } from "../authentication/service";
import { audit } from "../../lib/audit";
import { HttpError } from "../../lib/errors";

export type LandingProductInput = z.infer<typeof UpdateLandingProductBody>;
const projection = `key,visible,name,description,icon,starting_price AS "startingPrice",
  setup_fee AS "setupFee",currency,billing_period AS "billingPeriod",status,
  cta_label AS "ctaLabel",display_order AS "displayOrder",
  CASE WHEN key='crypto_exchange' THEN 'sandbox_only' ELSE 'planned' END AS readiness`;

// Explicit public projection; execution readiness is server-owned, never marketing-editable.
export function publicProducts() {
  return withDatabase({ actorId: "public:product-catalog" }, async (client) =>
    (await client.query(`SELECT ${projection} FROM landing_products WHERE visible=true ORDER BY display_order,key`)).rows);
}
export function listProducts(principal: Principal) {
  requireSuperAdmin(principal);
  return withDatabase(contextFor(principal), async (client) =>
    (await client.query(`SELECT ${projection} FROM landing_products ORDER BY display_order,key`)).rows);
}
async function readProduct(client: DatabaseClient, key: string) {
  const result = await client.query(`SELECT ${projection} FROM landing_products WHERE key=$1`, [key]);
  if (!result.rows[0]) throw new HttpError(404, "Catalog product not found.");
  return result.rows[0];
}
export function saveProduct(principal: Principal, key: string, input: LandingProductInput) {
  requireSuperAdmin(principal);
  const parsed = UpdateLandingProductBody.parse(input);
  const name = parsed.name.trim(), description = parsed.description.trim(), ctaLabel = parsed.ctaLabel.trim();
  if (name.length < 2 || description.length < 10 || ctaLabel.length < 2) {
    throw new HttpError(400, "Product name, description and CTA cannot be blank.");
  }
  return withDatabase(contextFor(principal, undefined, true), async (client) => {
    await client.query("SELECT key FROM landing_products WHERE key=$1 FOR UPDATE", [key]);
    const before = await readProduct(client, key);
    await client.query(`UPDATE landing_products SET visible=$2,name=$3,description=$4,icon=$5,
      starting_price=$6,setup_fee=$7,currency=$8,billing_period=$9,status=$10,
      cta_label=$11,display_order=$12 WHERE key=$1`,
    [key, parsed.visible, name, description, parsed.icon, parsed.startingPrice, parsed.setupFee,
      parsed.currency, parsed.billingPeriod, parsed.status, ctaLabel, parsed.displayOrder]);
    const after = await readProduct(client, key);
    await audit(client, principal, null, "landing_catalog.updated", `Updated marketing catalog: ${name}`, { key, before, after });
    return after;
  });
}