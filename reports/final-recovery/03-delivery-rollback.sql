-- PREPARED ONLY. Separate approval required. Old behavior blocks CURRENT lifecycle.
-- Never rewrite/unlink orders to force rollback to pass.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
LOCK TABLE public.white_label_requests IN ACCESS EXCLUSIVE MODE;
DO $qx_rollback$
DECLARE
  actual_definition text;
  is_validated boolean;
  old_definition constant text := 'CHECK (((status = ''delivered''::text) = (tenant_id IS NOT NULL)))';
  new_definition constant text := 'CHECK (((status <> ''delivered''::text) OR (tenant_id IS NOT NULL)))';
BEGIN
  IF EXISTS (SELECT 1 FROM pg_event_trigger WHERE evtenabled<>'D') THEN
    RAISE EXCEPTION 'Active DDL event triggers require separate review.';
  END IF;
  SELECT pg_get_constraintdef(c.oid),c.convalidated
    INTO actual_definition,is_validated
  FROM pg_constraint c
  WHERE c.conrelid='public.white_label_requests'::regclass
    AND c.conname='white_label_request_delivery' AND c.contype='c';
  IF actual_definition IS NULL OR NOT is_validated THEN
    RAISE EXCEPTION 'Missing or unvalidated delivery constraint; stop for review.';
  END IF;
  IF actual_definition = old_definition THEN
    RAISE NOTICE 'Original validated definition already installed; no change.';
  ELSIF actual_definition = new_definition THEN
    IF EXISTS (
      SELECT 1 FROM public.white_label_requests
      WHERE ((status = 'delivered') = (tenant_id IS NOT NULL)) IS FALSE
    ) THEN
      RAISE EXCEPTION 'Rollback blocked: existing rows use pre-delivery tenant links. Leave rows unchanged.';
    END IF;
    ALTER TABLE public.white_label_requests
      DROP CONSTRAINT white_label_request_delivery,
      ADD CONSTRAINT white_label_request_delivery
        CHECK ((status = 'delivered') = (tenant_id IS NOT NULL));
  ELSE
    RAISE EXCEPTION 'Delivery definition differs from reviewed definitions; stop for review.';
  END IF;
END;
$qx_rollback$;
SELECT conname,convalidated,pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid='public.white_label_requests'::regclass
  AND conname='white_label_request_delivery';
COMMIT;
-- Any failure: issue ROLLBACK in the same SQL session. Never delete or alter data.
