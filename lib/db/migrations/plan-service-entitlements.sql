BEGIN;
INSERT INTO public.entitlement_definitions(key,label,kind,value_type) VALUES
 ('quickex','Quickex','feature','boolean'),
 ('whitebit','WhiteBIT','feature','boolean'),
 ('quickex_customer_credentials','Customer-owned Quickex credentials','feature','boolean'),
 ('whitebit_customer_credentials','Customer-owned WhiteBIT credentials','feature','boolean')
ON CONFLICT(key) DO NOTHING;
CREATE TABLE IF NOT EXISTS qxlayer_commerce.pricing_publication (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 payload jsonb NOT NULL CHECK(jsonb_typeof(payload)='object'),
 revision text NOT NULL CHECK(revision ~ '^[a-f0-9]{64}$'),
 published_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE qxlayer_commerce.pricing_publication ENABLE ROW LEVEL SECURITY;
ALTER TABLE qxlayer_commerce.pricing_publication FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS commerce_read ON qxlayer_commerce.pricing_publication;
CREATE POLICY commerce_read ON qxlayer_commerce.pricing_publication FOR SELECT USING(true);
DROP POLICY IF EXISTS commerce_write ON qxlayer_commerce.pricing_publication;
CREATE POLICY commerce_write ON qxlayer_commerce.pricing_publication FOR ALL
 USING(current_setting('app.is_super_admin',true)='true' AND current_setting('app.can_write',true)='true')
 WITH CHECK(current_setting('app.is_super_admin',true)='true' AND current_setting('app.can_write',true)='true');
GRANT SELECT,INSERT,UPDATE,DELETE ON qxlayer_commerce.pricing_publication TO pg_database_owner;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='qxlayer_runtime') THEN
  GRANT SELECT,INSERT,UPDATE,DELETE ON qxlayer_commerce.pricing_publication TO qxlayer_runtime;
 END IF;
END $$;
COMMIT;
