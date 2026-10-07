-- PREPARED ONLY. Do not execute without separate Production-read approval.
-- Schema metadata only; no customer/order/tenant records selected.
BEGIN READ ONLY;
SELECT n.nspname AS schema_name,t.relname AS table_name,c.conname,
       pg_get_constraintdef(c.oid) AS definition,c.convalidated,
       c.contype,t.relrowsecurity,t.relforcerowsecurity,
       (SELECT a.attnotnull FROM pg_attribute a
        WHERE a.attrelid=t.oid AND a.attname='status' AND NOT a.attisdropped) AS status_not_null
FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid
JOIN pg_namespace n ON n.oid=t.relnamespace
WHERE n.nspname='public' AND t.relname='white_label_requests'
  AND c.conname='white_label_request_delivery';
SELECT evtname,evtevent,evtenabled
FROM pg_event_trigger WHERE evtenabled<>'D';
COMMIT;
