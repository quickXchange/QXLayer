-- Development auth schema only. Apply through the guarded Development verifier.
BEGIN;
CREATE TABLE IF NOT EXISTS vynox_supabase_auth.recovery_codes (
  subject uuid NOT NULL,
  digest text NOT NULL CHECK (digest ~ '^[a-f0-9]{64}$'),
  factor_fingerprint text NOT NULL CHECK (factor_fingerprint ~ '^[a-f0-9]{64}$'),
  used_at timestamptz,
  PRIMARY KEY (subject, digest)
);
CREATE TABLE IF NOT EXISTS vynox_supabase_auth.recovery_events (
  id uuid PRIMARY KEY,
  subject uuid NOT NULL,
  operation text NOT NULL CHECK (operation IN ('generate', 'recover')),
  outcome text NOT NULL CHECK (outcome IN ('complete', 'consumed', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON vynox_supabase_auth.recovery_codes, vynox_supabase_auth.recovery_events FROM PUBLIC;
COMMIT;
