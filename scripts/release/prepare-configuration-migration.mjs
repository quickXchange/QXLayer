import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// Generates a reviewed DATA-only file for the owner's native Production SQL runner.
// Never opens a database connection or changes application/startup/publishing code.
const dir = resolve("reports/production-configuration-migration");
const source = JSON.parse(readFileSync(`${dir}/source.json`, "utf8"));
const review = JSON.parse(readFileSync(`${dir}/database-review.json`, "utf8"));
const metadata = review.production.metadata;
const tables = review.included;
const allTables = [...tables, ...review.excluded].sort();
const q = name => {
  assert.match(name, /^[a-z_][a-z0-9_]*$/);
  return `"${name}"`;
};
const literal = value => `'${String(value).replaceAll("'", "''")}'`;
const hash = value => createHash("sha256").update(value).digest("hex");
const keys = {};
for (const table of tables) {
  const pk = metadata.constraints.find(c => c.table === table && c.type === "p");
  assert(pk, `Missing primary key: ${table}`);
  keys[table] = pk.definition.match(/^PRIMARY KEY \(([^)]+)\)$/)[1].split(", ").map(s => s.replaceAll('"', ""));
  assert.equal(new Set(source[table].map(r => JSON.stringify(keys[table].map(k => r[k])))).size, source[table].length);
  for (const fk of metadata.constraints.filter(c => c.table === table && c.type === "f")) {
    assert(tables.includes(fk.parent), `Configuration depends on excluded table: ${table} -> ${fk.parent}`);
    assert(tables.indexOf(fk.parent) < tables.indexOf(table), `Wrong dependency order: ${table}`);
    const match = fk.definition.match(/^FOREIGN KEY \(([^)]+)\) REFERENCES ([a-z_]+)\(([^)]+)\)$/);
    assert(match, `Unsupported dependency: ${fk.definition}`);
    const child = match[1].split(", "), parent = match[3].split(", ");
    for (const row of source[table]) {
      assert(source[fk.parent].some(p => child.every((c, i) => p[parent[i]] === row[c])), `Missing source dependency: ${table}`);
    }
  }
}
for (const m of source.module_catalog) {
  for (const feature of [...(m.definition.features ?? []), ...(m.definition.limits ?? [])]) {
    assert(source.entitlement_definitions.some(d => d.key === feature.key), `Missing declared entitlement: ${feature.key}`);
  }
}
assert.equal(source.landing_products.length, 16);
assert.equal(source.landing_products.filter(p => p.visible).length, 15);
assert.equal(source.landing_products.find(p => p.key === "kolo").visible, false);
assert.equal(Object.values(source).reduce((n, rows) => n + rows.length, 0), 277);
const payload = JSON.stringify(source);
const tag = `$qx_payload_${hash(payload).slice(0, 20)}$`;
assert(!payload.includes(tag) && !payload.includes("$qx_configuration$"));
const targetCounts = Object.fromEntries(review.production.counts.output.trim().split("\n").slice(1).map(line => {
  const [table, count] = line.split(",");
  return [table, Number(count)];
}));
const lines = [
  "-- QXLayer complete global CONFIGURATION DATA migration. PREPARED, NOT APPROVED.",
  "-- Owner must approve the demo/test plan and add-on scope before execution.",
  "-- One server statement: PostgreSQL commits all changes together or rolls all back.",
  "-- Inserts missing records only; never updates, deletes, resets or changes schema.",
  "-- Includes 277 exact current Development global configuration records.",
  "-- Excludes all identities, customers, tenant settings/assignments, orders and credentials.",
  "-- Run ONLY in Database > Production > My Data > SQL runner, after approval.",
  `-- Frozen source SHA-256: ${hash(payload)}`,
  "DO $qx_configuration$",
  "DECLARE",
  "  approved constant boolean := false; -- Agent changes this only after explicit scope approval.",
  `  source_text constant text := ${tag}${payload}${tag};`,
  "  source_data constant jsonb := source_text::jsonb;",
  "  originals jsonb := '{}'::jsonb;",
  "  protected_before jsonb := '{}'::jsonb;",
  "  row_hash text;",
  "  n bigint;",
  "  inserted_total bigint := 0;",
  "  t text;",
  "BEGIN",
  "  IF NOT approved THEN RAISE EXCEPTION 'Scope not approved. Do not execute this prepared file.'; END IF;",
  `  IF md5(source_text) <> ${literal(createHash("md5").update(payload).digest("hex"))} THEN RAISE EXCEPTION 'Frozen source payload was changed. Stop for review.'; END IF;`,
  "  IF current_setting('transaction_read_only')::boolean THEN RAISE EXCEPTION 'A writable authorized Production connection is required.'; END IF;",
  "  PERFORM set_config('lock_timeout', '5s', true);",
  "  PERFORM set_config('TimeZone', 'UTC', true);",
  `  LOCK TABLE ${allTables.map(t => `public.${q(t)}`).join(", ")} IN SHARE ROW EXCLUSIVE MODE;`,
  // Locking is short-lived and leaves ordinary SELECTs available.
  "  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace ns ON ns.oid=c.relnamespace",
  `    WHERE ns.nspname='public' AND c.relname=ANY(ARRAY[${allTables.map(literal).join(",")}]) AND c.relrowsecurity)`,
  "    THEN RAISE EXCEPTION 'Unexpected row security: stop for separate review.'; END IF;",
  "  IF EXISTS (SELECT 1 FROM pg_trigger tr JOIN pg_class c ON c.oid=tr.tgrelid JOIN pg_namespace ns ON ns.oid=c.relnamespace",
  `    WHERE ns.nspname='public' AND c.relname=ANY(ARRAY[${allTables.map(literal).join(",")}]) AND NOT tr.tgisinternal)`,
  "    THEN RAISE EXCEPTION 'Unexpected trigger: stop for separate review.'; END IF;",
  "  SELECT md5(coalesce(string_agg(md5(to_jsonb(a)::text),',' ORDER BY md5(to_jsonb(a)::text)),'')), count(*)",
  "    INTO row_hash,n FROM public.platform_admins a;",
  `  IF n <> ${review.productionOwnerGuard.count} OR row_hash <> ${literal(review.productionOwnerGuard.digest)}`,
  "    THEN RAISE EXCEPTION 'Production owner fingerprint does not match the reviewed target. No changes allowed.'; END IF;",
];
for (const table of review.excluded) {
  lines.push(
    `  SELECT count(*) INTO n FROM public.${q(table)};`,
    `  IF n <> ${targetCounts[table]} THEN RAISE EXCEPTION 'Reviewed target changed: ${table}. Refresh review; no changes allowed.'; END IF;`,
  );
}
lines.push(
  `  FOREACH t IN ARRAY ARRAY[${review.excluded.map(literal).join(",")}] LOOP`,
  "    EXECUTE format('SELECT md5(coalesce(string_agg(md5(to_jsonb(r)::text),'','' ORDER BY md5(to_jsonb(r)::text)),'''')) FROM public.%I r',t) INTO row_hash;",
  "    protected_before := protected_before || jsonb_build_object(t,row_hash);",
  "  END LOOP;",
);
for (const table of tables) {
  const cols = metadata.columns.filter(c => c.table === table);
  assert(cols.every(c => !c.generated));
  assert(source[table].every(r => cols.every(c => Object.hasOwn(r, c.column)) && Object.keys(r).length === cols.length));
  const expectedSignature = cols.map(c => `${c.column}:${c.type}:${c.notNull ? "true" : "false"}`).join("|");
  const sameKey = keys[table].map(k => `p.${q(k)}=s.${q(k)}`).join(" AND ");
  const typedSource = `jsonb_populate_recordset(NULL::public.${q(table)},source_data->${literal(table)})`;
  lines.push(
    `  -- Preflight ${table}: complete column types, existing keys, typed value comparison.`,
    "  SELECT string_agg(a.attname || ':' || format_type(a.atttypid,a.atttypmod) || ':' || a.attnotnull::text,'|' ORDER BY a.attnum)",
    `    INTO row_hash FROM pg_attribute a WHERE a.attrelid='public.${table}'::regclass AND a.attnum>0 AND NOT a.attisdropped;`,
    `  IF row_hash <> ${literal(expectedSignature)} THEN RAISE EXCEPTION 'Schema changed: ${table}; use native schema publishing separately.'; END IF;`,
    `  SELECT count(*) INTO n FROM ${typedSource} s JOIN public.${q(table)} p ON ${sameKey} WHERE to_jsonb(p) IS DISTINCT FROM to_jsonb(s);`,
    `  IF n > 0 THEN RAISE EXCEPTION 'Existing-key value conflict: ${table}. Nothing will be overwritten.'; END IF;`,
    `  SELECT originals || jsonb_build_object(${literal(table)},coalesce(jsonb_agg(to_jsonb(p)),'[]'::jsonb)) INTO originals FROM public.${q(table)} p;`,
  );
}
for (const table of tables) {
  const cols = metadata.columns.filter(c => c.table === table).map(c => c.column);
  const sameKey = keys[table].map(k => `p.${q(k)}=s.${q(k)}`).join(" AND ");
  const populated = `jsonb_populate_recordset(NULL::public.${q(table)},source_data->${literal(table)})`;
  const old = `jsonb_populate_recordset(NULL::public.${q(table)},originals->${literal(table)})`;
  lines.push(
    `  -- ${table}: ${source[table].length} frozen rows, parent records already inserted.`,
    `  INSERT INTO public.${q(table)} (${cols.map(q).join(",")}) SELECT ${cols.map(c => `s.${q(c)}`).join(",")} FROM ${populated} s`,
    `    WHERE NOT EXISTS (SELECT 1 FROM public.${q(table)} p WHERE ${sameKey});`,
    "  GET DIAGNOSTICS n = ROW_COUNT;",
    "  inserted_total := inserted_total + n;",
    `  SELECT count(*) INTO n FROM ${populated} s WHERE NOT EXISTS (SELECT 1 FROM public.${q(table)} p WHERE ${sameKey} AND to_jsonb(p)=to_jsonb(s));`,
    `  IF n <> 0 THEN RAISE EXCEPTION 'Source verification failed: ${table}; all inserts roll back.'; END IF;`,
    `  SELECT count(*) INTO n FROM ${old} s WHERE NOT EXISTS (SELECT 1 FROM public.${q(table)} p WHERE ${sameKey} AND to_jsonb(p)=to_jsonb(s));`,
    `  IF n <> 0 THEN RAISE EXCEPTION 'Existing-record preservation failed: ${table}; all inserts roll back.'; END IF;`,
  );
}
lines.push(
  `  FOREACH t IN ARRAY ARRAY[${review.excluded.map(literal).join(",")}] LOOP`,
  "    EXECUTE format('SELECT md5(coalesce(string_agg(md5(to_jsonb(r)::text),'','' ORDER BY md5(to_jsonb(r)::text)),'''')) FROM public.%I r',t) INTO row_hash;",
  "    IF row_hash IS DISTINCT FROM protected_before->>t THEN RAISE EXCEPTION 'Protected records changed: %. All inserts roll back.',t; END IF;",
  "  END LOOP;",
  "  IF (SELECT count(*) FROM public.landing_products WHERE visible) <> 15 OR",
  "     NOT EXISTS (SELECT 1 FROM public.landing_products WHERE key='kolo' AND NOT visible)",
  "    THEN RAISE EXCEPTION 'Landing visibility check failed. All inserts roll back.'; END IF;",
  "  RAISE NOTICE 'Database configuration verified: % newly inserted rows; all original records preserved. LIVE WEBSITE STILL REQUIRES VERIFICATION.',inserted_total;",
  "END",
  "$qx_configuration$;",
);
const sql = lines.join("\n") + "\n";
assert(!/\b(?:UPDATE|DELETE|TRUNCATE|DROP|ALTER|CREATE)\s+(?:TABLE|INDEX|ROLE|SCHEMA|public\.)/i.test(sql));
writeFileSync(`${dir}/migration-PREPARED.sql`, sql);
const verifyBranches = tables.map(table => {
  const sameKey = keys[table].map(k => `p.${q(k)}=s.${q(k)}`).join(" AND ");
  const firstKey = `p.${q(keys[table][0])}`;
  return [
    `SELECT ${literal(table)} AS table_name,count(*) AS expected_count,`,
    `  (SELECT count(*) FROM public.${q(table)}) AS actual_total,`,
    "  count(*) FILTER (WHERE to_jsonb(p)=to_jsonb(s)) AS exact_matches,",
    `  count(*) FILTER (WHERE ${firstKey} IS NULL) AS missing,`,
    `  count(*) FILTER (WHERE ${firstKey} IS NOT NULL AND to_jsonb(p) IS DISTINCT FROM to_jsonb(s)) AS conflicts`,
    `FROM expected e CROSS JOIN LATERAL jsonb_populate_recordset(NULL::public.${q(table)},e.data->${literal(table)}) s`,
    `LEFT JOIN public.${q(table)} p ON ${sameKey}`,
  ].join("\n");
});
const exactQuery = `WITH expected AS (SELECT ${tag}${payload}${tag}::jsonb AS data)\n${verifyBranches.join("\nUNION ALL\n")};`;
writeFileSync(`${dir}/verification-exact.sql`, "-- READ ONLY: every source record must match; missing/conflicts must all be zero.\n" + exactQuery + "\n");
const verification = [
  "-- Read-only post-execution display/access record checks.",
  "SELECT key,name,visible,display_order FROM public.landing_products ORDER BY display_order,key;",
  "SELECT count(*) AS active_admin_count FROM public.platform_admins WHERE active;",
  "SELECT md5(coalesce(string_agg(md5(to_jsonb(a)::text),',' ORDER BY md5(to_jsonb(a)::text)),'')) AS admin_fingerprint FROM public.platform_admins a;",
].join("\n") + "\n";
writeFileSync(`${dir}/verification.sql`, verification);
writeFileSync(`${dir}/manifest.json`, JSON.stringify({
  status: "PREPARED_NOT_APPROVED_NOT_EXECUTED",
  sourceSha256: hash(payload), sqlSha256: hash(sql), bytes: Buffer.byteLength(sql),
  operatorExecution: "Native Production SQL runner; entire file is ONE DO statement.",
  agentExecution: "Unavailable: managed Agent Production SQL is read-only.",
  included: tables.map(table => ({ table, count: source[table].length, primaryKey: keys[table] })),
  excluded: review.excluded, preservedProductionAdminCount: review.productionOwnerGuard.count,
  totalRows: 277, approvalRequired: "Five enabled demo/test plans and enabled sample add-on retain exact Development prices/statuses; not approved commercial offerings.",
}, null, 2) + "\n");
console.log(`Prepared ${Buffer.byteLength(sql)} bytes; 277 rows; all ${allTables.length} tables classified; no database connection opened.`);
