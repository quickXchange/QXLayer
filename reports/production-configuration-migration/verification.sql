-- Read-only post-execution display/access record checks.
SELECT key,name,visible,display_order FROM public.landing_products ORDER BY display_order,key;
SELECT count(*) AS active_admin_count FROM public.platform_admins WHERE active;
SELECT md5(coalesce(string_agg(md5(to_jsonb(a)::text),',' ORDER BY md5(to_jsonb(a)::text)),'')) AS admin_fingerprint FROM public.platform_admins a;
