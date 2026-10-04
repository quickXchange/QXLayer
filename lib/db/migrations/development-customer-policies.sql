-- Explicit DEVELOPMENT setup after the schema push; never a startup hook.
ALTER TABLE white_label_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE white_label_requests FORCE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE ON white_label_requests TO private_label_runtime;
DROP POLICY IF EXISTS white_label_request_read ON white_label_requests;
CREATE POLICY white_label_request_read ON white_label_requests FOR SELECT TO private_label_runtime
  USING (current_setting('app.is_super_admin',true)='true' OR customer_user_id=current_setting('app.actor_id',true));
DROP POLICY IF EXISTS white_label_request_submit ON white_label_requests;
CREATE POLICY white_label_request_submit ON white_label_requests FOR INSERT TO private_label_runtime
  WITH CHECK (customer_user_id=current_setting('app.actor_id',true) AND current_setting('app.can_write',true)='true'
    AND status='submitted' AND tenant_id IS NULL AND monthly_price IS NULL AND setup_price IS NULL AND currency IS NULL AND operator_note='');
DROP POLICY IF EXISTS white_label_request_operator ON white_label_requests;
CREATE POLICY white_label_request_operator ON white_label_requests FOR UPDATE TO private_label_runtime
  USING (current_setting('app.is_super_admin',true)='true' AND current_setting('app.can_write',true)='true')
  WITH CHECK (current_setting('app.is_super_admin',true)='true' AND current_setting('app.can_write',true)='true');
-- Preserve the already delivered, functional Exchange sandbox. Draft tenants
-- and unchanged visual-only product previews never acquire this marker.
UPDATE tenants t SET completed_steps=array_append(completed_steps,'exchange_provisioned')
WHERE t.status IN ('active','suspended') AND NOT 'exchange_provisioned'=ANY(completed_steps)
  AND ARRAY['brand','domain','modules','assets_networks','configuration']::text[] <@ completed_steps
  AND EXISTS (SELECT 1 FROM tenant_product_configuration p WHERE p.tenant_id=t.id AND p.module_key='crypto_exchange'
    AND jsonb_array_length(coalesce(p.configuration->'routes','[]'::jsonb))>0);