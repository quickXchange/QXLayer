import { withDatabase } from "@workspace/db";
import { SubmitWhiteLabelRequestBody, ReviewWhiteLabelRequestBody, type WhiteLabelRequestInput, type WhiteLabelReviewInput } from "@workspace/api-zod";
import { contextFor, requireSuperAdmin, type Principal } from "../authentication/service";
import { HttpError } from "../../lib/errors";
import { audit } from "../../lib/audit";
import { requireFeature, resolveEntitlements } from "../entitlements/resolver";

const columns = `id,customer_user_id AS "customerUserId",configuration,status,monthly_price AS "monthlyPrice",setup_price AS "setupPrice",currency,operator_note AS "operatorNote",tenant_id AS "tenantId",created_at AS "createdAt",updated_at AS "updatedAt"`;
function view(row: Record<string, any>) {
  const { configuration, ...rest } = row;
  return { ...rest, ...configuration };
}
function requestContext(p: Principal, write = false) { return { actorId: p.userId, isSuperAdmin: p.role === "super_admin", canWrite: write }; }

export function myAdminPanels(p: Principal) {
  if (p.role === "super_admin") return Promise.resolve([]);
  return Promise.all(p.memberships.map(m => withDatabase(contextFor(p, m.tenantId), async c => {
    const r = await c.query(`SELECT t.id AS "tenantId",t.name,coalesce(b.brand_name,t.name) AS "brandName",t.slug,t.status
      FROM tenants t LEFT JOIN tenant_branding b ON b.tenant_id=t.id
      WHERE t.id=$1 AND 'exchange_provisioned'=ANY(t.completed_steps) AND t.status IN ('active','suspended')`, [m.tenantId]);
    return r.rows.map(row => ({ ...row, role: m.role }));
  }))).then(rows => rows.flat());
}
export function assertDeliveredExchangeAccess(p: Principal, tenantId: string) {
  if (p.role === "super_admin") return Promise.resolve();
  return withDatabase(contextFor(p, tenantId), async c => {
    const r = await c.query("SELECT id FROM tenants WHERE id=$1 AND 'exchange_provisioned'=ANY(completed_steps) AND status IN ('active','suspended')", [tenantId]);
    if (!r.rowCount) throw new HttpError(403, "This Exchange has not been provisioned for your account.");
  });
}
export function listRequests(p: Principal, operator = false) {
  if (operator) requireSuperAdmin(p);
  return withDatabase(requestContext(p), async c => {
    const r = await c.query(`SELECT ${columns} FROM white_label_requests ${operator ? "" : "WHERE customer_user_id=$1"} ORDER BY created_at DESC`, operator ? [] : [p.userId]);
    return r.rows.map(view);
  });
}
export function submitRequest(p: Principal, raw: WhiteLabelRequestInput) {
  if (p.role === "super_admin") throw new HttpError(403, "Super Admin reviews customer requests; use a customer account to submit.");
  const input = SubmitWhiteLabelRequestBody.parse(raw);
  const { idempotencyKey, ...fields } = input;
  const configuration = { ...fields, projectName: fields.projectName.trim(), brandName: fields.brandName.trim(), preferredDomain: fields.preferredDomain?.trim() || null };
  if (configuration.projectName.length < 2 || configuration.brandName.length < 2 || new Set(input.actions).size !== input.actions.length) throw new HttpError(400, "Provide project and brand names and distinct Exchange actions.");
  return withDatabase(requestContext(p, true), async c => {
    const inserted = await c.query(`INSERT INTO white_label_requests (customer_user_id,idempotency_key,configuration)
      VALUES ($1,$2,$3) ON CONFLICT (customer_user_id,idempotency_key) DO NOTHING RETURNING ${columns}`, [p.userId, idempotencyKey, JSON.stringify(configuration)]);
    const row = inserted.rows[0] ?? (await c.query(`SELECT ${columns} FROM white_label_requests WHERE customer_user_id=$1 AND idempotency_key=$2`, [p.userId, idempotencyKey])).rows[0];
    // JSONB object key ordering is not a client contract.
    if (!row || Object.keys(configuration).some(k => JSON.stringify(row.configuration[k]) !== JSON.stringify(configuration[k as keyof typeof configuration]))) throw new HttpError(409, "This submission key belongs to another request.");
    return view(row);
  });
}
export function reviewRequest(p: Principal, id: string, raw: WhiteLabelReviewInput) {
  requireSuperAdmin(p);
  const input = ReviewWhiteLabelRequestBody.parse(raw);
  return withDatabase(requestContext(p, true), async c => {
    const existing = await c.query("SELECT status FROM white_label_requests WHERE id=$1 FOR UPDATE", [id]);
    if (!existing.rowCount) throw new HttpError(404, "White Label request not found.");
    if (existing.rows[0].status === "provisioned") throw new HttpError(409, "A delivered White Label cannot be reviewed again.");
    const r = await c.query(`UPDATE white_label_requests SET status=$2,monthly_price=$3,setup_price=$4,currency=$5,operator_note=$6,updated_at=now() WHERE id=$1 RETURNING ${columns}`, [id, input.status, input.monthlyPrice, input.setupPrice, input.currency, input.operatorNote]);
    await audit(c, p, null, "white_label.request.reviewed", "Reviewed Exchange White Label request", { requestId: id, status: input.status });
    return view(r.rows[0]);
  });
}
export function deliverRequest(p: Principal, id: string, tenantId: string) {
  requireSuperAdmin(p);
  return withDatabase(contextFor(p, tenantId, true), async c => {
    const request = await c.query(`SELECT ${columns} FROM white_label_requests WHERE id=$1 FOR UPDATE`, [id]);
    if (!request.rowCount) throw new HttpError(404, "White Label request not found.");
    const row = request.rows[0];
    if (row.status === "provisioned" && row.tenantId === tenantId) return view(row);
    if (row.status !== "approved") throw new HttpError(409, "Approve the request and set final pricing before provisioning.");
    const tenant = await c.query("SELECT id,status,completed_steps FROM tenants WHERE id=$1 FOR UPDATE", [tenantId]);
    if (!tenant.rowCount || tenant.rows[0].status !== "active" || !tenant.rows[0].completed_steps.includes("exchange_provisioned")) throw new HttpError(409, "Finish Exchange setup and activate this tenant before handing it to the customer.");
    const effective = await resolveEntitlements(c, tenantId);
    requireFeature(effective, "website"); requireFeature(effective, "crypto_exchange");
    if (effective.overLimit) throw new HttpError(409, "Resolve this Exchange's plan limits before provisioning.");
    const configured = await c.query("SELECT configuration FROM tenant_product_configuration WHERE tenant_id=$1 AND module_key='crypto_exchange'", [tenantId]);
    const settings = configured.rows[0]?.configuration;
    if (!settings || settings.referenceCurrency !== effective.plan?.currency) throw new HttpError(409, "Review and save the Exchange reference rates for the assigned plan before provisioning.");
    for (const action of row.configuration.actions as string[]) {
      requireFeature(effective, action);
      if (!settings.actions?.[action] || !settings.routes?.some((r: { action: string; enabled: boolean }) => r.enabled && r.action === action)) throw new HttpError(409, `Configure the requested ${action} action and its route before provisioning.`);
    }
    const owner = await c.query("SELECT clerk_user_id FROM tenant_memberships WHERE tenant_id=$1 AND role='client_admin' AND active AND clerk_user_id<>$2", [tenantId, row.customerUserId]);
    if (owner.rowCount) throw new HttpError(409, "This Exchange is already owned by another customer.");
    const used = await c.query("SELECT id FROM white_label_requests WHERE tenant_id=$1", [tenantId]);
    if (used.rowCount) throw new HttpError(409, "This Exchange has already been delivered.");
    await c.query("INSERT INTO tenant_memberships (tenant_id,clerk_user_id,role,label,active) VALUES ($1,$2,'client_admin','Customer account owner',true) ON CONFLICT (tenant_id,clerk_user_id) DO UPDATE SET role='client_admin',active=true", [tenantId, row.customerUserId]);
    const r = await c.query(`UPDATE white_label_requests SET status='provisioned',tenant_id=$2,updated_at=now() WHERE id=$1 RETURNING ${columns}`, [id, tenantId]);
    await audit(c, p, tenantId, "white_label.provisioned", "Delivered Exchange into the existing QXLayer customer account", { requestId: id });
    return view(r.rows[0]);
  });
}