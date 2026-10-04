BEGIN;
ALTER TABLE module_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE module_catalog FORCE ROW LEVEL SECURITY;
GRANT SELECT,INSERT ON module_catalog TO private_label_runtime;
ALTER TABLE tenant_product_configuration ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_product_configuration FORCE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON tenant_product_configuration TO private_label_runtime;
DROP POLICY IF EXISTS tenant_product_configuration_read ON tenant_product_configuration;
CREATE POLICY tenant_product_configuration_read ON tenant_product_configuration FOR SELECT TO private_label_runtime USING (current_setting('app.is_super_admin',true)='true' OR tenant_id::text=nullif(current_setting('app.tenant_id',true),''));
DROP POLICY IF EXISTS tenant_product_configuration_write ON tenant_product_configuration;
CREATE POLICY tenant_product_configuration_write ON tenant_product_configuration FOR ALL TO private_label_runtime USING ((current_setting('app.is_super_admin',true)='true' OR tenant_id::text=nullif(current_setting('app.tenant_id',true),'')) AND current_setting('app.can_write',true)='true') WITH CHECK ((current_setting('app.is_super_admin',true)='true' OR tenant_id::text=nullif(current_setting('app.tenant_id',true),'')) AND current_setting('app.can_write',true)='true');
DROP POLICY IF EXISTS module_catalog_read ON module_catalog;
CREATE POLICY module_catalog_read ON module_catalog FOR SELECT TO private_label_runtime USING (true);
DROP POLICY IF EXISTS module_catalog_register ON module_catalog;
CREATE POLICY module_catalog_register ON module_catalog FOR INSERT TO private_label_runtime WITH CHECK (current_setting('app.is_super_admin',true)='true' AND current_setting('app.can_write',true)='true');
DROP POLICY IF EXISTS tenant_domains_public_domain ON tenant_domains;
CREATE POLICY tenant_domains_public_domain ON tenant_domains FOR SELECT TO private_label_runtime USING (status='verified' AND domain=nullif(current_setting('app.public_domain',true),''));
DROP POLICY IF EXISTS tenants_public_domain ON tenants;
CREATE POLICY tenants_public_domain ON tenants FOR SELECT TO private_label_runtime USING (status='active' AND id IN (SELECT tenant_id FROM tenant_domains WHERE status='verified' AND domain=nullif(current_setting('app.public_domain',true),'')));
ALTER POLICY memberships_operator_write ON tenant_memberships
  USING (current_setting('app.is_super_admin',true)='true' OR (tenant_id::text=nullif(current_setting('app.tenant_id',true),'') AND role='staff' AND current_setting('app.can_write',true)='true' AND current_setting('app.can_manage_staff',true)='true'))
  WITH CHECK (current_setting('app.is_super_admin',true)='true' OR (tenant_id::text=nullif(current_setting('app.tenant_id',true),'') AND role='staff' AND current_setting('app.can_write',true)='true' AND current_setting('app.can_manage_staff',true)='true'));
COMMIT;