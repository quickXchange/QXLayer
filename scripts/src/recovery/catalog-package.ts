import { createHash } from "node:crypto";
import { approvedKeys, approvedProducts } from "../catalog-initializer/approved";

export interface CatalogRecord {
  key: string; visible: boolean; name: string; description: string; icon: string;
  starting_price: string | null; setup_fee: string | null; currency: string;
  billing_period: string; status: string; cta_label: string; display_order: number;
}
export interface CatalogSnapshot { capturedAt: string; catalogRows: CatalogRecord[]; moduleKeys: string[] }
export type Classification = "INSERT" | "UNCHANGED" | "RESTORE VISIBILITY" | "CONFLICT / REVIEW REQUIRED";
export interface ReviewedRow {
  key: string; classification: Classification; differences: string[];
  modulePresent: boolean; before: CatalogRecord | null; approved: CatalogRecord;
}
export interface CatalogApproval {
  approvedInsertKeys: string[];
  approvedVisibilityKeys: string[];
  preserveConflictKeys: string[];
}
export const approvedRecords: CatalogRecord[] = approvedProducts.map(p => ({
  key: p.key, visible: p.visible, name: p.name, description: p.description, icon: p.icon,
  starting_price: p.startingPrice, setup_fee: p.setupFee, currency: p.currency,
  billing_period: p.billingPeriod, status: p.status, cta_label: p.ctaLabel, display_order: p.displayOrder,
}));
const fields = Object.keys(approvedRecords[0]) as (keyof CatalogRecord)[];
const projection = fields.map(k => ["starting_price", "setup_fee"].includes(k) ? `${k}::text AS ${k}` : k).join(",");
const scope = approvedKeys.map(k => `'${k}'`).join(",");
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
// Hex-encoded JSON avoids SQL-literal/dollar-quote injection from existing marketing copy.
const jsonSql = (value: unknown) => `convert_from(decode('${Buffer.from(JSON.stringify(value)).toString("hex")}','hex'),'UTF8')::jsonb`;
export const approvedManifestFingerprint = hash(approvedRecords);

export function classifyCatalog(snapshot: CatalogSnapshot): ReviewedRow[] {
  if (!snapshot || !Array.isArray(snapshot.catalogRows) || !Array.isArray(snapshot.moduleKeys) ||
    typeof snapshot.capturedAt !== "string" || !Number.isFinite(Date.parse(snapshot.capturedAt))) throw new Error("Invalid preflight snapshot.");
  const allowed = new Set<string>(approvedKeys);
  const rows = new Map<string, CatalogRecord>();
  for (const row of snapshot.catalogRows) {
    if (!row || !allowed.has(row.key) || rows.has(row.key)) throw new Error("Unapproved or duplicate catalog key.");
    if (Object.keys(row).length !== fields.length || fields.some(k => !(k in row))) throw new Error("Unexpected catalog projection.");
    if (typeof row.visible !== "boolean" || !Number.isInteger(row.display_order) ||
      fields.filter(k => !["visible", "display_order", "starting_price", "setup_fee"].includes(k)).some(k => typeof row[k] !== "string") ||
      [row.starting_price, row.setup_fee].some(v => v !== null && (typeof v !== "string" || !/^\d+(?:\.\d{1,2})?$/.test(v)))) throw new Error("Invalid catalog field types.");
    rows.set(row.key, { ...row });
  }
  if (snapshot.moduleKeys.some(k => !allowed.has(k)) || new Set(snapshot.moduleKeys).size !== snapshot.moduleKeys.length) throw new Error("Unexpected module scope.");
  return approvedRecords.map(approved => {
    const before = rows.get(approved.key) ?? null;
    const modulePresent = snapshot.moduleKeys.includes(approved.key);
    const differences = before ? fields.filter(k => k !== "visible" && before[k] !== approved[k]) : [];
    return { key: approved.key, before, approved: { ...approved }, modulePresent, differences,
      classification: !modulePresent || differences.length ? "CONFLICT / REVIEW REQUIRED" :
        !before ? "INSERT" : before.visible ? "UNCHANGED" : "RESTORE VISIBILITY" };
  });
}

export const catalogPreflightSql = `-- PREPARED ONLY. Separate Production-read approval required.
-- Exactly 15 platform-global marketing rows/module keys; no other application data.
BEGIN READ ONLY;
SELECT jsonb_build_object(
  'capturedAt',clock_timestamp(),
  'catalogRows',(SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY key),'[]'::jsonb)
    FROM (SELECT ${projection} FROM public.landing_products WHERE key IN (${scope})) r),
  'moduleKeys',(SELECT coalesce(jsonb_agg(key ORDER BY key),'[]'::jsonb)
    FROM public.module_catalog WHERE key IN (${scope}))
) AS recovery_snapshot;
COMMIT;
`;

export function prepareCatalogApply(snapshot: CatalogSnapshot, approval: CatalogApproval): string {
  const plan = classifyCatalog(snapshot);
  const review = new Map<string, Classification>(plan.map(r => [r.key, r.classification]));
  for (const [keys, expected] of [
    [approval.approvedInsertKeys, "INSERT"],
    [approval.approvedVisibilityKeys, "RESTORE VISIBILITY"],
    [approval.preserveConflictKeys, "CONFLICT / REVIEW REQUIRED"],
  ] as const) {
    if (!Array.isArray(keys) || new Set(keys).size !== keys.length || keys.some(k => review.get(k) !== expected)) throw new Error("Invalid per-key approval.");
  }
  for (const row of plan) {
    if (!row.modulePresent) throw new Error(`Missing module dependency: ${row.key}; no module seeding is authorized.`);
    if (row.classification === "INSERT" && !approval.approvedInsertKeys.includes(row.key) ||
      row.classification === "RESTORE VISIBILITY" && !approval.approvedVisibilityKeys.includes(row.key) ||
      row.classification === "CONFLICT / REVIEW REQUIRED" && !approval.preserveConflictKeys.includes(row.key)) throw new Error(`Explicit review required: ${row.key}`);
  }
  // All conflicts must be explicitly reviewed and PRESERVED, not overwritten.
  const expectedRows = snapshot.catalogRows.slice().sort((a, b) => a.key.localeCompare(b.key));
  const finalRows = plan.map(r => r.classification === "INSERT" ? r.approved :
    r.classification === "RESTORE VISIBILITY" ? { ...r.before!, visible: true } : r.before!).sort((a, b) => a.key.localeCompare(b.key));
  const inserts = plan.filter(r => approval.approvedInsertKeys.includes(r.key)).map(r => r.approved);
  const restore = approval.approvedVisibilityKeys;
  const id = hash({ snapshot, approval, manifest: approvedManifestFingerprint });
  return `-- PREPARED ONLY. Authorized Production writer + separate execution approval required.
-- Plan ${id}; reviewed manifest ${approvedManifestFingerprint}.
-- Never run this via a bootstrap endpoint, startup hook or publishing hook.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
LOCK TABLE public.landing_products IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE public.module_catalog IN SHARE MODE;
DO $qx_catalog$
DECLARE
  snapshot jsonb := ${jsonSql(snapshot)};
  expected_rows jsonb := ${jsonSql(expectedRows)};
  final_rows jsonb := ${jsonSql(finalRows)};
  inserts jsonb := ${jsonSql(inserts)};
  restore_keys jsonb := ${jsonSql(restore)};
  actual_rows jsonb;
BEGIN
  IF (snapshot->>'capturedAt')::timestamptz < clock_timestamp()-interval '15 minutes'
    OR (snapshot->>'capturedAt')::timestamptz > clock_timestamp()+interval '1 minute' THEN
    RAISE EXCEPTION 'Preflight expired or timestamp invalid; repeat preflight and review.';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE oid IN
    ('public.landing_products'::regclass,'public.module_catalog'::regclass)
    AND (relrowsecurity OR relforcerowsecurity)) THEN
    RAISE EXCEPTION 'Unexpected catalog RLS requires review; do not disable it.';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid IN
    ('public.landing_products'::regclass,'public.module_catalog'::regclass)
    AND NOT tgisinternal AND tgenabled<>'D') THEN
    RAISE EXCEPTION 'Nonstandard catalog triggers require review before any writes.';
  END IF;
  IF (SELECT count(*) FROM public.module_catalog WHERE key IN (${scope})) <> 15 THEN
    RAISE EXCEPTION 'Approved module dependencies changed; no extra configuration will be seeded.';
  END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY key),'[]'::jsonb) INTO actual_rows
    FROM (SELECT ${projection} FROM public.landing_products WHERE key IN (${scope})) r;
  IF actual_rows IS DISTINCT FROM expected_rows THEN
    RAISE EXCEPTION 'Catalog changed since preflight; no writes. Repeat classification and approval.';
  END IF;
  INSERT INTO public.landing_products
    (key,visible,name,description,icon,starting_price,setup_fee,currency,billing_period,status,cta_label,display_order)
  SELECT key,visible,name,description,icon,starting_price,setup_fee,currency,billing_period,status,cta_label,display_order
  FROM jsonb_to_recordset(inserts) AS r(key text,visible boolean,name text,description text,icon text,
    starting_price numeric,setup_fee numeric,currency text,billing_period text,status text,cta_label text,display_order integer);
  UPDATE public.landing_products SET visible=true
    WHERE key IN (SELECT jsonb_array_elements_text(restore_keys)) AND visible=false;
  SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY key),'[]'::jsonb) INTO actual_rows
    FROM (SELECT ${projection} FROM public.landing_products WHERE key IN (${scope})) r;
  IF actual_rows IS DISTINCT FROM final_rows THEN
    RAISE EXCEPTION 'Catalog postcondition failed; entire transaction must roll back.';
  END IF;
END;
$qx_catalog$;
SELECT ${projection} FROM public.landing_products WHERE key IN (${scope}) ORDER BY display_order,key;
COMMIT;
-- On any error: ROLLBACK in the same SQL session. Never bypass guards.
`;
}
