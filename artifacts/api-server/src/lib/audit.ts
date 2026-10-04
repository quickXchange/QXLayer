import type { DatabaseClient } from "@workspace/db";
import type { Principal } from "../modules/authentication/service";

export async function audit(
  client: DatabaseClient, principal: Principal, tenantId: string | null,
  eventType: string, description: string, metadata: Record<string, unknown> = {},
) {
  await client.query(
    "INSERT INTO audit_events (tenant_id,actor_id,event_type,description,metadata) VALUES ($1,$2,$3,$4,$5::jsonb)",
    [tenantId, principal.userId, eventType, description, JSON.stringify(metadata)],
  );
}