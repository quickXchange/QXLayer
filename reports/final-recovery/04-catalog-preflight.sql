-- PREPARED ONLY. Separate Production-read approval required.
-- Exactly 15 platform-global marketing rows/module keys; no other application data.
BEGIN READ ONLY;
SELECT jsonb_build_object(
  'capturedAt',clock_timestamp(),
  'catalogRows',(SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY key),'[]'::jsonb)
    FROM (SELECT key,visible,name,description,icon,starting_price::text AS starting_price,setup_fee::text AS setup_fee,currency,billing_period,status,cta_label,display_order FROM public.landing_products WHERE key IN ('crypto_exchange','crypto_payments','crypto_engine','ios_app','android_app','crypto_card','staking','earn','dex','articles','telegram_bot','telegram_mini_app','whatsapp_bot','rpc_nodes','cloud_mining')) r),
  'moduleKeys',(SELECT coalesce(jsonb_agg(key ORDER BY key),'[]'::jsonb)
    FROM public.module_catalog WHERE key IN ('crypto_exchange','crypto_payments','crypto_engine','ios_app','android_app','crypto_card','staking','earn','dex','articles','telegram_bot','telegram_mini_app','whatsapp_bot','rpc_nodes','cloud_mining'))
) AS recovery_snapshot;
COMMIT;