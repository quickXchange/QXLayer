-- Platform White Label billing is separate from tenant Sandbox payment invoices.
CREATE SCHEMA IF NOT EXISTS qxlayer_commerce;
REVOKE ALL ON SCHEMA qxlayer_commerce FROM PUBLIC;
CREATE TABLE IF NOT EXISTS qxlayer_commerce.methods (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL,
 kind text NOT NULL CHECK(kind IN ('bank_transfer','manual')),
 currency text NOT NULL CHECK(currency ~ '^[A-Z]{3}$'), instructions text NOT NULL DEFAULT '',
 enabled boolean NOT NULL DEFAULT false, approved boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(NOT approved OR length(trim(instructions))>=10)
);
CREATE TABLE IF NOT EXISTS qxlayer_commerce.invoices (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 order_id uuid NOT NULL UNIQUE REFERENCES public.white_label_requests(id) ON DELETE CASCADE,
 customer_user_id text NOT NULL, method_id uuid NOT NULL REFERENCES qxlayer_commerce.methods(id),
 amount numeric(22,2) NOT NULL CHECK(amount>=0), currency text NOT NULL CHECK(currency ~ '^[A-Z]{3}$'),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','reported','paid','rejected')),
 method_name text NOT NULL, instructions text NOT NULL, reference text NOT NULL DEFAULT '',
 evidence text NOT NULL DEFAULT '', confirmed_by text, confirmed_at timestamptz,
 pricing_snapshot jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(status<>'paid' OR (confirmed_by IS NOT NULL AND confirmed_at IS NOT NULL AND length(trim(evidence))>=10 AND length(trim(reference))>=3))
);
CREATE TABLE IF NOT EXISTS qxlayer_commerce.email_outbox (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), event_id uuid NOT NULL UNIQUE REFERENCES public.white_label_events(id) ON DELETE CASCADE,
 order_id uuid NOT NULL REFERENCES public.white_label_requests(id) ON DELETE CASCADE,
 customer_user_id text NOT NULL, subject text NOT NULL, message text NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sent','failed')),
 attempts integer NOT NULL DEFAULT 0, last_error text, sent_at timestamptz,
 claimed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS phase1_payment_reference
 ON qxlayer_commerce.invoices(method_id,upper(btrim(reference))) WHERE status='paid';
CREATE INDEX IF NOT EXISTS phase1_outbox_pending ON qxlayer_commerce.email_outbox(status,created_at);
CREATE TABLE IF NOT EXISTS qxlayer_commerce.offer_settings (
 plan_id uuid PRIMARY KEY REFERENCES public.plans(id) ON DELETE CASCADE,
 monthly boolean NOT NULL DEFAULT true, yearly boolean NOT NULL DEFAULT true
);
ALTER TABLE qxlayer_commerce.offer_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE qxlayer_commerce.offer_settings FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS commerce_read ON qxlayer_commerce.offer_settings;
CREATE POLICY commerce_read ON qxlayer_commerce.offer_settings FOR SELECT USING(true);
DROP POLICY IF EXISTS commerce_write ON qxlayer_commerce.offer_settings;
CREATE POLICY commerce_write ON qxlayer_commerce.offer_settings FOR ALL
 USING(current_setting('app.is_super_admin',true)='true' AND current_setting('app.can_write',true)='true')
 WITH CHECK(current_setting('app.is_super_admin',true)='true' AND current_setting('app.can_write',true)='true');
ALTER TABLE qxlayer_commerce.methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE qxlayer_commerce.methods FORCE ROW LEVEL SECURITY;
ALTER TABLE qxlayer_commerce.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE qxlayer_commerce.invoices FORCE ROW LEVEL SECURITY;
ALTER TABLE qxlayer_commerce.email_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE qxlayer_commerce.email_outbox FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS commerce_read ON qxlayer_commerce.methods;
CREATE POLICY commerce_read ON qxlayer_commerce.methods FOR SELECT USING(current_setting('app.is_super_admin',true)='true' OR (enabled AND approved));
DROP POLICY IF EXISTS commerce_write ON qxlayer_commerce.methods;
CREATE POLICY commerce_write ON qxlayer_commerce.methods FOR ALL
 USING(current_setting('app.is_super_admin',true)='true' AND current_setting('app.can_write',true)='true')
 WITH CHECK(current_setting('app.is_super_admin',true)='true' AND current_setting('app.can_write',true)='true');
DROP POLICY IF EXISTS commerce_scope ON qxlayer_commerce.invoices;
CREATE POLICY commerce_scope ON qxlayer_commerce.invoices FOR ALL
 USING(current_setting('app.is_super_admin',true)='true' OR customer_user_id=current_setting('app.actor_id',true))
 WITH CHECK(current_setting('app.can_write',true)='true' AND
 (current_setting('app.is_super_admin',true)='true' OR customer_user_id=current_setting('app.actor_id',true)));
DROP POLICY IF EXISTS commerce_scope ON qxlayer_commerce.email_outbox;
CREATE POLICY commerce_scope ON qxlayer_commerce.email_outbox FOR ALL
 USING(current_setting('app.is_super_admin',true)='true')
 WITH CHECK(current_setting('app.can_write',true)='true' AND
 (current_setting('app.is_super_admin',true)='true' OR customer_user_id=current_setting('app.actor_id',true)));
CREATE OR REPLACE FUNCTION qxlayer_commerce.payment_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='INSERT' AND NEW.status<>'pending' THEN RAISE EXCEPTION 'Invoices start pending'; END IF;
 IF TG_OP='UPDATE' THEN
  IF (NEW.amount,NEW.currency,NEW.order_id,NEW.customer_user_id,NEW.method_id,NEW.pricing_snapshot)
   IS DISTINCT FROM (OLD.amount,OLD.currency,OLD.order_id,OLD.customer_user_id,OLD.method_id,OLD.pricing_snapshot)
   THEN RAISE EXCEPTION 'Invoice pricing and ownership are immutable'; END IF;
  IF OLD.status='paid' THEN RAISE EXCEPTION 'Verified payment is immutable'; END IF;
  IF NEW.status IN ('paid','rejected') AND current_setting('app.is_super_admin',true) IS DISTINCT FROM 'true'
   THEN RAISE EXCEPTION 'Only an operator verifies payments'; END IF;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS payment_guard ON qxlayer_commerce.invoices;
CREATE TRIGGER payment_guard BEFORE INSERT OR UPDATE ON qxlayer_commerce.invoices FOR EACH ROW EXECUTE FUNCTION qxlayer_commerce.payment_guard();
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='qxlayer_runtime') THEN
  GRANT USAGE ON SCHEMA qxlayer_commerce TO qxlayer_runtime;
  GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA qxlayer_commerce TO qxlayer_runtime;
 END IF;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='pg_database_owner') THEN
  GRANT USAGE ON SCHEMA qxlayer_commerce TO pg_database_owner;
  GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA qxlayer_commerce TO pg_database_owner;
 END IF;
END $$;
REVOKE ALL ON ALL TABLES IN SCHEMA qxlayer_commerce FROM PUBLIC;
