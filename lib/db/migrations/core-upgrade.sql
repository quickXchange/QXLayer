-- Additive core upgrade. Existing clients/plans/audit/configuration are retained.
BEGIN;
ALTER TABLE module_catalog ADD COLUMN IF NOT EXISTS definition jsonb NOT NULL DEFAULT '{}';
ALTER TABLE tenant_memberships ADD COLUMN IF NOT EXISTS permissions text[] NOT NULL DEFAULT '{}';
ALTER TABLE tenant_domains ADD COLUMN IF NOT EXISTS verification_token text;
ALTER TABLE tenant_domains ADD COLUMN IF NOT EXISTS verified_at timestamptz;
ALTER TABLE tenant_domains DROP CONSTRAINT IF EXISTS domains_unverified_only;
ALTER TABLE tenant_domains DROP CONSTRAINT IF EXISTS domains_valid_status;
ALTER TABLE tenant_domains ADD CONSTRAINT domains_valid_status CHECK (status IN ('unverified','verified'));
CREATE TABLE IF NOT EXISTS tenant_product_configuration (
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  module_key text NOT NULL REFERENCES module_catalog(key),
  configuration jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id,module_key),
  CONSTRAINT product_configuration_object CHECK (jsonb_typeof(configuration)='object')
);
ALTER TABLE tenant_product_configuration ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_product_configuration FORCE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON tenant_product_configuration TO private_label_runtime;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='tenant_product_configuration' AND policyname='tenant_product_configuration_read') THEN
    CREATE POLICY tenant_product_configuration_read ON tenant_product_configuration FOR SELECT TO private_label_runtime USING (current_setting('app.is_super_admin',true)='true' OR tenant_id::text=nullif(current_setting('app.tenant_id',true),''));
    CREATE POLICY tenant_product_configuration_write ON tenant_product_configuration FOR ALL TO private_label_runtime USING ((current_setting('app.is_super_admin',true)='true' OR tenant_id::text=nullif(current_setting('app.tenant_id',true),'')) AND current_setting('app.can_write',true)='true') WITH CHECK ((current_setting('app.is_super_admin',true)='true' OR tenant_id::text=nullif(current_setting('app.tenant_id',true),'')) AND current_setting('app.can_write',true)='true');
  END IF;
END $$;
GRANT INSERT ON module_catalog TO private_label_runtime;
COMMIT;