ALTER TABLE landing_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE landing_products FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON landing_products TO private_label_runtime;
DROP POLICY IF EXISTS landing_products_read ON landing_products;
CREATE POLICY landing_products_read ON landing_products FOR SELECT TO private_label_runtime
  USING (current_setting('app.is_super_admin',true)='true' OR visible=true);
DROP POLICY IF EXISTS landing_products_write ON landing_products;
CREATE POLICY landing_products_write ON landing_products FOR ALL TO private_label_runtime
  USING (current_setting('app.is_super_admin',true)='true' AND current_setting('app.can_write',true)='true')
  WITH CHECK (current_setting('app.is_super_admin',true)='true' AND current_setting('app.can_write',true)='true');