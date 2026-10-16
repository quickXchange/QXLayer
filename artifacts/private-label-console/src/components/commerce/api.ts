import { useAuth } from '@/lib/auth';
import { errMsg } from '@/lib/wl';

const API = `${import.meta.env.BASE_URL}api`;
export type Method = { id: string; name: string; kind: string; currency: string; instructions: string };
export type OpMethod = Method & { enabled: boolean; approved: boolean; createdAt: string };
export type Invoice = { id: string; orderId: string; amount: string; currency: string; status: 'pending' | 'reported' | 'paid' | 'rejected'; methodName: string; instructions: string; reference: string | null; createdAt: string; confirmedAt: string | null };
export type OrderPay = { invoice: Invoice | null; methods: Method[]; purchasable: boolean; blockedReason: string | null };
export type EmailRow = { id: string; subject: string; status: 'pending' | 'sent' | 'failed'; attempts: number; lastError: string | null; createdAt: string; sentAt: string | null };

export function useCommerceApi() {
  const { getToken } = useAuth();
  return async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
    const t = await getToken();
    const r = await fetch(`${API}${path}`, { method, credentials: 'include', headers: { ...(t ? { Authorization: `Bearer ${t}` } : {}), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) }, body: body !== undefined ? JSON.stringify(body) : undefined });
    const j = await r.json().catch(() => null) as unknown;
    if (!r.ok) { const b = (j ?? {}) as { error?: string; message?: string }; throw new Error(b.error ?? b.message ?? `Request failed (${r.status})`); }
    return j as T;
  };
}
export const isOrderPay = (x: unknown): x is OrderPay => { const o = x as OrderPay | null; return !!o && typeof o === 'object' && Array.isArray(o.methods) && typeof o.purchasable === 'boolean' && (o.invoice === null || (typeof o.invoice === 'object' && typeof o.invoice.id === 'string' && typeof o.invoice.status === 'string')); };
export const msg = errMsg;
