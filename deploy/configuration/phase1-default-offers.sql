-- Proposed EUR amounts, NOT approved commercial offers. Never overwrite edits.
INSERT INTO public.plans(id,name,description,currency,monthly_price,yearly_price,setup_fee,pricing_configured,status,billing_label,display_order)
VALUES
 ('a4000000-0000-4000-8000-000000000001','White Label Starter','Phase 1 proposed EUR pricing — requires explicit Owner approval before purchase. Suggested monthly 39, yearly 390, setup 149.','EUR',39,390,149,false,'disabled','Monthly or yearly',10),
 ('a4000000-0000-4000-8000-000000000002','White Label Business','Phase 1 proposed EUR pricing — requires explicit Owner approval before purchase. Suggested monthly 99, yearly 990, setup 399.','EUR',99,990,399,false,'disabled','Monthly or yearly',20),
 ('a4000000-0000-4000-8000-000000000003','White Label Professional','Phase 1 proposed EUR pricing — requires explicit Owner approval before purchase. Suggested monthly 249, yearly 2490, setup 999.','EUR',249,2490,999,false,'disabled','Monthly or yearly',30)
ON CONFLICT(id) DO NOTHING;
INSERT INTO public.plan_entitlements(plan_id,key,value)
 SELECT p.id,d.key,CASE WHEN d.kind='feature' THEN to_jsonb(d.key IN ('website','crypto_exchange','swap','convert','buy','sell'))
 ELSE to_jsonb(CASE WHEN d.key LIKE '%volume%' THEN '10000' WHEN d.key LIKE '%asset%' THEN '10' WHEN d.key LIKE '%network%' THEN '5'
 WHEN d.key LIKE '%payment%' THEN '3' WHEN d.key LIKE '%order%' OR d.key LIKE '%request%' THEN '100' ELSE '5' END) END
 FROM public.plans p CROSS JOIN public.entitlement_definitions d
 WHERE p.id IN ('a4000000-0000-4000-8000-000000000001','a4000000-0000-4000-8000-000000000002','a4000000-0000-4000-8000-000000000003')
 ON CONFLICT(plan_id,key) DO NOTHING;
INSERT INTO public.addons(id,name,description,currency,monthly_price,yearly_price,setup_fee,pricing_configured,pricing_confirmed,enabled)
 VALUES
 ('a4000000-0000-4000-8000-000000000101','Additional Exchange Capacity','Phase 1 proposed EUR add-on — requires Owner approval. Monthly 19, yearly 190, setup 0.','EUR',19,190,0,false,false,false),
 ('a4000000-0000-4000-8000-000000000102','Extended Exchange Capacity','Phase 1 proposed EUR add-on — requires Owner approval. Monthly 49, yearly 490, setup 0.','EUR',49,490,0,false,false,false)
 ON CONFLICT(id) DO NOTHING;
INSERT INTO public.addon_entitlements(addon_id,key,value)
 SELECT a.id,d.key,to_jsonb(CASE WHEN a.id::text LIKE '%101' THEN '5' ELSE '10' END)
 FROM public.addons a CROSS JOIN public.entitlement_definitions d
 WHERE a.id IN ('a4000000-0000-4000-8000-000000000101','a4000000-0000-4000-8000-000000000102')
 AND d.kind='limit' AND (d.key LIKE '%asset%' OR d.key LIKE '%network%' OR d.key LIKE '%payment%')
 ON CONFLICT(addon_id,key) DO NOTHING;
INSERT INTO qxlayer_commerce.methods(id,name,kind,currency,instructions,enabled,approved)
 VALUES('a4000000-0000-4000-8000-000000000201','EUR bank transfer','bank_transfer','EUR','',false,false)
 ON CONFLICT(id) DO NOTHING;
