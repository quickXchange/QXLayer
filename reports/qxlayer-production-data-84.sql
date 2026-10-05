-- QXLayer: approved Production DATA ONLY. PREPARED, NOT EXECUTED.
-- Source: reports/qxlayer-production-row-manifest.csv (unchanged).
-- Manifest SHA-256: 1f1d113f99c5c8f25e4bb5bba680b827fc9bdbefd6f06572a4040dd73877cc4b
-- Exactly 83 approved global records + the one expressly authorized Production owner.
-- Source values serialized by PostgreSQL quote_nullable, with explicit source types.
-- No schema changes, updates, deletes, truncation, credential transfer, or tenant/operational imports.
-- Existing approved global catalog testnet definitions are preserved; no demo tenant data is imported.
-- Target tables MUST be empty. Existing rows cause an exception; this is intentionally not an upsert.
-- Execute the WHOLE file only against the authorized Production database.
-- Suggested authorized-client invocation (NOT run by Agent):
-- psql "$PRODUCTION_DATABASE_URL" -X --set=ON_ERROR_STOP=1 --file=reports/qxlayer-production-data-84.sql
-- Do not also pass --single-transaction: this file already has BEGIN/COMMIT.
-- On any SQL error, PostgreSQL aborts the transaction. ON_ERROR_STOP exits psql,
-- whose disconnect rolls back the uncommitted transaction. No partial import is committed.
-- Clients that keep an errored session open must issue ROLLBACK; never continue edits in it.

BEGIN;
SET LOCAL standard_conforming_strings = on;
SET LOCAL TIME ZONE 'GMT';
SET LOCAL DateStyle = 'ISO, MDY';

-- Prevent concurrent writes to these seven target tables until COMMIT.
LOCK TABLE public."module_catalog", public."entitlement_definitions", public."asset_catalog", public."network_catalog", public."landing_products", public."asset_network_catalog", public."platform_admins" IN EXCLUSIVE MODE;

DO $qxlayer_approved_84$
BEGIN
  IF (SELECT count(*) FROM public."module_catalog") <> 0 THEN
    RAISE EXCEPTION 'Precondition failed: public.module_catalog must be empty; nothing will be imported.';
  END IF;
  IF (SELECT count(*) FROM public."entitlement_definitions") <> 0 THEN
    RAISE EXCEPTION 'Precondition failed: public.entitlement_definitions must be empty; nothing will be imported.';
  END IF;
  IF (SELECT count(*) FROM public."asset_catalog") <> 0 THEN
    RAISE EXCEPTION 'Precondition failed: public.asset_catalog must be empty; nothing will be imported.';
  END IF;
  IF (SELECT count(*) FROM public."network_catalog") <> 0 THEN
    RAISE EXCEPTION 'Precondition failed: public.network_catalog must be empty; nothing will be imported.';
  END IF;
  IF (SELECT count(*) FROM public."landing_products") <> 0 THEN
    RAISE EXCEPTION 'Precondition failed: public.landing_products must be empty; nothing will be imported.';
  END IF;
  IF (SELECT count(*) FROM public."asset_network_catalog") <> 0 THEN
    RAISE EXCEPTION 'Precondition failed: public.asset_network_catalog must be empty; nothing will be imported.';
  END IF;
  IF (SELECT count(*) FROM public."platform_admins") <> 0 THEN
    RAISE EXCEPTION 'Precondition failed: public.platform_admins must be empty; nothing will be imported.';
  END IF;

  -- module_catalog: 18 approved records.
  INSERT INTO public."module_catalog" ("key", "name", "description", "category", "sandbox_available", "definition")
  VALUES ('android_app'::text, 'Android App'::text, 'Registered for future independent implementation. No execution is implemented.'::text, 'Channels'::text, 'false'::boolean, '{"key": "android_app", "name": "Android App", "limits": [], "category": "Channels", "features": [], "lifecycle": "deferred", "description": "Registered for future independent implementation. No execution is implemented.", "sandboxAvailable": false, "requiresAssetNetworks": false}'::jsonb);
  INSERT INTO public."module_catalog" ("key", "name", "description", "category", "sandbox_available", "definition")
  VALUES ('articles'::text, 'Articles / Content'::text, 'Registered for future independent implementation. No execution is implemented.'::text, 'Content'::text, 'false'::boolean, '{"key": "articles", "name": "Articles / Content", "limits": [], "category": "Content", "features": [], "lifecycle": "deferred", "description": "Registered for future independent implementation. No execution is implemented.", "sandboxAvailable": false, "requiresAssetNetworks": false}'::jsonb);
  INSERT INTO public."module_catalog" ("key", "name", "description", "category", "sandbox_available", "definition")
  VALUES ('cloud_mining'::text, 'Cloud Mining'::text, 'Registered for future independent implementation. No execution is implemented.'::text, 'Infrastructure'::text, 'false'::boolean, '{"key": "cloud_mining", "name": "Cloud Mining", "limits": [], "category": "Infrastructure", "features": [], "lifecycle": "deferred", "description": "Registered for future independent implementation. No execution is implemented.", "sandboxAvailable": false, "requiresAssetNetworks": false}'::jsonb);
  INSERT INTO public."module_catalog" ("key", "name", "description", "category", "sandbox_available", "definition")
  VALUES ('crypto_card'::text, 'Crypto Card'::text, 'Registered for future independent implementation. No execution is implemented.'::text, 'Financial'::text, 'false'::boolean, '{"key": "crypto_card", "name": "Crypto Card", "limits": [], "category": "Financial", "features": [], "lifecycle": "deferred", "description": "Registered for future independent implementation. No execution is implemented.", "sandboxAvailable": false, "requiresAssetNetworks": false}'::jsonb);
  INSERT INTO public."module_catalog" ("key", "name", "description", "category", "sandbox_available", "definition")
  VALUES ('crypto_engine'::text, 'Crypto Engine'::text, 'Registered for future independent implementation. No execution is implemented.'::text, 'Infrastructure'::text, 'false'::boolean, '{"key": "crypto_engine", "name": "Crypto Engine", "limits": [], "category": "Infrastructure", "features": [], "lifecycle": "deferred", "description": "Registered for future independent implementation. No execution is implemented.", "sandboxAvailable": false, "requiresAssetNetworks": false}'::jsonb);
  INSERT INTO public."module_catalog" ("key", "name", "description", "category", "sandbox_available", "definition")
  VALUES ('crypto_exchange'::text, 'Crypto Exchange'::text, 'Exchange, swap, and convert product entitlement. Engine implementation is deferred.'::text, 'Financial'::text, 'true'::boolean, '{"key": "crypto_exchange", "name": "Exchange", "limits": [], "category": "Financial", "features": [{"key": "swap", "label": "swap", "dependsOn": ["crypto_exchange"]}, {"key": "convert", "label": "convert", "dependsOn": ["crypto_exchange"]}, {"key": "buy", "label": "Buy (Buy/Sell)", "dependsOn": ["crypto_exchange"]}, {"key": "sell", "label": "Sell (Buy/Sell)", "dependsOn": ["crypto_exchange"]}], "lifecycle": "sandbox_only", "description": "Shared platform configuration; financial execution remains disabled.", "sandboxAvailable": true, "requiresAssetNetworks": true}'::jsonb);
  INSERT INTO public."module_catalog" ("key", "name", "description", "category", "sandbox_available", "definition")
  VALUES ('crypto_payments'::text, 'Crypto Payments'::text, 'Crypto payment gateway entitlement. Invoice execution is deferred.'::text, 'Financial'::text, 'true'::boolean, '{"key": "crypto_payments", "name": "Crypto Payments", "limits": [], "category": "Financial", "features": [], "lifecycle": "deferred", "description": "Registered for future independent implementation. No execution is implemented.", "sandboxAvailable": false, "requiresAssetNetworks": true}'::jsonb);
  INSERT INTO public."module_catalog" ("key", "name", "description", "category", "sandbox_available", "definition")
  VALUES ('dex'::text, 'DEX'::text, 'Registered for future independent implementation. No execution is implemented.'::text, 'Financial'::text, 'false'::boolean, '{"key": "dex", "name": "DEX", "limits": [], "category": "Financial", "features": [], "lifecycle": "deferred", "description": "Registered for future independent implementation. No execution is implemented.", "sandboxAvailable": false, "requiresAssetNetworks": false}'::jsonb);
  INSERT INTO public."module_catalog" ("key", "name", "description", "category", "sandbox_available", "definition")
  VALUES ('earn'::text, 'Earn'::text, 'Registered for future independent implementation. No execution is implemented.'::text, 'Financial'::text, 'false'::boolean, '{"key": "earn", "name": "Earn", "limits": [], "category": "Financial", "features": [], "lifecycle": "deferred", "description": "Registered for future independent implementation. No execution is implemented.", "sandboxAvailable": false, "requiresAssetNetworks": false}'::jsonb);
  INSERT INTO public."module_catalog" ("key", "name", "description", "category", "sandbox_available", "definition")
  VALUES ('ios_app'::text, 'iOS App'::text, 'Registered for future independent implementation. No execution is implemented.'::text, 'Channels'::text, 'false'::boolean, '{"key": "ios_app", "name": "iOS App", "limits": [], "category": "Channels", "features": [], "lifecycle": "deferred", "description": "Registered for future independent implementation. No execution is implemented.", "sandboxAvailable": false, "requiresAssetNetworks": false}'::jsonb);
  INSERT INTO public."module_catalog" ("key", "name", "description", "category", "sandbox_available", "definition")
  VALUES ('kolo'::text, 'Kolo'::text, 'Registered for future independent implementation. No execution is implemented.'::text, 'Products'::text, 'false'::boolean, '{"key": "kolo", "name": "Kolo", "limits": [], "category": "Products", "features": [], "lifecycle": "deferred", "description": "Registered for future independent implementation. No execution is implemented.", "sandboxAvailable": false, "requiresAssetNetworks": false}'::jsonb);
  INSERT INTO public."module_catalog" ("key", "name", "description", "category", "sandbox_available", "definition")
  VALUES ('merchant_api'::text, 'Merchant API'::text, 'Scoped developer API entitlement. Public merchant endpoints are deferred.'::text, 'Developer'::text, 'true'::boolean, '{"key": "merchant_api", "name": "API Credentials & Webhooks", "limits": [], "category": "Core", "features": [{"key": "api_keys", "label": "api_keys", "dependsOn": ["merchant_api"]}, {"key": "webhooks", "label": "webhooks", "dependsOn": ["merchant_api"]}], "lifecycle": "sandbox_only", "description": "Shared platform configuration; financial execution remains disabled.", "sandboxAvailable": false, "requiresAssetNetworks": false}'::jsonb);
  INSERT INTO public."module_catalog" ("key", "name", "description", "category", "sandbox_available", "definition")
  VALUES ('rpc_nodes'::text, 'RPC / Nodes'::text, 'Registered for future independent implementation. No execution is implemented.'::text, 'Infrastructure'::text, 'false'::boolean, '{"key": "rpc_nodes", "name": "RPC / Nodes", "limits": [], "category": "Infrastructure", "features": [], "lifecycle": "deferred", "description": "Registered for future independent implementation. No execution is implemented.", "sandboxAvailable": false, "requiresAssetNetworks": false}'::jsonb);
  INSERT INTO public."module_catalog" ("key", "name", "description", "category", "sandbox_available", "definition")
  VALUES ('staking'::text, 'Staking'::text, 'Registered for future independent implementation. No execution is implemented.'::text, 'Financial'::text, 'false'::boolean, '{"key": "staking", "name": "Staking", "limits": [], "category": "Financial", "features": [], "lifecycle": "deferred", "description": "Registered for future independent implementation. No execution is implemented.", "sandboxAvailable": false, "requiresAssetNetworks": false}'::jsonb);
  INSERT INTO public."module_catalog" ("key", "name", "description", "category", "sandbox_available", "definition")
  VALUES ('telegram_bot'::text, 'Telegram Bot'::text, 'Branded bot entitlement using the shared backend. Bot connection is deferred.'::text, 'Channels'::text, 'true'::boolean, '{"key": "telegram_bot", "name": "Telegram Bot", "limits": [], "category": "Channels", "features": [], "lifecycle": "deferred", "description": "Registered for future independent implementation. No execution is implemented.", "sandboxAvailable": false, "requiresAssetNetworks": false}'::jsonb);
  INSERT INTO public."module_catalog" ("key", "name", "description", "category", "sandbox_available", "definition")
  VALUES ('telegram_mini_app'::text, 'Telegram Mini App'::text, 'Telegram web app entitlement using the same tenant configuration.'::text, 'Channels'::text, 'true'::boolean, '{"key": "telegram_mini_app", "name": "Telegram Mini App", "limits": [], "category": "Channels", "features": [], "lifecycle": "deferred", "description": "Registered for future independent implementation. No execution is implemented.", "sandboxAvailable": false, "requiresAssetNetworks": false}'::jsonb);
  INSERT INTO public."module_catalog" ("key", "name", "description", "category", "sandbox_available", "definition")
  VALUES ('website'::text, 'Website'::text, 'Shared dynamically branded sandbox website. No payment execution.'::text, 'Channels'::text, 'true'::boolean, '{"key": "website", "name": "Tenant Website", "limits": [], "category": "Core", "features": [], "lifecycle": "core_ready", "description": "Shared platform configuration; financial execution remains disabled.", "sandboxAvailable": true, "requiresAssetNetworks": false}'::jsonb);
  INSERT INTO public."module_catalog" ("key", "name", "description", "category", "sandbox_available", "definition")
  VALUES ('whatsapp_bot'::text, 'WhatsApp Bot'::text, 'Registered for future independent implementation. No execution is implemented.'::text, 'Channels'::text, 'false'::boolean, '{"key": "whatsapp_bot", "name": "WhatsApp Bot", "limits": [], "category": "Channels", "features": [], "lifecycle": "deferred", "description": "Registered for future independent implementation. No execution is implemented.", "sandboxAvailable": false, "requiresAssetNetworks": false}'::jsonb);

  -- entitlement_definitions: 32 approved records.
  INSERT INTO public."entitlement_definitions" ("key", "label", "kind", "value_type")
  VALUES ('android_app'::text, 'Android App'::text, 'feature'::text, 'boolean'::text);
  INSERT INTO public."entitlement_definitions" ("key", "label", "kind", "value_type")
  VALUES ('api_keys'::text, 'Sandbox API key configuration'::text, 'feature'::text, 'boolean'::text);
  INSERT INTO public."entitlement_definitions" ("key", "label", "kind", "value_type")
  VALUES ('articles'::text, 'Articles / Content'::text, 'feature'::text, 'boolean'::text);
  INSERT INTO public."entitlement_definitions" ("key", "label", "kind", "value_type")
  VALUES ('buy'::text, 'Buy'::text, 'feature'::text, 'boolean'::text);
  INSERT INTO public."entitlement_definitions" ("key", "label", "kind", "value_type")
  VALUES ('cloud_mining'::text, 'Cloud Mining'::text, 'feature'::text, 'boolean'::text);
  INSERT INTO public."entitlement_definitions" ("key", "label", "kind", "value_type")
  VALUES ('convert'::text, 'Convert'::text, 'feature'::text, 'boolean'::text);
  INSERT INTO public."entitlement_definitions" ("key", "label", "kind", "value_type")
  VALUES ('crypto_card'::text, 'Crypto Card'::text, 'feature'::text, 'boolean'::text);
  INSERT INTO public."entitlement_definitions" ("key", "label", "kind", "value_type")
  VALUES ('crypto_engine'::text, 'Crypto Engine'::text, 'feature'::text, 'boolean'::text);
  INSERT INTO public."entitlement_definitions" ("key", "label", "kind", "value_type")
  VALUES ('crypto_exchange'::text, 'Crypto Exchange'::text, 'feature'::text, 'boolean'::text);
  INSERT INTO public."entitlement_definitions" ("key", "label", "kind", "value_type")
  VALUES ('crypto_payments'::text, 'Crypto Payments'::text, 'feature'::text, 'boolean'::text);
  INSERT INTO public."entitlement_definitions" ("key", "label", "kind", "value_type")
  VALUES ('dex'::text, 'DEX'::text, 'feature'::text, 'boolean'::text);
  INSERT INTO public."entitlement_definitions" ("key", "label", "kind", "value_type")
  VALUES ('earn'::text, 'Earn'::text, 'feature'::text, 'boolean'::text);
  INSERT INTO public."entitlement_definitions" ("key", "label", "kind", "value_type")
  VALUES ('ios_app'::text, 'iOS App'::text, 'feature'::text, 'boolean'::text);
  INSERT INTO public."entitlement_definitions" ("key", "label", "kind", "value_type")
  VALUES ('kolo'::text, 'Kolo'::text, 'feature'::text, 'boolean'::text);
  INSERT INTO public."entitlement_definitions" ("key", "label", "kind", "value_type")
  VALUES ('max_api_keys'::text, 'Active API keys'::text, 'limit'::text, 'integer'::text);
  INSERT INTO public."entitlement_definitions" ("key", "label", "kind", "value_type")
  VALUES ('max_monthly_transactions'::text, 'Monthly sandbox transaction units'::text, 'limit'::text, 'integer'::text);
  INSERT INTO public."entitlement_definitions" ("key", "label", "kind", "value_type")
  VALUES ('max_monthly_volume'::text, 'Monthly volume in plan currency'::text, 'limit'::text, 'decimal'::text);
  INSERT INTO public."entitlement_definitions" ("key", "label", "kind", "value_type")
  VALUES ('max_payment_methods'::text, 'Payment method configurations'::text, 'limit'::text, 'integer'::text);
  INSERT INTO public."entitlement_definitions" ("key", "label", "kind", "value_type")
  VALUES ('max_staff'::text, 'Staff members'::text, 'limit'::text, 'integer'::text);
  INSERT INTO public."entitlement_definitions" ("key", "label", "kind", "value_type")
  VALUES ('max_supported_assets'::text, 'Supported assets'::text, 'limit'::text, 'integer'::text);
  INSERT INTO public."entitlement_definitions" ("key", "label", "kind", "value_type")
  VALUES ('max_supported_networks'::text, 'Supported networks'::text, 'limit'::text, 'integer'::text);
  INSERT INTO public."entitlement_definitions" ("key", "label", "kind", "value_type")
  VALUES ('max_webhooks'::text, 'Webhook configurations'::text, 'limit'::text, 'integer'::text);
  INSERT INTO public."entitlement_definitions" ("key", "label", "kind", "value_type")
  VALUES ('merchant_api'::text, 'Merchant API'::text, 'feature'::text, 'boolean'::text);
  INSERT INTO public."entitlement_definitions" ("key", "label", "kind", "value_type")
  VALUES ('rpc_nodes'::text, 'RPC / Nodes'::text, 'feature'::text, 'boolean'::text);
  INSERT INTO public."entitlement_definitions" ("key", "label", "kind", "value_type")
  VALUES ('sell'::text, 'Sell'::text, 'feature'::text, 'boolean'::text);
  INSERT INTO public."entitlement_definitions" ("key", "label", "kind", "value_type")
  VALUES ('staking'::text, 'Staking'::text, 'feature'::text, 'boolean'::text);
  INSERT INTO public."entitlement_definitions" ("key", "label", "kind", "value_type")
  VALUES ('swap'::text, 'Swap'::text, 'feature'::text, 'boolean'::text);
  INSERT INTO public."entitlement_definitions" ("key", "label", "kind", "value_type")
  VALUES ('telegram_bot'::text, 'Telegram Bot (deferred)'::text, 'feature'::text, 'boolean'::text);
  INSERT INTO public."entitlement_definitions" ("key", "label", "kind", "value_type")
  VALUES ('telegram_mini_app'::text, 'Telegram Mini App (deferred)'::text, 'feature'::text, 'boolean'::text);
  INSERT INTO public."entitlement_definitions" ("key", "label", "kind", "value_type")
  VALUES ('webhooks'::text, 'Webhook configuration'::text, 'feature'::text, 'boolean'::text);
  INSERT INTO public."entitlement_definitions" ("key", "label", "kind", "value_type")
  VALUES ('website'::text, 'Private-label website'::text, 'feature'::text, 'boolean'::text);
  INSERT INTO public."entitlement_definitions" ("key", "label", "kind", "value_type")
  VALUES ('whatsapp_bot'::text, 'WhatsApp Bot'::text, 'feature'::text, 'boolean'::text);

  -- asset_catalog: 5 approved records.
  INSERT INTO public."asset_catalog" ("id", "symbol", "name")
  VALUES ('bnb'::text, 'BNB'::text, 'BNB'::text);
  INSERT INTO public."asset_catalog" ("id", "symbol", "name")
  VALUES ('btc'::text, 'BTC'::text, 'Bitcoin'::text);
  INSERT INTO public."asset_catalog" ("id", "symbol", "name")
  VALUES ('eth'::text, 'ETH'::text, 'Ethereum'::text);
  INSERT INTO public."asset_catalog" ("id", "symbol", "name")
  VALUES ('sol'::text, 'SOL'::text, 'Solana'::text);
  INSERT INTO public."asset_catalog" ("id", "symbol", "name")
  VALUES ('usdt'::text, 'USDT'::text, 'Tether'::text);

  -- network_catalog: 5 approved records.
  INSERT INTO public."network_catalog" ("id", "name", "testnet")
  VALUES ('bitcoin-testnet'::text, 'Bitcoin Testnet'::text, 'true'::boolean);
  INSERT INTO public."network_catalog" ("id", "name", "testnet")
  VALUES ('bsc-testnet'::text, 'BSC Testnet'::text, 'true'::boolean);
  INSERT INTO public."network_catalog" ("id", "name", "testnet")
  VALUES ('ethereum-sepolia'::text, 'Ethereum Sepolia'::text, 'true'::boolean);
  INSERT INTO public."network_catalog" ("id", "name", "testnet")
  VALUES ('solana-devnet'::text, 'Solana Devnet'::text, 'true'::boolean);
  INSERT INTO public."network_catalog" ("id", "name", "testnet")
  VALUES ('tron-nile'::text, 'TRON Nile'::text, 'true'::boolean);

  -- landing_products: 16 approved records.
  INSERT INTO public."landing_products" ("key", "visible", "name", "description", "icon", "starting_price", "setup_fee", "currency", "billing_period", "status", "cta_label", "display_order")
  VALUES ('android_app'::text, 'true'::boolean, 'Android App'::text, 'Bring your ecosystem to Android with a branded mobile experience and shared platform configuration. Mobile application development is planned.'::text, 'android'::text, NULL::numeric(12,2), NULL::numeric(12,2), 'USD'::text, 'on_request'::text, 'coming_soon'::text, 'Learn More'::text, '50'::integer);
  INSERT INTO public."landing_products" ("key", "visible", "name", "description", "icon", "starting_price", "setup_fee", "currency", "billing_period", "status", "cta_label", "display_order")
  VALUES ('articles'::text, 'true'::boolean, 'Articles / Content'::text, 'A planned publishing product for branded articles, education and ecosystem updates. The editorial CMS is not implemented yet.'::text, 'content'::text, NULL::numeric(12,2), NULL::numeric(12,2), 'USD'::text, 'on_request'::text, 'coming_soon'::text, 'Learn More'::text, '100'::integer);
  INSERT INTO public."landing_products" ("key", "visible", "name", "description", "icon", "starting_price", "setup_fee", "currency", "billing_period", "status", "cta_label", "display_order")
  VALUES ('cloud_mining'::text, 'true'::boolean, 'Cloud Mining'::text, 'A planned mining product in the modular ecosystem. Mining execution, contracts and returns are not implemented or offered.'::text, 'mining'::text, NULL::numeric(12,2), NULL::numeric(12,2), 'USD'::text, 'on_request'::text, 'coming_soon'::text, 'Learn More'::text, '150'::integer);
  INSERT INTO public."landing_products" ("key", "visible", "name", "description", "icon", "starting_price", "setup_fee", "currency", "billing_period", "status", "cta_label", "display_order")
  VALUES ('crypto_card'::text, 'true'::boolean, 'Crypto Card'::text, 'A planned branded card offering within your wider crypto ecosystem. Card issuance, spending and provider integrations are not implemented.'::text, 'card'::text, NULL::numeric(12,2), NULL::numeric(12,2), 'USD'::text, 'on_request'::text, 'coming_soon'::text, 'Learn More'::text, '60'::integer);
  INSERT INTO public."landing_products" ("key", "visible", "name", "description", "icon", "starting_price", "setup_fee", "currency", "billing_period", "status", "cta_label", "display_order")
  VALUES ('crypto_engine'::text, 'true'::boolean, 'Crypto Engine'::text, 'A planned orchestration layer connecting your crypto products through one modular platform. Financial execution and provider integrations are not implemented.'::text, 'engine'::text, NULL::numeric(12,2), NULL::numeric(12,2), 'USD'::text, 'on_request'::text, 'coming_soon'::text, 'Learn More'::text, '30'::integer);
  INSERT INTO public."landing_products" ("key", "visible", "name", "description", "icon", "starting_price", "setup_fee", "currency", "billing_period", "status", "cta_label", "display_order")
  VALUES ('crypto_exchange'::text, 'true'::boolean, 'White Label Exchange — Swap / Convert / Buy & Sell'::text, 'Your brand at the center of the exchange experience. Configure swap, convert, buy and sell journeys on the shared White Label Core. Currently a non-executing sandbox.'::text, 'exchange'::text, NULL::numeric(12,2), NULL::numeric(12,2), 'USD'::text, 'on_request'::text, 'available'::text, 'Learn More'::text, '10'::integer);
  INSERT INTO public."landing_products" ("key", "visible", "name", "description", "icon", "starting_price", "setup_fee", "currency", "billing_period", "status", "cta_label", "display_order")
  VALUES ('crypto_payments'::text, 'true'::boolean, 'Crypto Payment Gateway'::text, 'Bring branded crypto payment experiences into your ecosystem. Merchant checkout and payment infrastructure are planned; payment processing is not implemented.'::text, 'payments'::text, NULL::numeric(12,2), NULL::numeric(12,2), 'USD'::text, 'on_request'::text, 'coming_soon'::text, 'Learn More'::text, '20'::integer);
  INSERT INTO public."landing_products" ("key", "visible", "name", "description", "icon", "starting_price", "setup_fee", "currency", "billing_period", "status", "cta_label", "display_order")
  VALUES ('dex'::text, 'true'::boolean, 'DEX'::text, 'A planned decentralized exchange experience under your brand. Smart contracts, liquidity routing and trade execution are not implemented.'::text, 'dex'::text, NULL::numeric(12,2), NULL::numeric(12,2), 'USD'::text, 'on_request'::text, 'coming_soon'::text, 'Learn More'::text, '90'::integer);
  INSERT INTO public."landing_products" ("key", "visible", "name", "description", "icon", "starting_price", "setup_fee", "currency", "billing_period", "status", "cta_label", "display_order")
  VALUES ('earn'::text, 'true'::boolean, 'Earn API'::text, 'A planned API layer for future earning products in your ecosystem. Yield generation, balances and financial execution are not implemented.'::text, 'earn'::text, NULL::numeric(12,2), NULL::numeric(12,2), 'USD'::text, 'on_request'::text, 'coming_soon'::text, 'Learn More'::text, '80'::integer);
  INSERT INTO public."landing_products" ("key", "visible", "name", "description", "icon", "starting_price", "setup_fee", "currency", "billing_period", "status", "cta_label", "display_order")
  VALUES ('ios_app'::text, 'true'::boolean, 'iOS App'::text, 'Extend your brand to a native iOS experience connected to the same White Label platform. Mobile application development is planned, not available today.'::text, 'ios'::text, NULL::numeric(12,2), NULL::numeric(12,2), 'USD'::text, 'on_request'::text, 'coming_soon'::text, 'Learn More'::text, '40'::integer);
  INSERT INTO public."landing_products" ("key", "visible", "name", "description", "icon", "starting_price", "setup_fee", "currency", "billing_period", "status", "cta_label", "display_order")
  VALUES ('kolo'::text, 'true'::boolean, 'Kolo'::text, 'A reserved future product within the modular White Label ecosystem. Product functionality and integrations are not implemented.'::text, 'kolo'::text, NULL::numeric(12,2), NULL::numeric(12,2), 'USD'::text, 'on_request'::text, 'coming_soon'::text, 'Learn More'::text, '160'::integer);
  INSERT INTO public."landing_products" ("key", "visible", "name", "description", "icon", "starting_price", "setup_fee", "currency", "billing_period", "status", "cta_label", "display_order")
  VALUES ('rpc_nodes'::text, 'true'::boolean, 'RPC / Nodes'::text, 'A planned infrastructure offering for blockchain connectivity. No node hosting, RPC endpoints or live blockchain services are provided today.'::text, 'nodes'::text, NULL::numeric(12,2), NULL::numeric(12,2), 'USD'::text, 'on_request'::text, 'coming_soon'::text, 'Learn More'::text, '140'::integer);
  INSERT INTO public."landing_products" ("key", "visible", "name", "description", "icon", "starting_price", "setup_fee", "currency", "billing_period", "status", "cta_label", "display_order")
  VALUES ('staking'::text, 'true'::boolean, 'Staking API'::text, 'A planned staking interface for future integration into your branded products. No staking engine, rewards or blockchain execution is connected.'::text, 'staking'::text, NULL::numeric(12,2), NULL::numeric(12,2), 'USD'::text, 'on_request'::text, 'coming_soon'::text, 'Learn More'::text, '70'::integer);
  INSERT INTO public."landing_products" ("key", "visible", "name", "description", "icon", "starting_price", "setup_fee", "currency", "billing_period", "status", "cta_label", "display_order")
  VALUES ('telegram_bot'::text, 'true'::boolean, 'Telegram Bot'::text, 'A planned conversational entry point for your branded ecosystem on Telegram. Bot delivery and financial actions are not implemented.'::text, 'telegram'::text, NULL::numeric(12,2), NULL::numeric(12,2), 'USD'::text, 'on_request'::text, 'coming_soon'::text, 'Learn More'::text, '110'::integer);
  INSERT INTO public."landing_products" ("key", "visible", "name", "description", "icon", "starting_price", "setup_fee", "currency", "billing_period", "status", "cta_label", "display_order")
  VALUES ('telegram_mini_app'::text, 'true'::boolean, 'Telegram Mini App'::text, 'A planned compact branded experience inside Telegram, connected to the shared platform. Mini App development and integration are deferred.'::text, 'miniapp'::text, NULL::numeric(12,2), NULL::numeric(12,2), 'USD'::text, 'on_request'::text, 'coming_soon'::text, 'Learn More'::text, '120'::integer);
  INSERT INTO public."landing_products" ("key", "visible", "name", "description", "icon", "starting_price", "setup_fee", "currency", "billing_period", "status", "cta_label", "display_order")
  VALUES ('whatsapp_bot'::text, 'true'::boolean, 'WhatsApp Bot'::text, 'A planned messaging channel for your branded customer experience. WhatsApp delivery and provider integrations are not implemented.'::text, 'whatsapp'::text, NULL::numeric(12,2), NULL::numeric(12,2), 'USD'::text, 'on_request'::text, 'coming_soon'::text, 'Learn More'::text, '130'::integer);

  -- asset_network_catalog: 7 approved records.
  INSERT INTO public."asset_network_catalog" ("id", "asset_id", "network_id")
  VALUES ('bnb:bsc-testnet'::text, 'bnb'::text, 'bsc-testnet'::text);
  INSERT INTO public."asset_network_catalog" ("id", "asset_id", "network_id")
  VALUES ('btc:bitcoin-testnet'::text, 'btc'::text, 'bitcoin-testnet'::text);
  INSERT INTO public."asset_network_catalog" ("id", "asset_id", "network_id")
  VALUES ('eth:ethereum-sepolia'::text, 'eth'::text, 'ethereum-sepolia'::text);
  INSERT INTO public."asset_network_catalog" ("id", "asset_id", "network_id")
  VALUES ('sol:solana-devnet'::text, 'sol'::text, 'solana-devnet'::text);
  INSERT INTO public."asset_network_catalog" ("id", "asset_id", "network_id")
  VALUES ('usdt:bsc-testnet'::text, 'usdt'::text, 'bsc-testnet'::text);
  INSERT INTO public."asset_network_catalog" ("id", "asset_id", "network_id")
  VALUES ('usdt:ethereum-sepolia'::text, 'usdt'::text, 'ethereum-sepolia'::text);
  INSERT INTO public."asset_network_catalog" ("id", "asset_id", "network_id")
  VALUES ('usdt:tron-nile'::text, 'usdt'::text, 'tron-nile'::text);

  -- platform_admins: 1 approved records.
  INSERT INTO public."platform_admins" ("clerk_user_id", "active", "created_at")
  VALUES ('user_3KF0i38mD09exoEm6cdBCLFQQRL'::text, 'true'::boolean, '2026-10-05 01:14:34.310436+00'::timestamp with time zone);

  -- Counts and exact row fingerprints are assertions, not merely printed results.
  IF (SELECT count(*) FROM public."module_catalog") <> 18 THEN
    RAISE EXCEPTION 'Verification failed: module_catalog must contain exactly 18 rows.';
  END IF;
  IF (SELECT count(*) FROM public."entitlement_definitions") <> 32 THEN
    RAISE EXCEPTION 'Verification failed: entitlement_definitions must contain exactly 32 rows.';
  END IF;
  IF (SELECT count(*) FROM public."asset_catalog") <> 5 THEN
    RAISE EXCEPTION 'Verification failed: asset_catalog must contain exactly 5 rows.';
  END IF;
  IF (SELECT count(*) FROM public."network_catalog") <> 5 THEN
    RAISE EXCEPTION 'Verification failed: network_catalog must contain exactly 5 rows.';
  END IF;
  IF (SELECT count(*) FROM public."landing_products") <> 16 THEN
    RAISE EXCEPTION 'Verification failed: landing_products must contain exactly 16 rows.';
  END IF;
  IF (SELECT count(*) FROM public."asset_network_catalog") <> 7 THEN
    RAISE EXCEPTION 'Verification failed: asset_network_catalog must contain exactly 7 rows.';
  END IF;
  IF (SELECT count(*) FROM public."platform_admins") <> 1 THEN
    RAISE EXCEPTION 'Verification failed: platform_admins must contain exactly 1 rows.';
  END IF;
  IF (SELECT md5(to_jsonb(t)::text) FROM public."module_catalog" t WHERE t."key" = 'android_app') IS DISTINCT FROM '7dad03c37e9718a34c64d7976cf9307b' THEN
    RAISE EXCEPTION 'Verification failed: module_catalog/android_app differs from the approved Development record.';
  END IF;
  IF (SELECT md5(to_jsonb(t)::text) FROM public."module_catalog" t WHERE t."key" = 'articles') IS DISTINCT FROM '9e7e015c288269595c46edb0a6bce580' THEN
    RAISE EXCEPTION 'Verification failed: module_catalog/articles differs from the approved Development record.';
  END IF;
  IF (SELECT md5(to_jsonb(t)::text) FROM public."module_catalog" t WHERE t."key" = 'cloud_mining') IS DISTINCT FROM '4e8de7eb7e459f74d5c626e7df1ced61' THEN
    RAISE EXCEPTION 'Verification failed: module_catalog/cloud_mining differs from the approved Development record.';
  END IF;
  IF (SELECT md5(to_jsonb(t)::text) FROM public."module_catalog" t WHERE t."key" = 'crypto_card') IS DISTINCT FROM '349017b62ae436cd6ee56653491f5400' THEN
    RAISE EXCEPTION 'Verification failed: module_catalog/crypto_card differs from the approved Development record.';
  END IF;
  IF (SELECT md5(to_jsonb(t)::text) FROM public."module_catalog" t WHERE t."key" = 'crypto_engine') IS DISTINCT FROM 'cd0549b6ccef6cbe8adbae81c58867e7' THEN
    RAISE EXCEPTION 'Verification failed: module_catalog/crypto_engine differs from the approved Development record.';
  END IF;
  IF (SELECT md5(to_jsonb(t)::text) FROM public."module_catalog" t WHERE t."key" = 'crypto_exchange') IS DISTINCT FROM '93b423fa31d9abd8f2bf7994de0ed2d8' THEN
    RAISE EXCEPTION 'Verification failed: module_catalog/crypto_exchange differs from the approved Development record.';
  END IF;
  IF (SELECT md5(to_jsonb(t)::text) FROM public."module_catalog" t WHERE t."key" = 'crypto_payments') IS DISTINCT FROM 'e75daea11ca89877a161f2607a501b92' THEN
    RAISE EXCEPTION 'Verification failed: module_catalog/crypto_payments differs from the approved Development record.';
  END IF;
  IF (SELECT md5(to_jsonb(t)::text) FROM public."module_catalog" t WHERE t."key" = 'dex') IS DISTINCT FROM 'ace0771dd51a1354a242a05668b5a97b' THEN
    RAISE EXCEPTION 'Verification failed: module_catalog/dex differs from the approved Development record.';
  END IF;
  IF (SELECT md5(to_jsonb(t)::text) FROM public."module_catalog" t WHERE t."key" = 'earn') IS DISTINCT FROM '8637b0808c5f109444e182c584249766' THEN
    RAISE EXCEPTION 'Verification failed: module_catalog/earn differs from the approved Development record.';
  END IF;
  IF (SELECT md5(to_jsonb(t)::text) FROM public."module_catalog" t WHERE t."key" = 'ios_app') IS DISTINCT FROM '914d280232f8d8692b5fb23456b39fb7' THEN
    RAISE EXCEPTION 'Verification failed: module_catalog/ios_app differs from the approved Development record.';
  END IF;
  IF (SELECT md5(to_jsonb(t)::text) FROM public."module_catalog" t WHERE t."key" = 'kolo') IS DISTINCT FROM '217549be6f89a169b78ea2632a9c0ae5' THEN
    RAISE EXCEPTION 'Verification failed: module_catalog/kolo differs from the approved Development record.';
  END IF;
  IF (SELECT md5(to_jsonb(t)::text) FROM public."module_catalog" t WHERE t."key" = 'merchant_api') IS DISTINCT FROM 'f55333f9eb0c9b4bf5459411c399ddce' THEN
    RAISE EXCEPTION 'Verification failed: module_catalog/merchant_api differs from the approved Development record.';
  END IF;
  IF (SELECT md5(to_jsonb(t)::text) FROM public."module_catalog" t WHERE t."key" = 'rpc_nodes') IS DISTINCT FROM 'e8e936b8b0308f372f56a1f23545025c' THEN
    RAISE EXCEPTION 'Verification failed: module_catalog/rpc_nodes differs from the approved Development record.';
  END IF;
  IF (SELECT md5(to_jsonb(t)::text) FROM public."module_catalog" t WHERE t."key" = 'staking') IS DISTINCT FROM '0f897c58fe61100181b47d9e8cc5f164' THEN
    RAISE EXCEPTION 'Verification failed: module_catalog/staking differs from the approved Development record.';
  END IF;
  IF (SELECT md5(to_jsonb(t)::text) FROM public."module_catalog" t WHERE t."key" = 'telegram_bot') IS DISTINCT FROM '4f04e2ad6f2e3500f12334e8ed77130c' THEN
    RAISE EXCEPTION 'Verification failed: module_catalog/telegram_bot differs from the approved Development record.';
  END IF;
  IF (SELECT md5(to_jsonb(t)::text) FROM public."module_catalog" t WHERE t."key" = 'telegram_mini_app') IS DISTINCT FROM '60d2b825a0b1b8f7bf5a0d0ab6bdfc6d' THEN
    RAISE EXCEPTION 'Verification failed: module_catalog/telegram_mini_app differs from the approved Development record.';
  END IF;
  IF (SELECT md5(to_jsonb(t)::text) FROM public."module_catalog" t WHERE t."key" = 'website') IS DISTINCT FROM '0badcc34bdb1f5c8aa7545bfb448f9ab' THEN
    RAISE EXCEPTION 'Verification failed: module_catalog/website differs from the approved Development record.';
  END IF;
  IF (SELECT md5(to_jsonb(t)::text) FROM public."module_catalog" t WHERE t."key" = 'whatsapp_bot') IS DISTINCT FROM '28e571d4bf37e8498e38435936b2e4d5' THEN
    RAISE EXCEPTION 'Verification failed: module_catalog/whatsapp_bot differs from the approved Development record.';
  END IF;
  IF (SELECT md5(to_jsonb(t)::text) FROM public."entitlement_definitions" t WHERE t."key" = 'android_app') IS DISTINCT FROM 'cab357f166a7590f0500b7bc23e46ce1' THEN
    RAISE EXCEPTION 'Verification failed: entitlement_definitions/android_app differs from the approved Development record.';
  END IF;
  IF (SELECT md5(to_jsonb(t)::text) FROM public."entitlement_definitions" t WHERE t."key" = 'api_keys') IS DISTINCT FROM '439946a98153dcb5d0966d92f8f160e0' THEN
    RAISE EXCEPTION 'Verification failed: entitlement_definitions/api_keys differs from the approved Development record.';
  END IF;
  IF (SELECT md5(to_jsonb(t)::text) FROM public."entitlement_definitions" t WHERE t."key" = 'articles') IS DISTINCT FROM 'a37b869bbb80aa3736c42fb5cc56659c' THEN
    RAISE EXCEPTION 'Verification failed: entitlement_definitions/articles differs from the approved Development record.';
  END IF;
  IF (SELECT md5(to_jsonb(t)::text) FROM public."entitlement_definitions" t WHERE t."key" = 'buy') IS DISTINCT FROM '62e662e91113847495802c2174a05cf8' THEN
    RAISE EXCEPTION 'Verification failed: entitlement_definitions/buy differs from the approved Development record.';
  END IF;
  IF (SELECT md5(to_jsonb(t)::text) FROM public."entitlement_definitions" t WHERE t."key" = 'cloud_mining') IS DISTINCT FROM 'f368d34e48de9616f1f7db85ab4a6f46' THEN
    RAISE EXCEPTION 'Verification failed: entitlement_definitions/cloud_mining differs from the approved Development record.';
  END IF;
  IF (SELECT md5(to_jsonb(t)::text) FROM public."entitlement_definitions" t WHERE t."key" = 'convert') IS DISTINCT FROM '38169268d9d4074a5181320104874d7c' THEN
    RAISE EXCEPTION 'Verification failed: entitlement_definitions/convert differs from the approved Development record.';
  END IF;
  IF (SELECT md5(to_jsonb(t)::text) FROM public."entitlement_definitions" t WHERE t."key" = 'crypto_card') IS DISTINCT FROM '561d257609a64bb5598465d8d1561304' THEN
    RAISE EXCEPTION 'Verification failed: entitlement_definitions/crypto_card differs from the approved Development record.';
  END IF;
  IF (SELECT md5(to_jsonb(t)::text) FROM public."entitlement_definitions" t WHERE t."key" = 'crypto_engine') IS DISTINCT FROM '6a40468a30c2f83ede61650a95171b70' THEN
    RAISE EXCEPTION 'Verification failed: entitlement_definitions/crypto_engine differs from the approved Development record.';
  END IF;
  IF (SELECT md5(to_jsonb(t)::text) FROM public."entitlement_definitions" t WHERE t."key" = 'crypto_exchange') IS DISTINCT FROM 'bea24841edd3dfa9eead01c74c20bc3e' THEN
    RAISE EXCEPTION 'Verification failed: entitlement_definitions/crypto_exchange differs from the approved Development record.';
  END IF;
  IF (SELECT md5(to_jsonb(t)::text) FROM public."entitlement_definitions" t WHERE t."key" = 'crypto_payments') IS DISTINCT FROM 'eace3e3a175bd73e75ebb5627918bf4a' THEN
    RAISE EXCEPTION 'Verification failed: entitlement_definitions/crypto_payments differs from the approved Development record.';
  END IF;
  IF (SELECT md5(to_jsonb(t)::text) FROM public."entitlement_definitions" t WHERE t."key" = 'dex') IS DISTINCT FROM '9738a2718e73d6241c65a5fc0b115f59' THEN
    RAISE EXCEPTION 'Verification failed: entitlement_definitions/dex differs from the approved Development record.';
  END IF;
  IF (SELECT md5(to_jsonb(t)::text) FROM public."entitlement_definitions" t WHERE t."key" = 'earn') IS DISTINCT FROM 'ea26379b3fa0d0f6318c8242208a7f07' THEN
    RAISE EXCEPTION 'Verification failed: entitlement_definitions/earn differs from the approved Development record.';
  END IF;
  IF (SELECT md5(to_jsonb(t)::text) FROM public."entitlement_definitions" t WHERE t."key" = 'ios_app') IS DISTINCT FROM '1cc5cdb2ea5182f3755b0f29f46a671d' THEN
    RAISE EXCEPTION 'Verification failed: entitlement_definitions/ios_app differs from the approved Development record.';
  END IF;
  IF (SELECT md5(to_jsonb(t)::text) FROM public."entitlement_definitions" t WHERE t."key" = 'kolo') IS DISTINCT FROM 'eb9b9e27a6c153e19cfada2556b518de' THEN
    RAISE EXCEPTION 'Verification failed: entitlement_definitions/kolo differs from the approved Development record.';
  END IF;
  IF (SELECT md5(to_jsonb(t)::text) FROM public."entitlement_definitions" t WHERE t."key" = 'max_api_keys') IS DISTINCT FROM '8dd2bb91fe81777762464e8e958d7d91' THEN
    RAISE EXCEPTION 'Verification failed: entitlement_definitions/max_api_keys differs from the approved Development record.';
  END IF;
  IF (SELECT md5(to_jsonb(t)::text) FROM public."entitlement_definitions" t WHERE t."key" = 'max_monthly_transactions') IS DISTINCT FROM '47430129141d9b4bfddc7447590098e7' THEN
    RAISE EXCEPTION 'Verification failed: entitlement_definitions/max_monthly_transactions differs from the approved Development record.';
  END IF;
  IF (SELECT md5(to_jsonb(t)::text) FROM public."entitlement_definitions" t WHERE t."key" = 'max_monthly_volume') IS DISTINCT FROM '61d22948fca6aea6ec6ec2cc7edf0d1b' THEN
    RAISE EXCEPTION 'Verification failed: entitlement_definitions/max_monthly_volume differs from the approved Development record.';
  END IF;
  IF (SELECT md5(to_jsonb(t)::text) FROM public."entitlement_definitions" t WHERE t."key" = 'max_payment_methods') IS DISTINCT FROM 'b3a0ff62a53a7e3a431a881b9d5eb979' THEN
    RAISE EXCEPTION 'Verification failed: entitlement_definitions/max_payment_methods differs from the approved Development record.';
  END IF;
  IF (SELECT md5(to_jsonb(t)::text) FROM public."entitlement_definitions" t WHERE t."key" = 'max_staff') IS DISTINCT FROM 'bf4ec671877841783aae87b811a34c7a' THEN
    RAISE EXCEPTION 'Verification failed: entitlement_definitions/max_staff differs from the approved Development record.';
  END IF;
  IF (SELECT md5(to_jsonb(t)::text) FROM public."entitlement_definitions" t WHERE t."key" = 'max_supported_assets') IS DISTINCT FROM '999b90a30e816234d5224b968850a3fe' THEN
    RAISE EXCEPTION 'Verification failed: entitlement_definitions/max_supported_assets differs from the approved Development record.';
  END IF;
  IF (SELECT md5(to_jsonb(t)::text) FROM public."entitlement_definitions" t WHERE t."key" = 'max_supported_networks') IS DISTINCT FROM 'bc732d6c58fe47ea7afe02830b6a9474' THEN
    RAISE EXCEPTION 'Verification failed: entitlement_definitions/max_supported_networks differs from the approved Development record.';
  END IF;
  IF (SELECT md5(to_jsonb(t)::text) FROM public."entitlement_definitions" t WHERE t."key" = 'max_webhooks') IS DISTINCT FROM '1359d86c78950c0b5a86be9e8a6f1b42' THEN
    RAISE EXCEPTION 'Verification failed: entitlement_definitions/max_webhooks differs from the approved Development record.';
  END IF;
  IF (SELECT md5(to_jsonb(t)::text) FROM public."entitlement_definitions" t WHERE t."key" = 'merchant_api') IS DISTINCT FROM 'e8e940d080602ceb2ef772f02e9a78a5' THEN
    RAISE EXCEPTION 'Verification failed: entitlement_definitions/merchant_api differs from the approved Development record.';
  END IF;
  IF (SELECT md5(to_jsonb(t)::text) FROM public."entitlement_definitions" t WHERE t."key" = 'rpc_nodes') IS DISTINCT FROM 'f5f33716b0f6728bd80b5e2cf652eacd' THEN
    RAISE EXCEPTION 'Verification failed: entitlement_definitions/rpc_nodes differs from the approved Development record.';
  END IF;
  IF (SELECT md5(to_jsonb(t)::text) FROM public."entitlement_definitions" t WHERE t."key" = 'sell') IS DISTINCT FROM '5608386d366e2d515bed41b02b3bbe49' THEN
    RAISE EXCEPTION 'Verification failed: entitlement_definitions/sell differs from the approved Development record.';
  END IF;
  IF (SELECT md5(to_jsonb(t)::text) FROM public."entitlement_definitions" t WHERE t."key" = 'staking') IS DISTINCT FROM '6428cba0f434fd7831c80fddda3498df' THEN
    RAISE EXCEPTION 'Verification failed: entitlement_definitions/staking differs from the approved Development record.';
  END IF;
  IF (SELECT md5(to_jsonb(t)::text) FROM public."entitlement_definitions" t WHERE t."key" = 'swap') IS DISTINCT FROM '91b4970f40d8bcff52be9a44ed34644b' THEN
    RAISE EXCEPTION 'Verification failed: entitlement_definitions/swap differs from the approved Development record.';
  END IF;
  IF (SELECT md5(to_jsonb(t)::text) FROM public."entitlement_definitions" t WHERE t."key" = 'telegram_bot') IS DISTINCT FROM 'cf76289c8ee394989db36911bc4eb16a' THEN
    RAISE EXCEPTION 'Verification failed: entitlement_definitions/telegram_bot differs from the approved Development record.';
  END IF;
  IF (SELECT md5(to_jsonb(t)::text) FROM public."entitlement_definitions" t WHERE t."key" = 'telegram_mini_app') IS DISTINCT FROM 'd0250cadb275813c7c46c0eec870d9d4' THEN
    RAISE EXCEPTION 'Verification failed: entitlement_definitions/telegram_mini_app differs from the approved Development record.';
  END IF;
  IF (SELECT md5(to_jsonb(t)::text) FROM public."entitlement_definitions" t WHERE t."key" = 'webhooks') IS DISTINCT FROM '5c159c0dd3841cda2d3fd45dcf6d19c4' THEN
    RAISE EXCEPTION 'Verification failed: entitlement_definitions/webhooks differs from the approved Development record.';
  END IF;
  IF (SELECT md5(to_jsonb(t)::text) FROM public."entitlement_definitions" t WHERE t."key" = 'website') IS DISTINCT FROM '4fe6f356fe0b84d8ba9bbb45e6a9877a' THEN
    RAISE EXCEPTION 'Verification failed: entitlement_definitions/website differs from the approved Development record.';
  END IF;
  IF (SELECT md5(to_jsonb(t)::text) FROM public."entitlement_definitions" t WHERE t."key" = 'whatsapp_bot') IS DISTINCT FROM '8bd72ac974c2ff3a77c053c676675920' THEN
    RAISE EXCEPTION 'Verification failed: entitlement_definitions/whatsapp_bot differs from the approved Development record.';
  END IF;
  IF (SELECT md5(to_jsonb(t)::text) FROM public."asset_catalog" t WHERE t."id" = 'bnb') IS DISTINCT FROM '4523b0b59ef2ac4adb7183cc94c42cbb' THEN
    RAISE EXCEPTION 'Verification failed: asset_catalog/bnb differs from the approved Development record.';
  END IF;
  IF (SELECT md5(to_jsonb(t)::text) FROM public."asset_catalog" t WHERE t."id" = 'btc') IS DISTINCT FROM '02c4097f00bab35c04c89bda3b36f550' THEN
    RAISE EXCEPTION 'Verification failed: asset_catalog/btc differs from the approved Development record.';
  END IF;
  IF (SELECT md5(to_jsonb(t)::text) FROM public."asset_catalog" t WHERE t."id" = 'eth') IS DISTINCT FROM '68b0c095e7b8098bb0a408cd44277f14' THEN
    RAISE EXCEPTION 'Verification failed: asset_catalog/eth differs from the approved Development record.';
  END IF;
  IF (SELECT md5(to_jsonb(t)::text) FROM public."asset_catalog" t WHERE t."id" = 'sol') IS DISTINCT FROM '3bdee1e6c2454cf27b40827eb6e5137c' THEN
    RAISE EXCEPTION 'Verification failed: asset_catalog/sol differs from the approved Development record.';
  END IF;
  IF (SELECT md5(to_jsonb(t)::text) FROM public."asset_catalog" t WHERE t."id" = 'usdt') IS DISTINCT FROM '6e0accc6498593a9a98d5b76656cf862' THEN
    RAISE EXCEPTION 'Verification failed: asset_catalog/usdt differs from the approved Development record.';
  END IF;
  IF (SELECT md5(to_jsonb(t)::text) FROM public."network_catalog" t WHERE t."id" = 'bitcoin-testnet') IS DISTINCT FROM '2fd5a9227fa9a8892d2f333596f7c1da' THEN
    RAISE EXCEPTION 'Verification failed: network_catalog/bitcoin-testnet differs from the approved Development record.';
  END IF;
  IF (SELECT md5(to_jsonb(t)::text) FROM public."network_catalog" t WHERE t."id" = 'bsc-testnet') IS DISTINCT FROM '348dc8d789a17ae078aa95bf05c97861' THEN
    RAISE EXCEPTION 'Verification failed: network_catalog/bsc-testnet differs from the approved Development record.';
  END IF;
  IF (SELECT md5(to_jsonb(t)::text) FROM public."network_catalog" t WHERE t."id" = 'ethereum-sepolia') IS DISTINCT FROM '57fbd2b798f9d8612bd4129f08ad5e8b' THEN
    RAISE EXCEPTION 'Verification failed: network_catalog/ethereum-sepolia differs from the approved Development record.';
  END IF;
  IF (SELECT md5(to_jsonb(t)::text) FROM public."network_catalog" t WHERE t."id" = 'solana-devnet') IS DISTINCT FROM '3aa2f682afdcc80e96ed04bfc9e692ec' THEN
    RAISE EXCEPTION 'Verification failed: network_catalog/solana-devnet differs from the approved Development record.';
  END IF;
  IF (SELECT md5(to_jsonb(t)::text) FROM public."network_catalog" t WHERE t."id" = 'tron-nile') IS DISTINCT FROM 'cc16e05f972d29a17e1a2c6f7a10e574' THEN
    RAISE EXCEPTION 'Verification failed: network_catalog/tron-nile differs from the approved Development record.';
  END IF;
  IF (SELECT md5(to_jsonb(t)::text) FROM public."landing_products" t WHERE t."key" = 'android_app') IS DISTINCT FROM '9422896df30190f550cd29c2acd4b995' THEN
    RAISE EXCEPTION 'Verification failed: landing_products/android_app differs from the approved Development record.';
  END IF;
  IF (SELECT md5(to_jsonb(t)::text) FROM public."landing_products" t WHERE t."key" = 'articles') IS DISTINCT FROM '94f34c3fb1004ece033f173e8eaa58ae' THEN
    RAISE EXCEPTION 'Verification failed: landing_products/articles differs from the approved Development record.';
  END IF;
  IF (SELECT md5(to_jsonb(t)::text) FROM public."landing_products" t WHERE t."key" = 'cloud_mining') IS DISTINCT FROM '79fe7a4e6e4c21906c353dd948c65eb9' THEN
    RAISE EXCEPTION 'Verification failed: landing_products/cloud_mining differs from the approved Development record.';
  END IF;
  IF (SELECT md5(to_jsonb(t)::text) FROM public."landing_products" t WHERE t."key" = 'crypto_card') IS DISTINCT FROM 'aafe3e9050c636df8405916453a32c3f' THEN
    RAISE EXCEPTION 'Verification failed: landing_products/crypto_card differs from the approved Development record.';
  END IF;
  IF (SELECT md5(to_jsonb(t)::text) FROM public."landing_products" t WHERE t."key" = 'crypto_engine') IS DISTINCT FROM 'e23efef4bc2379717eac3cb5185e5239' THEN
    RAISE EXCEPTION 'Verification failed: landing_products/crypto_engine differs from the approved Development record.';
  END IF;
  IF (SELECT md5(to_jsonb(t)::text) FROM public."landing_products" t WHERE t."key" = 'crypto_exchange') IS DISTINCT FROM 'd9f13a5859cb1f55da95d2d17af8be6f' THEN
    RAISE EXCEPTION 'Verification failed: landing_products/crypto_exchange differs from the approved Development record.';
  END IF;
  IF (SELECT md5(to_jsonb(t)::text) FROM public."landing_products" t WHERE t."key" = 'crypto_payments') IS DISTINCT FROM '82bafd046bef9bc3e927578a9a0d0f56' THEN
    RAISE EXCEPTION 'Verification failed: landing_products/crypto_payments differs from the approved Development record.';
  END IF;
  IF (SELECT md5(to_jsonb(t)::text) FROM public."landing_products" t WHERE t."key" = 'dex') IS DISTINCT FROM '4fca1f2d200ea8d998a19ffdbdd7934e' THEN
    RAISE EXCEPTION 'Verification failed: landing_products/dex differs from the approved Development record.';
  END IF;
  IF (SELECT md5(to_jsonb(t)::text) FROM public."landing_products" t WHERE t."key" = 'earn') IS DISTINCT FROM 'a08aa34a240514b1d562f5ac4a3f98ba' THEN
    RAISE EXCEPTION 'Verification failed: landing_products/earn differs from the approved Development record.';
  END IF;
  IF (SELECT md5(to_jsonb(t)::text) FROM public."landing_products" t WHERE t."key" = 'ios_app') IS DISTINCT FROM '961f2f88c1f19d3cb72fad1262111104' THEN
    RAISE EXCEPTION 'Verification failed: landing_products/ios_app differs from the approved Development record.';
  END IF;
  IF (SELECT md5(to_jsonb(t)::text) FROM public."landing_products" t WHERE t."key" = 'kolo') IS DISTINCT FROM 'df5c407bd08ee61922db478c25421959' THEN
    RAISE EXCEPTION 'Verification failed: landing_products/kolo differs from the approved Development record.';
  END IF;
  IF (SELECT md5(to_jsonb(t)::text) FROM public."landing_products" t WHERE t."key" = 'rpc_nodes') IS DISTINCT FROM '19bfaf0223be56bde81c118bbb3c8722' THEN
    RAISE EXCEPTION 'Verification failed: landing_products/rpc_nodes differs from the approved Development record.';
  END IF;
  IF (SELECT md5(to_jsonb(t)::text) FROM public."landing_products" t WHERE t."key" = 'staking') IS DISTINCT FROM '7d21e56cc790e5a56483c937e5841f8d' THEN
    RAISE EXCEPTION 'Verification failed: landing_products/staking differs from the approved Development record.';
  END IF;
  IF (SELECT md5(to_jsonb(t)::text) FROM public."landing_products" t WHERE t."key" = 'telegram_bot') IS DISTINCT FROM '5548478b74f293d878dcd0a3147d5895' THEN
    RAISE EXCEPTION 'Verification failed: landing_products/telegram_bot differs from the approved Development record.';
  END IF;
  IF (SELECT md5(to_jsonb(t)::text) FROM public."landing_products" t WHERE t."key" = 'telegram_mini_app') IS DISTINCT FROM '6565c4fa1e654825f46e0fee31df9dc8' THEN
    RAISE EXCEPTION 'Verification failed: landing_products/telegram_mini_app differs from the approved Development record.';
  END IF;
  IF (SELECT md5(to_jsonb(t)::text) FROM public."landing_products" t WHERE t."key" = 'whatsapp_bot') IS DISTINCT FROM '9902d15763da385bce3f8730980f8fd8' THEN
    RAISE EXCEPTION 'Verification failed: landing_products/whatsapp_bot differs from the approved Development record.';
  END IF;
  IF (SELECT md5(to_jsonb(t)::text) FROM public."asset_network_catalog" t WHERE t."id" = 'bnb:bsc-testnet') IS DISTINCT FROM '98bd263ca0823ab7a41b82c563b58ef1' THEN
    RAISE EXCEPTION 'Verification failed: asset_network_catalog/bnb:bsc-testnet differs from the approved Development record.';
  END IF;
  IF (SELECT md5(to_jsonb(t)::text) FROM public."asset_network_catalog" t WHERE t."id" = 'btc:bitcoin-testnet') IS DISTINCT FROM '690bfb3bea5b63754230018d74687bd2' THEN
    RAISE EXCEPTION 'Verification failed: asset_network_catalog/btc:bitcoin-testnet differs from the approved Development record.';
  END IF;
  IF (SELECT md5(to_jsonb(t)::text) FROM public."asset_network_catalog" t WHERE t."id" = 'eth:ethereum-sepolia') IS DISTINCT FROM 'c7e6e3064d85a5c9b8c1c22879ca23b8' THEN
    RAISE EXCEPTION 'Verification failed: asset_network_catalog/eth:ethereum-sepolia differs from the approved Development record.';
  END IF;
  IF (SELECT md5(to_jsonb(t)::text) FROM public."asset_network_catalog" t WHERE t."id" = 'sol:solana-devnet') IS DISTINCT FROM '8d0f9b6a129e46016bf23f2601e3669f' THEN
    RAISE EXCEPTION 'Verification failed: asset_network_catalog/sol:solana-devnet differs from the approved Development record.';
  END IF;
  IF (SELECT md5(to_jsonb(t)::text) FROM public."asset_network_catalog" t WHERE t."id" = 'usdt:bsc-testnet') IS DISTINCT FROM 'fdb6761d545e87772884c98d83b7a99a' THEN
    RAISE EXCEPTION 'Verification failed: asset_network_catalog/usdt:bsc-testnet differs from the approved Development record.';
  END IF;
  IF (SELECT md5(to_jsonb(t)::text) FROM public."asset_network_catalog" t WHERE t."id" = 'usdt:ethereum-sepolia') IS DISTINCT FROM '77e984782a3883495b90bc3676fdc439' THEN
    RAISE EXCEPTION 'Verification failed: asset_network_catalog/usdt:ethereum-sepolia differs from the approved Development record.';
  END IF;
  IF (SELECT md5(to_jsonb(t)::text) FROM public."asset_network_catalog" t WHERE t."id" = 'usdt:tron-nile') IS DISTINCT FROM '421d613af0830c27124d68afa58dc6e5' THEN
    RAISE EXCEPTION 'Verification failed: asset_network_catalog/usdt:tron-nile differs from the approved Development record.';
  END IF;
  IF (SELECT md5(to_jsonb(t)::text) FROM public."platform_admins" t WHERE t."clerk_user_id" = 'user_3KF0i38mD09exoEm6cdBCLFQQRL') IS DISTINCT FROM '9e4462c17f70ba43b2eb7ef049694d1d' THEN
    RAISE EXCEPTION 'Verification failed: platform_admins/user_3KF0i38mD09exoEm6cdBCLFQQRL differs from the approved Development record.';
  END IF;
END;
$qxlayer_approved_84$;

-- Verification output is returned before committing; all assertions above must pass.
SELECT 'module_catalog' AS table_name, 18::bigint AS expected_rows, count(*) AS actual_rows, count(*) = 18 AS matches_expected FROM public."module_catalog"
UNION ALL
SELECT 'entitlement_definitions' AS table_name, 32::bigint AS expected_rows, count(*) AS actual_rows, count(*) = 32 AS matches_expected FROM public."entitlement_definitions"
UNION ALL
SELECT 'asset_catalog' AS table_name, 5::bigint AS expected_rows, count(*) AS actual_rows, count(*) = 5 AS matches_expected FROM public."asset_catalog"
UNION ALL
SELECT 'network_catalog' AS table_name, 5::bigint AS expected_rows, count(*) AS actual_rows, count(*) = 5 AS matches_expected FROM public."network_catalog"
UNION ALL
SELECT 'landing_products' AS table_name, 16::bigint AS expected_rows, count(*) AS actual_rows, count(*) = 16 AS matches_expected FROM public."landing_products"
UNION ALL
SELECT 'asset_network_catalog' AS table_name, 7::bigint AS expected_rows, count(*) AS actual_rows, count(*) = 7 AS matches_expected FROM public."asset_network_catalog"
UNION ALL
SELECT 'platform_admins' AS table_name, 1::bigint AS expected_rows, count(*) AS actual_rows, count(*) = 1 AS matches_expected FROM public."platform_admins";

SELECT (SELECT count(*) FROM public."module_catalog") + (SELECT count(*) FROM public."entitlement_definitions") + (SELECT count(*) FROM public."asset_catalog") + (SELECT count(*) FROM public."network_catalog") + (SELECT count(*) FROM public."landing_products") + (SELECT count(*) FROM public."asset_network_catalog") + (SELECT count(*) FROM public."platform_admins") AS actual_total_rows, 84 AS expected_total_rows;

SELECT clerk_user_id, active, created_at
FROM public."platform_admins"
WHERE clerk_user_id = 'user_3KF0i38mD09exoEm6cdBCLFQQRL';

COMMIT;
