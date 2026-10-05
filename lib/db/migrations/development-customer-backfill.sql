-- Historical, explicitly operator-run development backfill. Not a startup hook.
-- Import actual legacy information, without inventing an earlier status history.
INSERT INTO white_label_events(request_id,kind,author_user_id,visibility,message,status,created_at)
SELECT id,'status','System migration','customer','Existing request imported; recorded status: '||status,status,updated_at
FROM white_label_requests r WHERE NOT EXISTS (SELECT 1 FROM white_label_events e WHERE e.request_id=r.id);
INSERT INTO white_label_events(request_id,kind,author_user_id,visibility,message,created_at)
SELECT id,'note','System migration','customer',operator_note,updated_at FROM white_label_requests r
WHERE operator_note<>'' AND NOT EXISTS (SELECT 1 FROM white_label_events e WHERE e.request_id=r.id AND e.kind='note' AND e.message=r.operator_note);
-- Preserve already delivered, functional Exchange sandboxes.
UPDATE tenants t SET completed_steps=array_append(completed_steps,'exchange_provisioned')
WHERE t.status IN ('active','suspended') AND NOT 'exchange_provisioned'=ANY(completed_steps)
  AND ARRAY['brand','domain','modules','assets_networks','configuration']::text[] <@ completed_steps
  AND EXISTS (SELECT 1 FROM tenant_product_configuration p WHERE p.tenant_id=t.id AND p.module_key='crypto_exchange'
    AND jsonb_array_length(coalesce(p.configuration->'routes','[]'::jsonb))>0);
