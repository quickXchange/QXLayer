-- Separate restricted external login/transaction roles; no passwords and no login activation.
CREATE ROLE qxlayer_runtime NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION;
CREATE ROLE qxlayer_app NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION;
GRANT qxlayer_runtime TO qxlayer_app WITH INHERIT FALSE;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO qxlayer_runtime;
REVOKE ALL ON TABLE public."addon_entitlements" FROM PUBLIC;
DO $acl$ DECLARE r text; BEGIN
 FOR r IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role') LOOP
 EXECUTE format('REVOKE ALL ON TABLE public."addon_entitlements" FROM %I',r); END LOOP;
END $acl$;
ALTER TABLE public."addon_entitlements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."addon_entitlements" FORCE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public."addon_entitlements" TO qxlayer_runtime;
REVOKE ALL ON TABLE public."addons" FROM PUBLIC;
DO $acl$ DECLARE r text; BEGIN
 FOR r IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role') LOOP
 EXECUTE format('REVOKE ALL ON TABLE public."addons" FROM %I',r); END LOOP;
END $acl$;
ALTER TABLE public."addons" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."addons" FORCE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public."addons" TO qxlayer_runtime;
REVOKE ALL ON TABLE public."api_keys" FROM PUBLIC;
DO $acl$ DECLARE r text; BEGIN
 FOR r IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role') LOOP
 EXECUTE format('REVOKE ALL ON TABLE public."api_keys" FROM %I',r); END LOOP;
END $acl$;
ALTER TABLE public."api_keys" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."api_keys" FORCE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public."api_keys" TO qxlayer_runtime;
REVOKE ALL ON TABLE public."asset_catalog" FROM PUBLIC;
DO $acl$ DECLARE r text; BEGIN
 FOR r IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role') LOOP
 EXECUTE format('REVOKE ALL ON TABLE public."asset_catalog" FROM %I',r); END LOOP;
END $acl$;
ALTER TABLE public."asset_catalog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."asset_catalog" FORCE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public."asset_catalog" TO qxlayer_runtime;
REVOKE ALL ON TABLE public."asset_network_catalog" FROM PUBLIC;
DO $acl$ DECLARE r text; BEGIN
 FOR r IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role') LOOP
 EXECUTE format('REVOKE ALL ON TABLE public."asset_network_catalog" FROM %I',r); END LOOP;
END $acl$;
ALTER TABLE public."asset_network_catalog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."asset_network_catalog" FORCE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public."asset_network_catalog" TO qxlayer_runtime;
REVOKE ALL ON TABLE public."audit_events" FROM PUBLIC;
DO $acl$ DECLARE r text; BEGIN
 FOR r IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role') LOOP
 EXECUTE format('REVOKE ALL ON TABLE public."audit_events" FROM %I',r); END LOOP;
END $acl$;
ALTER TABLE public."audit_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."audit_events" FORCE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public."audit_events" TO qxlayer_runtime;
REVOKE ALL ON TABLE public."blockchain_provider_configs" FROM PUBLIC;
DO $acl$ DECLARE r text; BEGIN
 FOR r IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role') LOOP
 EXECUTE format('REVOKE ALL ON TABLE public."blockchain_provider_configs" FROM %I',r); END LOOP;
END $acl$;
ALTER TABLE public."blockchain_provider_configs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."blockchain_provider_configs" FORCE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public."blockchain_provider_configs" TO qxlayer_runtime;
REVOKE ALL ON TABLE public."customer_notification_reads" FROM PUBLIC;
DO $acl$ DECLARE r text; BEGIN
 FOR r IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role') LOOP
 EXECUTE format('REVOKE ALL ON TABLE public."customer_notification_reads" FROM %I',r); END LOOP;
END $acl$;
ALTER TABLE public."customer_notification_reads" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."customer_notification_reads" FORCE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public."customer_notification_reads" TO qxlayer_runtime;
REVOKE ALL ON TABLE public."entitlement_definitions" FROM PUBLIC;
DO $acl$ DECLARE r text; BEGIN
 FOR r IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role') LOOP
 EXECUTE format('REVOKE ALL ON TABLE public."entitlement_definitions" FROM %I',r); END LOOP;
END $acl$;
ALTER TABLE public."entitlement_definitions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."entitlement_definitions" FORCE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public."entitlement_definitions" TO qxlayer_runtime;
REVOKE ALL ON TABLE public."exchange_orders" FROM PUBLIC;
DO $acl$ DECLARE r text; BEGIN
 FOR r IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role') LOOP
 EXECUTE format('REVOKE ALL ON TABLE public."exchange_orders" FROM %I',r); END LOOP;
END $acl$;
ALTER TABLE public."exchange_orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."exchange_orders" FORCE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public."exchange_orders" TO qxlayer_runtime;
REVOKE ALL ON TABLE public."landing_products" FROM PUBLIC;
DO $acl$ DECLARE r text; BEGIN
 FOR r IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role') LOOP
 EXECUTE format('REVOKE ALL ON TABLE public."landing_products" FROM %I',r); END LOOP;
END $acl$;
ALTER TABLE public."landing_products" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."landing_products" FORCE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public."landing_products" TO qxlayer_runtime;
REVOKE ALL ON TABLE public."module_catalog" FROM PUBLIC;
DO $acl$ DECLARE r text; BEGIN
 FOR r IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role') LOOP
 EXECUTE format('REVOKE ALL ON TABLE public."module_catalog" FROM %I',r); END LOOP;
END $acl$;
ALTER TABLE public."module_catalog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."module_catalog" FORCE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public."module_catalog" TO qxlayer_runtime;
REVOKE ALL ON TABLE public."network_catalog" FROM PUBLIC;
DO $acl$ DECLARE r text; BEGIN
 FOR r IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role') LOOP
 EXECUTE format('REVOKE ALL ON TABLE public."network_catalog" FROM %I',r); END LOOP;
END $acl$;
ALTER TABLE public."network_catalog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."network_catalog" FORCE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public."network_catalog" TO qxlayer_runtime;
REVOKE ALL ON TABLE public."notification_events" FROM PUBLIC;
DO $acl$ DECLARE r text; BEGIN
 FOR r IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role') LOOP
 EXECUTE format('REVOKE ALL ON TABLE public."notification_events" FROM %I',r); END LOOP;
END $acl$;
ALTER TABLE public."notification_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."notification_events" FORCE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public."notification_events" TO qxlayer_runtime;
REVOKE ALL ON TABLE public."payment_invoices" FROM PUBLIC;
DO $acl$ DECLARE r text; BEGIN
 FOR r IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role') LOOP
 EXECUTE format('REVOKE ALL ON TABLE public."payment_invoices" FROM %I',r); END LOOP;
END $acl$;
ALTER TABLE public."payment_invoices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."payment_invoices" FORCE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public."payment_invoices" TO qxlayer_runtime;
REVOKE ALL ON TABLE public."plan_entitlements" FROM PUBLIC;
DO $acl$ DECLARE r text; BEGIN
 FOR r IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role') LOOP
 EXECUTE format('REVOKE ALL ON TABLE public."plan_entitlements" FROM %I',r); END LOOP;
END $acl$;
ALTER TABLE public."plan_entitlements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."plan_entitlements" FORCE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public."plan_entitlements" TO qxlayer_runtime;
REVOKE ALL ON TABLE public."plans" FROM PUBLIC;
DO $acl$ DECLARE r text; BEGIN
 FOR r IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role') LOOP
 EXECUTE format('REVOKE ALL ON TABLE public."plans" FROM %I',r); END LOOP;
END $acl$;
ALTER TABLE public."plans" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."plans" FORCE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public."plans" TO qxlayer_runtime;
REVOKE ALL ON TABLE public."platform_admins" FROM PUBLIC;
DO $acl$ DECLARE r text; BEGIN
 FOR r IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role') LOOP
 EXECUTE format('REVOKE ALL ON TABLE public."platform_admins" FROM %I',r); END LOOP;
END $acl$;
ALTER TABLE public."platform_admins" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."platform_admins" FORCE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public."platform_admins" TO qxlayer_runtime;
REVOKE ALL ON TABLE public."pricing_rules" FROM PUBLIC;
DO $acl$ DECLARE r text; BEGIN
 FOR r IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role') LOOP
 EXECUTE format('REVOKE ALL ON TABLE public."pricing_rules" FROM %I',r); END LOOP;
END $acl$;
ALTER TABLE public."pricing_rules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."pricing_rules" FORCE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public."pricing_rules" TO qxlayer_runtime;
REVOKE ALL ON TABLE public."provider_assignments" FROM PUBLIC;
DO $acl$ DECLARE r text; BEGIN
 FOR r IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role') LOOP
 EXECUTE format('REVOKE ALL ON TABLE public."provider_assignments" FROM %I',r); END LOOP;
END $acl$;
ALTER TABLE public."provider_assignments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."provider_assignments" FORCE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public."provider_assignments" TO qxlayer_runtime;
REVOKE ALL ON TABLE public."provider_catalog" FROM PUBLIC;
DO $acl$ DECLARE r text; BEGIN
 FOR r IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role') LOOP
 EXECUTE format('REVOKE ALL ON TABLE public."provider_catalog" FROM %I',r); END LOOP;
END $acl$;
ALTER TABLE public."provider_catalog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."provider_catalog" FORCE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public."provider_catalog" TO qxlayer_runtime;
REVOKE ALL ON TABLE public."provider_policies" FROM PUBLIC;
DO $acl$ DECLARE r text; BEGIN
 FOR r IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role') LOOP
 EXECUTE format('REVOKE ALL ON TABLE public."provider_policies" FROM %I',r); END LOOP;
END $acl$;
ALTER TABLE public."provider_policies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."provider_policies" FORCE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public."provider_policies" TO qxlayer_runtime;
REVOKE ALL ON TABLE public."tenant_addons" FROM PUBLIC;
DO $acl$ DECLARE r text; BEGIN
 FOR r IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role') LOOP
 EXECUTE format('REVOKE ALL ON TABLE public."tenant_addons" FROM %I',r); END LOOP;
END $acl$;
ALTER TABLE public."tenant_addons" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."tenant_addons" FORCE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public."tenant_addons" TO qxlayer_runtime;
REVOKE ALL ON TABLE public."tenant_asset_networks" FROM PUBLIC;
DO $acl$ DECLARE r text; BEGIN
 FOR r IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role') LOOP
 EXECUTE format('REVOKE ALL ON TABLE public."tenant_asset_networks" FROM %I',r); END LOOP;
END $acl$;
ALTER TABLE public."tenant_asset_networks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."tenant_asset_networks" FORCE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public."tenant_asset_networks" TO qxlayer_runtime;
REVOKE ALL ON TABLE public."tenant_branding" FROM PUBLIC;
DO $acl$ DECLARE r text; BEGIN
 FOR r IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role') LOOP
 EXECUTE format('REVOKE ALL ON TABLE public."tenant_branding" FROM %I',r); END LOOP;
END $acl$;
ALTER TABLE public."tenant_branding" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."tenant_branding" FORCE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public."tenant_branding" TO qxlayer_runtime;
REVOKE ALL ON TABLE public."tenant_configuration" FROM PUBLIC;
DO $acl$ DECLARE r text; BEGIN
 FOR r IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role') LOOP
 EXECUTE format('REVOKE ALL ON TABLE public."tenant_configuration" FROM %I',r); END LOOP;
END $acl$;
ALTER TABLE public."tenant_configuration" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."tenant_configuration" FORCE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public."tenant_configuration" TO qxlayer_runtime;
REVOKE ALL ON TABLE public."tenant_domains" FROM PUBLIC;
DO $acl$ DECLARE r text; BEGIN
 FOR r IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role') LOOP
 EXECUTE format('REVOKE ALL ON TABLE public."tenant_domains" FROM %I',r); END LOOP;
END $acl$;
ALTER TABLE public."tenant_domains" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."tenant_domains" FORCE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public."tenant_domains" TO qxlayer_runtime;
REVOKE ALL ON TABLE public."tenant_entitlement_overrides" FROM PUBLIC;
DO $acl$ DECLARE r text; BEGIN
 FOR r IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role') LOOP
 EXECUTE format('REVOKE ALL ON TABLE public."tenant_entitlement_overrides" FROM %I',r); END LOOP;
END $acl$;
ALTER TABLE public."tenant_entitlement_overrides" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."tenant_entitlement_overrides" FORCE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public."tenant_entitlement_overrides" TO qxlayer_runtime;
REVOKE ALL ON TABLE public."tenant_integrations" FROM PUBLIC;
DO $acl$ DECLARE r text; BEGIN
 FOR r IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role') LOOP
 EXECUTE format('REVOKE ALL ON TABLE public."tenant_integrations" FROM %I',r); END LOOP;
END $acl$;
ALTER TABLE public."tenant_integrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."tenant_integrations" FORCE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public."tenant_integrations" TO qxlayer_runtime;
REVOKE ALL ON TABLE public."tenant_memberships" FROM PUBLIC;
DO $acl$ DECLARE r text; BEGIN
 FOR r IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role') LOOP
 EXECUTE format('REVOKE ALL ON TABLE public."tenant_memberships" FROM %I',r); END LOOP;
END $acl$;
ALTER TABLE public."tenant_memberships" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."tenant_memberships" FORCE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public."tenant_memberships" TO qxlayer_runtime;
REVOKE ALL ON TABLE public."tenant_modules" FROM PUBLIC;
DO $acl$ DECLARE r text; BEGIN
 FOR r IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role') LOOP
 EXECUTE format('REVOKE ALL ON TABLE public."tenant_modules" FROM %I',r); END LOOP;
END $acl$;
ALTER TABLE public."tenant_modules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."tenant_modules" FORCE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public."tenant_modules" TO qxlayer_runtime;
REVOKE ALL ON TABLE public."tenant_payment_methods" FROM PUBLIC;
DO $acl$ DECLARE r text; BEGIN
 FOR r IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role') LOOP
 EXECUTE format('REVOKE ALL ON TABLE public."tenant_payment_methods" FROM %I',r); END LOOP;
END $acl$;
ALTER TABLE public."tenant_payment_methods" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."tenant_payment_methods" FORCE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public."tenant_payment_methods" TO qxlayer_runtime;
REVOKE ALL ON TABLE public."tenant_product_configuration" FROM PUBLIC;
DO $acl$ DECLARE r text; BEGIN
 FOR r IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role') LOOP
 EXECUTE format('REVOKE ALL ON TABLE public."tenant_product_configuration" FROM %I',r); END LOOP;
END $acl$;
ALTER TABLE public."tenant_product_configuration" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."tenant_product_configuration" FORCE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public."tenant_product_configuration" TO qxlayer_runtime;
REVOKE ALL ON TABLE public."tenant_subscriptions" FROM PUBLIC;
DO $acl$ DECLARE r text; BEGIN
 FOR r IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role') LOOP
 EXECUTE format('REVOKE ALL ON TABLE public."tenant_subscriptions" FROM %I',r); END LOOP;
END $acl$;
ALTER TABLE public."tenant_subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."tenant_subscriptions" FORCE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public."tenant_subscriptions" TO qxlayer_runtime;
REVOKE ALL ON TABLE public."tenant_telegram_receipts" FROM PUBLIC;
DO $acl$ DECLARE r text; BEGIN
 FOR r IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role') LOOP
 EXECUTE format('REVOKE ALL ON TABLE public."tenant_telegram_receipts" FROM %I',r); END LOOP;
END $acl$;
ALTER TABLE public."tenant_telegram_receipts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."tenant_telegram_receipts" FORCE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public."tenant_telegram_receipts" TO qxlayer_runtime;
REVOKE ALL ON TABLE public."tenant_usage_counters" FROM PUBLIC;
DO $acl$ DECLARE r text; BEGIN
 FOR r IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role') LOOP
 EXECUTE format('REVOKE ALL ON TABLE public."tenant_usage_counters" FROM %I',r); END LOOP;
END $acl$;
ALTER TABLE public."tenant_usage_counters" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."tenant_usage_counters" FORCE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public."tenant_usage_counters" TO qxlayer_runtime;
REVOKE ALL ON TABLE public."tenants" FROM PUBLIC;
DO $acl$ DECLARE r text; BEGIN
 FOR r IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role') LOOP
 EXECUTE format('REVOKE ALL ON TABLE public."tenants" FROM %I',r); END LOOP;
END $acl$;
ALTER TABLE public."tenants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."tenants" FORCE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public."tenants" TO qxlayer_runtime;
REVOKE ALL ON TABLE public."wallet_configurations" FROM PUBLIC;
DO $acl$ DECLARE r text; BEGIN
 FOR r IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role') LOOP
 EXECUTE format('REVOKE ALL ON TABLE public."wallet_configurations" FROM %I',r); END LOOP;
END $acl$;
ALTER TABLE public."wallet_configurations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."wallet_configurations" FORCE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public."wallet_configurations" TO qxlayer_runtime;
REVOKE ALL ON TABLE public."webhook_endpoints" FROM PUBLIC;
DO $acl$ DECLARE r text; BEGIN
 FOR r IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role') LOOP
 EXECUTE format('REVOKE ALL ON TABLE public."webhook_endpoints" FROM %I',r); END LOOP;
END $acl$;
ALTER TABLE public."webhook_endpoints" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."webhook_endpoints" FORCE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public."webhook_endpoints" TO qxlayer_runtime;
REVOKE ALL ON TABLE public."white_label_attachments" FROM PUBLIC;
DO $acl$ DECLARE r text; BEGIN
 FOR r IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role') LOOP
 EXECUTE format('REVOKE ALL ON TABLE public."white_label_attachments" FROM %I',r); END LOOP;
END $acl$;
ALTER TABLE public."white_label_attachments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."white_label_attachments" FORCE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public."white_label_attachments" TO qxlayer_runtime;
REVOKE ALL ON TABLE public."white_label_events" FROM PUBLIC;
DO $acl$ DECLARE r text; BEGIN
 FOR r IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role') LOOP
 EXECUTE format('REVOKE ALL ON TABLE public."white_label_events" FROM %I',r); END LOOP;
END $acl$;
ALTER TABLE public."white_label_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."white_label_events" FORCE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public."white_label_events" TO qxlayer_runtime;
REVOKE ALL ON TABLE public."white_label_requests" FROM PUBLIC;
DO $acl$ DECLARE r text; BEGIN
 FOR r IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role') LOOP
 EXECUTE format('REVOKE ALL ON TABLE public."white_label_requests" FROM %I',r); END LOOP;
END $acl$;
ALTER TABLE public."white_label_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."white_label_requests" FORCE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public."white_label_requests" TO qxlayer_runtime;
REVOKE ALL ON SEQUENCE public."white_label_requests_order_number_seq" FROM PUBLIC;
GRANT USAGE,SELECT ON SEQUENCE public."white_label_requests_order_number_seq" TO qxlayer_runtime;
