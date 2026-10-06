-- Development-only additive workflow change. Keep existing requests, owners and tenant IDs.
-- A request can now point to its prepared draft before delivery, but delivery always
-- requires a tenant. Customer access still depends on the guarded membership grant.
BEGIN;
ALTER TABLE white_label_requests DROP CONSTRAINT IF EXISTS white_label_request_delivery;
ALTER TABLE white_label_requests ADD CONSTRAINT white_label_request_delivery
  CHECK (status <> 'delivered' OR tenant_id IS NOT NULL);
COMMIT;
