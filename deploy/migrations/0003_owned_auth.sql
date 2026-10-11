DO $guard$
BEGIN
 IF current_setting('qxlayer.auth_schema_approved',true) IS DISTINCT FROM 'yes' THEN
   RAISE EXCEPTION 'Project-owned auth schema requires explicit isolated Development/Staging approval';
 END IF;
END
$guard$;
CREATE SCHEMA IF NOT EXISTS qxlayer_auth;
REVOKE ALL ON SCHEMA qxlayer_auth FROM PUBLIC;
CREATE TABLE IF NOT EXISTS qxlayer_auth."user" (
 id text PRIMARY KEY, name text NOT NULL, email text NOT NULL UNIQUE,
 "emailVerified" boolean NOT NULL DEFAULT false, image text,
 "twoFactorEnabled" boolean NOT NULL DEFAULT false,
 "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS qxlayer_auth.session (
 id text PRIMARY KEY, token text NOT NULL UNIQUE, "userId" text NOT NULL REFERENCES qxlayer_auth."user"(id) ON DELETE CASCADE,
 "expiresAt" timestamptz NOT NULL, "ipAddress" text, "userAgent" text,
 "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auth_session_user ON qxlayer_auth.session("userId");
CREATE TABLE IF NOT EXISTS qxlayer_auth.account (
 id text PRIMARY KEY, "accountId" text NOT NULL, "providerId" text NOT NULL,
 "userId" text NOT NULL REFERENCES qxlayer_auth."user"(id) ON DELETE CASCADE,
 password text, "accessToken" text, "refreshToken" text, "idToken" text,
 "accessTokenExpiresAt" timestamptz, "refreshTokenExpiresAt" timestamptz, scope text,
 "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(),
 UNIQUE ("providerId","accountId")
);
CREATE INDEX IF NOT EXISTS auth_account_user ON qxlayer_auth.account("userId");
CREATE TABLE IF NOT EXISTS qxlayer_auth.verification (
 id text PRIMARY KEY, identifier text NOT NULL, value text NOT NULL, "expiresAt" timestamptz NOT NULL,
 "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auth_verification_identifier ON qxlayer_auth.verification(identifier);
CREATE TABLE IF NOT EXISTS qxlayer_auth."twoFactor" (
 id text PRIMARY KEY, "userId" text NOT NULL REFERENCES qxlayer_auth."user"(id) ON DELETE CASCADE,
 secret text NOT NULL, "backupCodes" text NOT NULL, verified boolean NOT NULL DEFAULT false,
 "failedVerificationCount" integer NOT NULL DEFAULT 0, "lockedUntil" timestamptz
);
CREATE INDEX IF NOT EXISTS auth_factor_user ON qxlayer_auth."twoFactor"("userId");
CREATE TABLE IF NOT EXISTS qxlayer_auth."rateLimit" (
 id text PRIMARY KEY, key text NOT NULL UNIQUE, count integer NOT NULL, "lastRequest" bigint NOT NULL
);
CREATE TABLE IF NOT EXISTS qxlayer_auth.identity_link (
 auth_user_id text PRIMARY KEY REFERENCES qxlayer_auth."user"(id) ON DELETE RESTRICT,
 business_id text NOT NULL UNIQUE, proof_subject text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
DO $auth$
DECLARE t text; runtime text; roles text[];
BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='qxlayer_app') THEN
   runtime := 'qxlayer_app'; roles := ARRAY['qxlayer_app'];
 ELSE
   runtime := current_user; roles := ARRAY[current_user,'pg_database_owner'];
 END IF;
 EXECUTE format('GRANT USAGE ON SCHEMA qxlayer_auth TO %I',runtime);
 FOREACH t IN ARRAY ARRAY['user','session','account','verification','twoFactor','rateLimit','identity_link'] LOOP
   EXECUTE format('REVOKE ALL ON qxlayer_auth.%I FROM PUBLIC',t);
   IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
     EXECUTE format('REVOKE ALL ON qxlayer_auth.%I FROM anon,authenticated',t);
   END IF;
   EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON qxlayer_auth.%I TO %I',t,runtime);
   EXECUTE format('ALTER TABLE qxlayer_auth.%I ENABLE ROW LEVEL SECURITY',t);
   EXECUTE format('ALTER TABLE qxlayer_auth.%I FORCE ROW LEVEL SECURITY',t);
   IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='qxlayer_auth' AND tablename=t AND policyname='auth_server_only') THEN
     EXECUTE format('CREATE POLICY auth_server_only ON qxlayer_auth.%I FOR ALL TO %s USING (true) WITH CHECK (true)',
       t,(SELECT string_agg(quote_ident(r),',') FROM unnest(roles) AS r));
   END IF;
 END LOOP;
 EXECUTE format('REVOKE UPDATE,DELETE ON qxlayer_auth.identity_link FROM %I',runtime);
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
   REVOKE ALL ON SCHEMA qxlayer_auth FROM anon,authenticated;
 END IF;
END
$auth$;
