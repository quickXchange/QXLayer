import { pool } from "@workspace/db";
import { supabaseAuthConfiguration, supabaseBusinessId } from "./config";
import { HttpError } from "../../lib/errors";

interface DirectoryUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  primaryEmailAddressId: string | null;
  emailAddresses: { id: string; emailAddress: string }[];
  createdAt: number;
  banned: boolean;
  locked: boolean;
}
/** Preserve linked business IDs; never query or modify retired provider accounts. */
export async function supabaseDirectory(): Promise<DirectoryUser[]> {
  const cfg = supabaseAuthConfiguration();
  const users: DirectoryUser[] = [];
  for (let page = 1; page <= 100; page++) {
    const response = await fetch(`${cfg.providerOrigin}/auth/v1/admin/users?page=${page}&per_page=100`,
      { headers: { apikey: cfg.apiKey },
        redirect: "error", signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new HttpError(503, "Staging account directory is unavailable.");
    const body = await response.json() as { users: { id: string; email?: string; created_at: string;
      banned_until?: string; user_metadata?: { name?: string } }[] };
    const links = await pool.query("SELECT subject,business_id FROM vynox_supabase_auth.identity_links WHERE subject=ANY($1::uuid[])",
      [body.users.map(u => u.id)]);
    const mapping = new Map<string, string>(links.rows.map(r => [r.subject, r.business_id]));
    for (const u of body.users) users.push({ id: mapping.get(u.id) ?? supabaseBusinessId(u.id),
      firstName: u.user_metadata?.name ?? null, lastName: null, primaryEmailAddressId: u.id,
      emailAddresses: u.email ? [{ id: u.id, emailAddress: u.email }] : [],
      createdAt: Date.parse(u.created_at), banned: !!u.banned_until && Date.parse(u.banned_until) > Date.now(), locked: false });
    if (body.users.length < 100) break;
    if (page === 100) throw new HttpError(503, "Staging account directory exceeds the bounded scan.");
  }
  return users.sort((a, b) => a.createdAt - b.createdAt);
}
