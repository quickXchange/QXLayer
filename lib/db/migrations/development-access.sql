-- DEVELOPMENT setup only. Never run this at API startup or as a production deploy hook.
GRANT USAGE ON SCHEMA public TO private_label_runtime;
GRANT SELECT ON module_catalog, asset_catalog, network_catalog, asset_network_catalog, platform_admins TO private_label_runtime;
GRANT SELECT, INSERT, UPDATE ON tenants TO private_label_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON
  tenant_memberships, tenant_branding, tenant_domains, tenant_modules, tenant_asset_networks,
  tenant_configuration, pricing_rules, exchange_orders, payment_invoices, wallet_configurations,
  blockchain_provider_configs, api_keys, webhook_endpoints, notification_events
TO private_label_runtime;
GRANT SELECT, INSERT ON audit_events TO private_label_runtime;

-- drizzle-kit push currently creates policy metadata but omits USING/WITH CHECK
-- expressions in this environment. Apply and verify the real PostgreSQL predicates.
ALTER POLICY platform_admins_self_read ON platform_admins
  USING (clerk_user_id = current_setting('app.actor_id', true));
ALTER POLICY memberships_read ON tenant_memberships
  USING (current_setting('app.is_super_admin', true) = 'true' OR clerk_user_id = current_setting('app.actor_id', true));
ALTER POLICY memberships_operator_write ON tenant_memberships
  USING (current_setting('app.is_super_admin', true) = 'true')
  WITH CHECK (current_setting('app.is_super_admin', true) = 'true');
ALTER POLICY tenants_read ON tenants
  USING (current_setting('app.is_super_admin', true) = 'true' OR id::text = nullif(current_setting('app.tenant_id', true), ''));
ALTER POLICY tenants_create ON tenants
  WITH CHECK (current_setting('app.is_super_admin', true) = 'true');
ALTER POLICY tenants_update ON tenants
  USING ((current_setting('app.is_super_admin', true) = 'true' OR id::text = nullif(current_setting('app.tenant_id', true), '')) AND current_setting('app.can_write', true) = 'true')
  WITH CHECK ((current_setting('app.is_super_admin', true) = 'true' OR id::text = nullif(current_setting('app.tenant_id', true), '')) AND current_setting('app.can_write', true) = 'true');
ALTER POLICY tenant_modules_read ON tenant_modules
  USING (current_setting('app.is_super_admin', true) = 'true' OR tenant_id::text = nullif(current_setting('app.tenant_id', true), ''));
ALTER POLICY tenant_modules_operator_write ON tenant_modules
  USING (current_setting('app.is_super_admin', true) = 'true')
  WITH CHECK (current_setting('app.is_super_admin', true) = 'true');
ALTER POLICY audit_read ON audit_events
  USING (current_setting('app.is_super_admin', true) = 'true' OR tenant_id::text = nullif(current_setting('app.tenant_id', true), ''));
ALTER POLICY audit_append ON audit_events
  WITH CHECK ((current_setting('app.is_super_admin', true) = 'true' OR tenant_id::text = nullif(current_setting('app.tenant_id', true), '')) AND actor_id = current_setting('app.actor_id', true));

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'tenant_branding','tenant_domains','tenant_asset_networks','tenant_configuration',
    'pricing_rules','exchange_orders','payment_invoices','wallet_configurations',
    'blockchain_provider_configs','api_keys','webhook_endpoints','notification_events'
  ] LOOP
    EXECUTE format(
      'ALTER POLICY %I ON %I USING (current_setting(''app.is_super_admin'', true) = ''true'' OR tenant_id::text = nullif(current_setting(''app.tenant_id'', true), ''''))',
      table_name || '_read', table_name);
    EXECUTE format(
      'ALTER POLICY %I ON %I USING ((current_setting(''app.is_super_admin'', true) = ''true'' OR tenant_id::text = nullif(current_setting(''app.tenant_id'', true), '''')) AND current_setting(''app.can_write'', true) = ''true'') WITH CHECK ((current_setting(''app.is_super_admin'', true) = ''true'' OR tenant_id::text = nullif(current_setting(''app.tenant_id'', true), '''')) AND current_setting(''app.can_write'', true) = ''true'')',
      table_name || '_write', table_name);
  END LOOP;
END $$;

ALTER TABLE tenants FORCE ROW LEVEL SECURITY;
ALTER TABLE platform_admins FORCE ROW LEVEL SECURITY;
ALTER TABLE tenant_memberships FORCE ROW LEVEL SECURITY;
ALTER TABLE tenant_branding FORCE ROW LEVEL SECURITY;
ALTER TABLE tenant_domains FORCE ROW LEVEL SECURITY;
ALTER TABLE tenant_modules FORCE ROW LEVEL SECURITY;
ALTER TABLE tenant_asset_networks FORCE ROW LEVEL SECURITY;
ALTER TABLE tenant_configuration FORCE ROW LEVEL SECURITY;
ALTER TABLE pricing_rules FORCE ROW LEVEL SECURITY;
ALTER TABLE exchange_orders FORCE ROW LEVEL SECURITY;
ALTER TABLE payment_invoices FORCE ROW LEVEL SECURITY;
ALTER TABLE wallet_configurations FORCE ROW LEVEL SECURITY;
ALTER TABLE blockchain_provider_configs FORCE ROW LEVEL SECURITY;
ALTER TABLE api_keys FORCE ROW LEVEL SECURITY;
ALTER TABLE webhook_endpoints FORCE ROW LEVEL SECURITY;
ALTER TABLE notification_events FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_events FORCE ROW LEVEL SECURITY;