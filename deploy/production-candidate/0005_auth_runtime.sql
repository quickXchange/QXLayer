-- Approved isolated Production initialization. Never executed at app startup.
DO $$ BEGIN
 IF current_setting('qxlayer.external_migration_authorized',true) IS DISTINCT FROM 'yes'
 THEN RAISE EXCEPTION 'Guarded migration runner required'; END IF;
END $$;
CREATE ROLE qxlayer_auth_app NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION;
REVOKE ALL ON SCHEMA vynox_supabase_auth FROM PUBLIC, anon, authenticated, service_role, qxlayer_app, qxlayer_runtime;
GRANT USAGE ON SCHEMA vynox_supabase_auth TO qxlayer_auth_app;
DO $secure$
DECLARE t text;
BEGIN
 FOREACH t IN ARRAY ARRAY['identity_links','rate_limits','recovery_codes','recovery_events','sessions'] LOOP
  EXECUTE format('REVOKE ALL ON vynox_supabase_auth.%I FROM PUBLIC, anon, authenticated, service_role, qxlayer_app, qxlayer_runtime',t);
  EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON vynox_supabase_auth.%I TO qxlayer_auth_app',t);
  EXECUTE format('ALTER TABLE vynox_supabase_auth.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('ALTER TABLE vynox_supabase_auth.%I FORCE ROW LEVEL SECURITY',t);
  EXECUTE format('CREATE POLICY auth_server_only ON vynox_supabase_auth.%I FOR ALL TO qxlayer_auth_app USING (true) WITH CHECK (true)',t);
 END LOOP;
END $secure$;
REVOKE ALL ON SCHEMA qxlayer_migrations FROM qxlayer_app, qxlayer_runtime, qxlayer_auth_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA vynox_supabase_auth REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated, service_role;
