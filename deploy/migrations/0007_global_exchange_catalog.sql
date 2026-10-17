-- Additive reference-only schema. Does not change tenant configuration, plans or orders.
CREATE TABLE IF NOT EXISTS public.global_exchange_catalog (
 kind text NOT NULL CHECK(kind IN ('currencies','payment_methods','assets','networks')),
 id text NOT NULL, code text NOT NULL, name text NOT NULL,
 status text NOT NULL DEFAULT 'catalog_only' CHECK(status IN ('enabled','disabled','catalog_only')),
 logo_url text, metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 PRIMARY KEY(kind,id),
 CHECK(kind<>'currencies' OR (id=code AND code ~ '^[A-Z]{3}$' AND code NOT IN ('DZD','ILS'))),
 CHECK(NOT coalesce((metadata->'countryCodes') ?| ARRAY['DZ','IL'],false)),
 CHECK(status<>'enabled' OR coalesce((metadata->>'verified'='true' AND metadata->>'sourceUrl' LIKE 'https://%'),false))
);
CREATE UNIQUE INDEX IF NOT EXISTS global_exchange_catalog_identity ON public.global_exchange_catalog(kind,lower(code));
ALTER TABLE public.global_exchange_catalog DROP CONSTRAINT IF EXISTS global_exchange_catalog_check1;
ALTER TABLE public.global_exchange_catalog ADD CONSTRAINT global_exchange_catalog_check1
 CHECK(status<>'enabled' OR coalesce((metadata->>'verified'='true' AND metadata->>'sourceUrl' LIKE 'https://%'),false));
CREATE TABLE IF NOT EXISTS public.global_exchange_catalog_links (
 id text PRIMARY KEY, kind text NOT NULL CHECK(kind IN ('payment_fiat','asset_network')),
 source_id text NOT NULL, target_id text NOT NULL,
 source_kind text GENERATED ALWAYS AS (CASE WHEN kind='asset_network' THEN 'assets' ELSE 'payment_methods' END) STORED,
 target_kind text GENERATED ALWAYS AS (CASE WHEN kind='asset_network' THEN 'networks' ELSE 'currencies' END) STORED,
 enabled boolean NOT NULL DEFAULT false, verified boolean NOT NULL DEFAULT false,
 metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
 UNIQUE(kind,source_id,target_id),
 FOREIGN KEY(source_kind,source_id) REFERENCES public.global_exchange_catalog(kind,id),
 FOREIGN KEY(target_kind,target_id) REFERENCES public.global_exchange_catalog(kind,id),
 CHECK(NOT enabled OR verified),
 CHECK(NOT verified OR kind<>'asset_network' OR coalesce(metadata->>'native'='true',false) OR coalesce(length(metadata->>'contractAddress')>0,false)),
 CHECK(NOT coalesce((metadata->'countryCodes') ?| ARRAY['DZ','IL'],false))
);
ALTER TABLE public.global_exchange_catalog_links DROP CONSTRAINT IF EXISTS global_exchange_catalog_links_check1;
ALTER TABLE public.global_exchange_catalog_links ADD CONSTRAINT global_exchange_catalog_links_check1
 CHECK(NOT verified OR kind<>'asset_network' OR coalesce(metadata->>'native'='true',false) OR coalesce(length(metadata->>'contractAddress')>0,false));
ALTER TABLE public.global_exchange_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_exchange_catalog_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_exchange_catalog FORCE ROW LEVEL SECURITY;
ALTER TABLE public.global_exchange_catalog_links FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS qx_read ON public.global_exchange_catalog;
DROP POLICY IF EXISTS qx_write ON public.global_exchange_catalog;
DROP POLICY IF EXISTS qx_read ON public.global_exchange_catalog_links;
DROP POLICY IF EXISTS qx_write ON public.global_exchange_catalog_links;
CREATE POLICY qx_read ON public.global_exchange_catalog FOR SELECT USING (true);
CREATE POLICY qx_read ON public.global_exchange_catalog_links FOR SELECT USING (true);
CREATE POLICY qx_write ON public.global_exchange_catalog FOR ALL USING (
 coalesce(current_setting('app.is_super_admin',true),'')='true' AND coalesce(current_setting('app.can_write',true),'')='true')
 WITH CHECK (coalesce(current_setting('app.is_super_admin',true),'')='true' AND coalesce(current_setting('app.can_write',true),'')='true');
CREATE POLICY qx_write ON public.global_exchange_catalog_links FOR ALL USING (
 coalesce(current_setting('app.is_super_admin',true),'')='true' AND coalesce(current_setting('app.can_write',true),'')='true')
 WITH CHECK (coalesce(current_setting('app.is_super_admin',true),'')='true' AND coalesce(current_setting('app.can_write',true),'')='true');
REVOKE ALL ON public.global_exchange_catalog,public.global_exchange_catalog_links FROM PUBLIC;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='qxlayer_runtime') THEN
  GRANT SELECT,INSERT,UPDATE,DELETE ON public.global_exchange_catalog,public.global_exchange_catalog_links TO qxlayer_runtime;
 END IF;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='pg_database_owner') THEN
  GRANT SELECT,INSERT,UPDATE,DELETE ON public.global_exchange_catalog,public.global_exchange_catalog_links TO pg_database_owner;
 END IF;
END $$;
