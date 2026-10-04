-- Explicit development migration. Preserves request UUIDs, ownership and tenants.
BEGIN;
ALTER TABLE white_label_requests ADD COLUMN IF NOT EXISTS order_number serial;
CREATE UNIQUE INDEX IF NOT EXISTS white_label_requests_order_number_unique ON white_label_requests(order_number);
ALTER TABLE white_label_requests ALTER COLUMN order_number SET NOT NULL;
ALTER TABLE white_label_requests ADD COLUMN IF NOT EXISTS customization_price text;
ALTER TABLE white_label_requests ADD COLUMN IF NOT EXISTS custom_design_decision text NOT NULL DEFAULT 'pending';
ALTER TABLE white_label_requests ADD COLUMN IF NOT EXISTS approved_configuration jsonb;
ALTER TABLE white_label_requests DROP CONSTRAINT IF EXISTS white_label_request_status;
ALTER TABLE white_label_requests DROP CONSTRAINT IF EXISTS white_label_request_delivery;
UPDATE white_label_requests SET status=CASE status WHEN 'submitted' THEN 'new' WHEN 'provisioned' THEN 'delivered' ELSE status END
WHERE status IN ('submitted','provisioned');
ALTER TABLE white_label_requests ALTER COLUMN status SET DEFAULT 'new';
ALTER TABLE white_label_requests ADD CONSTRAINT white_label_request_status CHECK (status IN ('new','reviewing','waiting_for_client','quote_ready','approved','in_setup','customization','ready','delivered','rejected','cancelled'));
ALTER TABLE white_label_requests ADD CONSTRAINT white_label_request_delivery CHECK ((status='delivered')=(tenant_id IS NOT NULL));
ALTER TABLE addons ADD COLUMN IF NOT EXISTS monthly_price numeric(22,2) NOT NULL DEFAULT 0;
ALTER TABLE addons ADD COLUMN IF NOT EXISTS yearly_price numeric(22,2) NOT NULL DEFAULT 0;
ALTER TABLE addons ADD COLUMN IF NOT EXISTS setup_fee numeric(22,2) NOT NULL DEFAULT 0;
ALTER TABLE addons ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'USD';
ALTER TABLE addons ADD COLUMN IF NOT EXISTS pricing_configured boolean NOT NULL DEFAULT false;
COMMIT;