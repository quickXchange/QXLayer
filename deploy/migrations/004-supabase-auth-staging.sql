-- Apply ONLY to the explicitly pinned isolated Staging project.
-- No business tables, legacy account IDs or existing permissions are changed.
BEGIN;
CREATE SCHEMA IF NOT EXISTS vynox_supabase_auth;
REVOKE ALL ON SCHEMA vynox_supabase_auth FROM PUBLIC, anon, authenticated;
CREATE TABLE IF NOT EXISTS vynox_supabase_auth.sessions (
  digest text PRIMARY KEY CHECK (digest ~ '^[a-f0-9]{64}$'),
  subject uuid NOT NULL,
  envelope text NOT NULL,
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS vynox_sb_session_subject ON vynox_supabase_auth.sessions(subject);
CREATE TABLE IF NOT EXISTS vynox_supabase_auth.identity_links (
  subject uuid PRIMARY KEY,
  business_id text UNIQUE NOT NULL,
  proof_subject text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS vynox_supabase_auth.rate_limits (
  key text PRIMARY KEY,
  hits integer NOT NULL,
  reset_at timestamptz NOT NULL
);
REVOKE ALL ON ALL TABLES IN SCHEMA vynox_supabase_auth FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA vynox_supabase_auth TO qxlayer_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA vynox_supabase_auth TO qxlayer_app;
COMMIT;
