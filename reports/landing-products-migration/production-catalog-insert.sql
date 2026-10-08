-- MANUAL EXECUTION ONLY: Replit Production SQL Console, whole script in one run.
-- No application, authentication, schema, startup or publishing changes.
-- Exactly 16 + 16 new rows on success; any existing approved key aborts the run.
-- Approved snapshot SHA-256: 110ee5ac12820106c5b8ea437416f48add578994c2087728511b43353257b85e
-- Catalog writes and owner-record edits are briefly locked; normal reads continue.

BEGIN;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '60s';
SET LOCAL idle_in_transaction_session_timeout = '60s';
SET LOCAL search_path = pg_catalog, public;

DO $qx_insert$
DECLARE
  source_text CONSTANT text := $qx_data$
{
  "module_catalog": [
    {"key":"android_app","name":"Android App","category":"Channels","definition":{"key":"android_app","name":"Android App","limits":[],"category":"Channels","features":[],"lifecycle":"deferred","description":"Registered for future independent implementation. No execution is implemented.","sandboxAvailable":false,"requiresAssetNetworks":false},"description":"Registered for future independent implementation. No execution is implemented.","sandbox_available":false},
    {"key":"articles","name":"Articles / Content","category":"Content","definition":{"key":"articles","name":"Articles / Content","limits":[],"category":"Content","features":[],"lifecycle":"deferred","description":"Registered for future independent implementation. No execution is implemented.","sandboxAvailable":false,"requiresAssetNetworks":false},"description":"Registered for future independent implementation. No execution is implemented.","sandbox_available":false},
    {"key":"cloud_mining","name":"Cloud Mining","category":"Infrastructure","definition":{"key":"cloud_mining","name":"Cloud Mining","limits":[],"category":"Infrastructure","features":[],"lifecycle":"deferred","description":"Registered for future independent implementation. No execution is implemented.","sandboxAvailable":false,"requiresAssetNetworks":false},"description":"Registered for future independent implementation. No execution is implemented.","sandbox_available":false},
    {"key":"crypto_card","name":"Crypto Card","category":"Financial","definition":{"key":"crypto_card","name":"Crypto Card","limits":[],"category":"Financial","features":[],"lifecycle":"deferred","description":"Registered for future independent implementation. No execution is implemented.","sandboxAvailable":false,"requiresAssetNetworks":false},"description":"Registered for future independent implementation. No execution is implemented.","sandbox_available":false},
    {"key":"crypto_engine","name":"Crypto Engine","category":"Infrastructure","definition":{"key":"crypto_engine","name":"Crypto Engine","limits":[],"category":"Infrastructure","features":[],"lifecycle":"deferred","description":"Registered for future independent implementation. No execution is implemented.","sandboxAvailable":false,"requiresAssetNetworks":false},"description":"Registered for future independent implementation. No execution is implemented.","sandbox_available":false},
    {"key":"crypto_exchange","name":"Crypto Exchange","category":"Financial","definition":{"key":"crypto_exchange","name":"Exchange","limits":[],"category":"Financial","features":[{"key":"swap","label":"swap","dependsOn":["crypto_exchange"]},{"key":"convert","label":"convert","dependsOn":["crypto_exchange"]},{"key":"buy","label":"Buy (Buy/Sell)","dependsOn":["crypto_exchange"]},{"key":"sell","label":"Sell (Buy/Sell)","dependsOn":["crypto_exchange"]}],"lifecycle":"sandbox_only","description":"Shared platform configuration; financial execution remains disabled.","sandboxAvailable":true,"requiresAssetNetworks":true},"description":"Exchange, swap, and convert product entitlement. Engine implementation is deferred.","sandbox_available":true},
    {"key":"crypto_payments","name":"Crypto Payments","category":"Financial","definition":{"key":"crypto_payments","name":"Crypto Payments","limits":[],"category":"Financial","features":[],"lifecycle":"deferred","description":"Registered for future independent implementation. No execution is implemented.","sandboxAvailable":false,"requiresAssetNetworks":true},"description":"Crypto payment gateway entitlement. Invoice execution is deferred.","sandbox_available":true},
    {"key":"dex","name":"DEX","category":"Financial","definition":{"key":"dex","name":"DEX","limits":[],"category":"Financial","features":[],"lifecycle":"deferred","description":"Registered for future independent implementation. No execution is implemented.","sandboxAvailable":false,"requiresAssetNetworks":false},"description":"Registered for future independent implementation. No execution is implemented.","sandbox_available":false},
    {"key":"earn","name":"Earn","category":"Financial","definition":{"key":"earn","name":"Earn","limits":[],"category":"Financial","features":[],"lifecycle":"deferred","description":"Registered for future independent implementation. No execution is implemented.","sandboxAvailable":false,"requiresAssetNetworks":false},"description":"Registered for future independent implementation. No execution is implemented.","sandbox_available":false},
    {"key":"ios_app","name":"iOS App","category":"Channels","definition":{"key":"ios_app","name":"iOS App","limits":[],"category":"Channels","features":[],"lifecycle":"deferred","description":"Registered for future independent implementation. No execution is implemented.","sandboxAvailable":false,"requiresAssetNetworks":false},"description":"Registered for future independent implementation. No execution is implemented.","sandbox_available":false},
    {"key":"kolo","name":"Kolo","category":"Products","definition":{"key":"kolo","name":"Kolo","limits":[],"category":"Products","features":[],"lifecycle":"deferred","description":"Registered for future independent implementation. No execution is implemented.","sandboxAvailable":false,"requiresAssetNetworks":false},"description":"Registered for future independent implementation. No execution is implemented.","sandbox_available":false},
    {"key":"rpc_nodes","name":"RPC / Nodes","category":"Infrastructure","definition":{"key":"rpc_nodes","name":"RPC / Nodes","limits":[],"category":"Infrastructure","features":[],"lifecycle":"deferred","description":"Registered for future independent implementation. No execution is implemented.","sandboxAvailable":false,"requiresAssetNetworks":false},"description":"Registered for future independent implementation. No execution is implemented.","sandbox_available":false},
    {"key":"staking","name":"Staking","category":"Financial","definition":{"key":"staking","name":"Staking","limits":[],"category":"Financial","features":[],"lifecycle":"deferred","description":"Registered for future independent implementation. No execution is implemented.","sandboxAvailable":false,"requiresAssetNetworks":false},"description":"Registered for future independent implementation. No execution is implemented.","sandbox_available":false},
    {"key":"telegram_bot","name":"Telegram Bot","category":"Channels","definition":{"key":"telegram_bot","name":"Telegram Bot","limits":[],"category":"Channels","features":[],"lifecycle":"deferred","description":"Registered for future independent implementation. No execution is implemented.","sandboxAvailable":false,"requiresAssetNetworks":false},"description":"Branded bot entitlement using the shared backend. Bot connection is deferred.","sandbox_available":true},
    {"key":"telegram_mini_app","name":"Telegram Mini App","category":"Channels","definition":{"key":"telegram_mini_app","name":"Telegram Mini App","limits":[],"category":"Channels","features":[],"lifecycle":"deferred","description":"Registered for future independent implementation. No execution is implemented.","sandboxAvailable":false,"requiresAssetNetworks":false},"description":"Telegram web app entitlement using the same tenant configuration.","sandbox_available":true},
    {"key":"whatsapp_bot","name":"WhatsApp Bot","category":"Channels","definition":{"key":"whatsapp_bot","name":"WhatsApp Bot","limits":[],"category":"Channels","features":[],"lifecycle":"deferred","description":"Registered for future independent implementation. No execution is implemented.","sandboxAvailable":false,"requiresAssetNetworks":false},"description":"Registered for future independent implementation. No execution is implemented.","sandbox_available":false}
  ],
  "landing_products": [
    {"key":"crypto_exchange","icon":"exchange","name":"White Label Exchange — Swap / Convert / Buy & Sell","status":"available","visible":true,"currency":"USD","cta_label":"Learn More","setup_fee":null,"description":"Your brand at the center of the exchange experience. Configure swap, convert, buy and sell journeys on the shared White Label Core. Currently a non-executing sandbox.","display_order":10,"billing_period":"on_request","starting_price":null},
    {"key":"crypto_payments","icon":"payments","name":"Crypto Payment Gateway","status":"coming_soon","visible":true,"currency":"USD","cta_label":"Learn More","setup_fee":null,"description":"Bring branded crypto payment experiences into your ecosystem. Merchant checkout and payment infrastructure are planned; payment processing is not implemented.","display_order":20,"billing_period":"on_request","starting_price":null},
    {"key":"crypto_engine","icon":"engine","name":"Crypto Engine","status":"coming_soon","visible":true,"currency":"USD","cta_label":"Learn More","setup_fee":null,"description":"A planned orchestration layer connecting your crypto products through one modular platform. Financial execution and provider integrations are not implemented.","display_order":30,"billing_period":"on_request","starting_price":null},
    {"key":"ios_app","icon":"ios","name":"iOS App","status":"coming_soon","visible":true,"currency":"USD","cta_label":"Learn More","setup_fee":null,"description":"Extend your brand to a native iOS experience connected to the same White Label platform. Mobile application development is planned, not available today.","display_order":40,"billing_period":"on_request","starting_price":null},
    {"key":"android_app","icon":"android","name":"Android App","status":"coming_soon","visible":true,"currency":"USD","cta_label":"Learn More","setup_fee":null,"description":"Bring your ecosystem to Android with a branded mobile experience and shared platform configuration. Mobile application development is planned.","display_order":50,"billing_period":"on_request","starting_price":null},
    {"key":"crypto_card","icon":"card","name":"Crypto Card","status":"coming_soon","visible":true,"currency":"USD","cta_label":"Learn More","setup_fee":null,"description":"A planned branded card offering within your wider crypto ecosystem. Card issuance, spending and provider integrations are not implemented.","display_order":60,"billing_period":"on_request","starting_price":null},
    {"key":"staking","icon":"staking","name":"Staking API","status":"coming_soon","visible":true,"currency":"USD","cta_label":"Learn More","setup_fee":null,"description":"A planned staking interface for future integration into your branded products. No staking engine, rewards or blockchain execution is connected.","display_order":70,"billing_period":"on_request","starting_price":null},
    {"key":"earn","icon":"earn","name":"Earn API","status":"coming_soon","visible":true,"currency":"USD","cta_label":"Learn More","setup_fee":null,"description":"A planned API layer for future earning products in your ecosystem. Yield generation, balances and financial execution are not implemented.","display_order":80,"billing_period":"on_request","starting_price":null},
    {"key":"dex","icon":"dex","name":"DEX","status":"coming_soon","visible":true,"currency":"USD","cta_label":"Learn More","setup_fee":null,"description":"A planned decentralized exchange experience under your brand. Smart contracts, liquidity routing and trade execution are not implemented.","display_order":90,"billing_period":"on_request","starting_price":null},
    {"key":"articles","icon":"content","name":"Articles / Content","status":"coming_soon","visible":true,"currency":"USD","cta_label":"Learn More","setup_fee":null,"description":"A planned publishing product for branded articles, education and ecosystem updates. The editorial CMS is not implemented yet.","display_order":100,"billing_period":"on_request","starting_price":null},
    {"key":"telegram_bot","icon":"telegram","name":"Telegram Bot","status":"coming_soon","visible":true,"currency":"USD","cta_label":"Learn More","setup_fee":null,"description":"A planned conversational entry point for your branded ecosystem on Telegram. Bot delivery and financial actions are not implemented.","display_order":110,"billing_period":"on_request","starting_price":null},
    {"key":"telegram_mini_app","icon":"miniapp","name":"Telegram Mini App","status":"coming_soon","visible":true,"currency":"USD","cta_label":"Learn More","setup_fee":null,"description":"A planned compact branded experience inside Telegram, connected to the shared platform. Mini App development and integration are deferred.","display_order":120,"billing_period":"on_request","starting_price":null},
    {"key":"whatsapp_bot","icon":"whatsapp","name":"WhatsApp Bot","status":"coming_soon","visible":true,"currency":"USD","cta_label":"Learn More","setup_fee":null,"description":"A planned messaging channel for your branded customer experience. WhatsApp delivery and provider integrations are not implemented.","display_order":130,"billing_period":"on_request","starting_price":null},
    {"key":"rpc_nodes","icon":"nodes","name":"RPC / Nodes","status":"coming_soon","visible":true,"currency":"USD","cta_label":"Learn More","setup_fee":null,"description":"A planned infrastructure offering for blockchain connectivity. No node hosting, RPC endpoints or live blockchain services are provided today.","display_order":140,"billing_period":"on_request","starting_price":null},
    {"key":"cloud_mining","icon":"mining","name":"Cloud Mining","status":"coming_soon","visible":true,"currency":"USD","cta_label":"Learn More","setup_fee":null,"description":"A planned mining product in the modular ecosystem. Mining execution, contracts and returns are not implemented or offered.","display_order":150,"billing_period":"on_request","starting_price":null},
    {"key":"kolo","icon":"kolo","name":"Kolo","status":"coming_soon","visible":false,"currency":"USD","cta_label":"Learn More","setup_fee":null,"description":"A reserved future product within the modular White Label ecosystem. Product functionality and integrations are not implemented.","display_order":160,"billing_period":"on_request","starting_price":null}
  ]
}
$qx_data$;
  payload CONSTANT jsonb := source_text::jsonb;
  expected_keys CONSTANT text[] := ARRAY['android_app','articles','cloud_mining','crypto_card','crypto_engine','crypto_exchange','crypto_payments','dex','earn','ios_app','kolo','rpc_nodes','staking','telegram_bot','telegram_mini_app','whatsapp_bot']::text[];
  module_keys text[];
  product_keys text[];
  before_modules jsonb;
  before_products jsonb;
  before_admins jsonb;
  actual_rows jsonb;
  expected_rows jsonb;
  inserted_modules integer;
  inserted_products integer;
BEGIN
  IF current_setting('transaction_read_only')::boolean THEN
    RAISE EXCEPTION 'This SQL connection is read-only. Stop; no data was changed.';
  END IF;

  IF encode(sha256(convert_to(replace(source_text, E'\r\n', E'\n'), 'UTF8')), 'hex')
     <> 'b8407fc215309f96da1e685bf17e827fcdc58b1b8b105c9e69f05b32b9f174f1' THEN
    RAISE EXCEPTION 'Approved payload integrity check failed. Do not edit the payload or checksum.';
  END IF;

  IF to_regclass('public.module_catalog') IS NULL
     OR to_regclass('public.landing_products') IS NULL
     OR to_regclass('public.platform_admins') IS NULL THEN
    RAISE EXCEPTION 'Required existing tables are missing. No schema changes are permitted.';
  END IF;

  LOCK TABLE public.module_catalog, public.landing_products
    IN SHARE ROW EXCLUSIVE MODE;
  LOCK TABLE public.platform_admins IN SHARE MODE;

  IF EXISTS (
    SELECT 1 FROM pg_class
    WHERE oid IN ('public.module_catalog'::regclass, 'public.landing_products'::regclass)
      AND (relkind <> 'r' OR relrowsecurity OR relforcerowsecurity)
  ) OR EXISTS (
    SELECT 1 FROM pg_inherits
    WHERE inhparent IN ('public.module_catalog'::regclass, 'public.landing_products'::regclass)
       OR inhrelid IN ('public.module_catalog'::regclass, 'public.landing_products'::regclass)
  ) THEN
    RAISE EXCEPTION 'Unexpected catalog table structure or RLS. Stop for review.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid IN ('public.module_catalog'::regclass, 'public.landing_products'::regclass)
      AND NOT tgisinternal AND tgenabled <> 'D'
  ) OR EXISTS (
    SELECT 1 FROM pg_rewrite
    WHERE ev_class IN ('public.module_catalog'::regclass, 'public.landing_products'::regclass)
      AND rulename <> '_RETURN'
  ) THEN
    RAISE EXCEPTION 'Unexpected catalog triggers/rules could write other data. Stop for review.';
  END IF;

  IF (SELECT array_agg(column_name::text ORDER BY ordinal_position)
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'module_catalog')
     IS DISTINCT FROM ARRAY['key','name','description','category','sandbox_available','definition']::text[]
     OR (SELECT array_agg(column_name::text ORDER BY ordinal_position)
         FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'landing_products')
     IS DISTINCT FROM ARRAY['key','visible','name','description','icon','starting_price','setup_fee','currency','billing_period','status','cta_label','display_order']::text[] THEN
    RAISE EXCEPTION 'Catalog columns differ from the reviewed schema. Stop for review.';
  END IF;

  IF jsonb_array_length(payload->'module_catalog') IS DISTINCT FROM 16
     OR jsonb_array_length(payload->'landing_products') IS DISTINCT FROM 16 THEN
    RAISE EXCEPTION 'Expected exactly 16 modules and 16 products in the approved payload.';
  END IF;

  SELECT array_agg(r.key ORDER BY r.key COLLATE "C") INTO module_keys
  FROM jsonb_to_recordset(payload->'module_catalog') AS r(key text);
  SELECT array_agg(r.key ORDER BY r.key COLLATE "C") INTO product_keys
  FROM jsonb_to_recordset(payload->'landing_products') AS r(key text);

  IF module_keys IS DISTINCT FROM expected_keys OR product_keys IS DISTINCT FROM expected_keys THEN
    RAISE EXCEPTION 'Approved keys are missing, duplicated or changed.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.platform_admins WHERE active = true) THEN
    RAISE EXCEPTION 'No active existing platform administrator. Stop without changing access.';
  END IF;

  IF EXISTS (SELECT 1 FROM public.module_catalog WHERE key = ANY(expected_keys))
     OR EXISTS (SELECT 1 FROM public.landing_products WHERE key = ANY(expected_keys)) THEN
    RAISE EXCEPTION 'An approved key already exists. This run requires exactly 32 NEW rows; nothing will be overwritten. Stop for reconciliation.';
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(m) ORDER BY m.key COLLATE "C"), '[]'::jsonb)
    INTO before_modules FROM public.module_catalog AS m;
  SELECT COALESCE(jsonb_agg(to_jsonb(p) ORDER BY p.key COLLATE "C"), '[]'::jsonb)
    INTO before_products FROM public.landing_products AS p;
  SELECT COALESCE(jsonb_agg(to_jsonb(a) ORDER BY a.clerk_user_id COLLATE "C"), '[]'::jsonb)
    INTO before_admins FROM public.platform_admins AS a;

  INSERT INTO public.module_catalog
    (key, name, description, category, sandbox_available, definition)
  SELECT m.key, m.name, m.description, m.category, m.sandbox_available, m.definition
  FROM jsonb_populate_recordset(NULL::public.module_catalog, payload->'module_catalog') AS m;
  GET DIAGNOSTICS inserted_modules = ROW_COUNT;
  IF inserted_modules <> 16 THEN
    RAISE EXCEPTION 'Expected 16 module inserts, got %. Rolling back.', inserted_modules;
  END IF;

  INSERT INTO public.landing_products
    (key, visible, name, description, icon, starting_price, setup_fee,
     currency, billing_period, status, cta_label, display_order)
  SELECT p.key, p.visible, p.name, p.description, p.icon, p.starting_price, p.setup_fee,
         p.currency, p.billing_period, p.status, p.cta_label, p.display_order
  FROM jsonb_populate_recordset(NULL::public.landing_products, payload->'landing_products') AS p;
  GET DIAGNOSTICS inserted_products = ROW_COUNT;
  IF inserted_products <> 16 THEN
    RAISE EXCEPTION 'Expected 16 product inserts, got %. Rolling back.', inserted_products;
  END IF;

  -- Validate every stored field, including the entire module definition JSON.
  SELECT jsonb_agg(to_jsonb(m) ORDER BY m.key COLLATE "C") INTO actual_rows
  FROM public.module_catalog AS m WHERE m.key = ANY(expected_keys);
  SELECT jsonb_agg(r.value ORDER BY (r.value->>'key') COLLATE "C") INTO expected_rows
  FROM jsonb_array_elements(payload->'module_catalog') AS r(value);
  IF actual_rows IS DISTINCT FROM expected_rows THEN
    RAISE EXCEPTION 'Inserted module values do not exactly match the approved snapshot.';
  END IF;

  SELECT jsonb_agg(to_jsonb(p) ORDER BY p.key COLLATE "C") INTO actual_rows
  FROM public.landing_products AS p WHERE p.key = ANY(expected_keys);
  SELECT jsonb_agg(r.value ORDER BY (r.value->>'key') COLLATE "C") INTO expected_rows
  FROM jsonb_array_elements(payload->'landing_products') AS r(value);
  IF actual_rows IS DISTINCT FROM expected_rows THEN
    RAISE EXCEPTION 'Inserted product values do not exactly match the approved snapshot.';
  END IF;

  -- Validate that all pre-existing catalog rows are unchanged.
  SELECT COALESCE(jsonb_agg(to_jsonb(m) ORDER BY m.key COLLATE "C"), '[]'::jsonb)
    INTO actual_rows FROM public.module_catalog AS m WHERE NOT (m.key = ANY(expected_keys));
  IF actual_rows IS DISTINCT FROM before_modules THEN
    RAISE EXCEPTION 'Pre-existing module records changed. Rolling back.';
  END IF;
  SELECT COALESCE(jsonb_agg(to_jsonb(p) ORDER BY p.key COLLATE "C"), '[]'::jsonb)
    INTO actual_rows FROM public.landing_products AS p WHERE NOT (p.key = ANY(expected_keys));
  IF actual_rows IS DISTINCT FROM before_products THEN
    RAISE EXCEPTION 'Pre-existing product records changed. Rolling back.';
  END IF;

  -- Read-only comparison of every existing administrator field; never write this table.
  SELECT COALESCE(jsonb_agg(to_jsonb(a) ORDER BY a.clerk_user_id COLLATE "C"), '[]'::jsonb)
    INTO actual_rows FROM public.platform_admins AS a;
  IF actual_rows IS DISTINCT FROM before_admins THEN
    RAISE EXCEPTION 'Existing administrator records changed. Rolling back.';
  END IF;

  IF (SELECT count(*) FROM public.module_catalog) <> jsonb_array_length(before_modules) + 16
     OR (SELECT count(*) FROM public.landing_products) <> jsonb_array_length(before_products) + 16
     OR (SELECT count(*) FROM public.landing_products WHERE key = ANY(expected_keys) AND visible = true) <> 15
     OR NOT EXISTS (SELECT 1 FROM public.landing_products WHERE key = 'kolo' AND visible = false AND display_order = 160) THEN
    RAISE EXCEPTION 'Final row-count or visibility validation failed. Rolling back.';
  END IF;

  RAISE NOTICE 'Validated 16 module inserts and 16 product inserts. Every field matches; all existing catalog/admin records are unchanged; 15 products visible and Kolo hidden. COMMIT follows.';
END;
$qx_insert$ LANGUAGE plpgsql;

COMMIT;

-- Post-commit readback. Only treat the run as successful if there were NO errors.
WITH approved_keys AS (
  SELECT unnest(ARRAY['android_app','articles','cloud_mining','crypto_card','crypto_engine','crypto_exchange','crypto_payments','dex','earn','ios_app','kolo','rpc_nodes','staking','telegram_bot','telegram_mini_app','whatsapp_bot']::text[]) AS key
)
SELECT
  (SELECT count(*) FROM public.module_catalog m JOIN approved_keys k USING (key)) AS approved_modules_present,
  (SELECT count(*) FROM public.landing_products p JOIN approved_keys k USING (key)) AS approved_products_present,
  (SELECT count(*) FROM public.landing_products p JOIN approved_keys k USING (key) WHERE p.visible) AS approved_visible_products,
  EXISTS (SELECT 1 FROM public.landing_products WHERE key = 'kolo' AND visible = false AND display_order = 160) AS kolo_hidden,
  (SELECT count(*) FROM public.platform_admins WHERE active = true) AS active_platform_admins;
