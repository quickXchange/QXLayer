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
    AND status='new' AND tenant_id IS NULL AND monthly_price IS NULL AND setup_price IS NULL AND currency IS NULL AND operator_note=''
    AND customization_price IS NULL AND approved_configuration IS NULL AND custom_design_decision='pending');
DROP POLICY IF EXISTS white_label_request_operator ON white_label_requests;
CREATE POLICY white_label_request_operator ON white_label_requests FOR UPDATE TO private_label_runtime
  USING (current_setting('app.is_super_admin',true)='true' AND current_setting('app.can_write',true)='true')
  WITH CHECK (current_setting('app.is_super_admin',true)='true' AND current_setting('app.can_write',true)='true');
GRANT USAGE,SELECT ON SEQUENCE white_label_requests_order_number_seq TO private_label_runtime;
ALTER TABLE white_label_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE white_label_events FORCE ROW LEVEL SECURITY;
GRANT SELECT,INSERT ON white_label_events TO private_label_runtime;
DROP POLICY IF EXISTS white_label_events_read ON white_label_events;
CREATE POLICY white_label_events_read ON white_label_events FOR SELECT TO private_label_runtime
 USING (current_setting('app.is_super_admin',true)='true' OR (visibility='customer' AND EXISTS
   (SELECT 1 FROM white_label_requests r WHERE r.id=request_id AND r.customer_user_id=current_setting('app.actor_id',true))));
DROP POLICY IF EXISTS white_label_events_insert ON white_label_events;
CREATE POLICY white_label_events_insert ON white_label_events FOR INSERT TO private_label_runtime
 WITH CHECK (current_setting('app.can_write',true)='true' AND (current_setting('app.is_super_admin',true)='true' OR
   (visibility='customer' AND kind='status' AND status='new' AND author_user_id=current_setting('app.actor_id',true) AND EXISTS
   (SELECT 1 FROM white_label_requests r WHERE r.id=request_id AND r.customer_user_id=current_setting('app.actor_id',true)))));
ALTER TABLE white_label_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE white_label_attachments FORCE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE ON white_label_attachments TO private_label_runtime;
DROP POLICY IF EXISTS white_label_attachments_read ON white_label_attachments;
CREATE POLICY white_label_attachments_read ON white_label_attachments FOR SELECT TO private_label_runtime
 USING (owner_user_id=current_setting('app.actor_id',true) OR (current_setting('app.is_super_admin',true)='true' AND request_id IS NOT NULL));
DROP POLICY IF EXISTS white_label_attachments_create ON white_label_attachments;
CREATE POLICY white_label_attachments_create ON white_label_attachments FOR INSERT TO private_label_runtime
 WITH CHECK (owner_user_id=current_setting('app.actor_id',true) AND request_id IS NULL AND current_setting('app.can_write',true)='true');
DROP POLICY IF EXISTS white_label_attachments_bind ON white_label_attachments;
CREATE POLICY white_label_attachments_bind ON white_label_attachments FOR UPDATE TO private_label_runtime
 USING (owner_user_id=current_setting('app.actor_id',true) AND request_id IS NULL AND current_setting('app.can_write',true)='true')
 WITH CHECK (owner_user_id=current_setting('app.actor_id',true) AND EXISTS
   (SELECT 1 FROM white_label_requests r WHERE r.id=request_id AND r.customer_user_id=current_setting('app.actor_id',true)));
-- Import actual legacy information, without inventing an earlier status history.
INSERT INTO white_label_events(request_id,kind,author_user_id,visibility,message,status,created_at)
SELECT id,'status','System migration','customer','Existing request imported; recorded status: '||status,status,updated_at
FROM white_label_requests r WHERE NOT EXISTS (SELECT 1 FROM white_label_events e WHERE e.request_id=r.id);
INSERT INTO white_label_events(request_id,kind,author_user_id,visibility,message,created_at)
SELECT id,'note','System migration','customer',operator_note,updated_at FROM white_label_requests r
WHERE operator_note<>'' AND NOT EXISTS (SELECT 1 FROM white_label_events e WHERE e.request_id=r.id AND e.kind='note' AND e.message=r.operator_note);
-- Preserve the already delivered, functional Exchange sandbox. Draft tenants
-- and unchanged visual-only product previews never acquire this marker.
UPDATE tenants t SET completed_steps=array_append(completed_steps,'exchange_provisioned')
WHERE t.status IN ('active','suspended') AND NOT 'exchange_provisioned'=ANY(completed_steps)
  AND ARRAY['brand','domain','modules','assets_networks','configuration']::text[] <@ completed_steps
  AND EXISTS (SELECT 1 FROM tenant_product_configuration p WHERE p.tenant_id=t.id AND p.module_key='crypto_exchange'
    AND jsonb_array_length(coalesce(p.configuration->'routes','[]'::jsonb))>0);