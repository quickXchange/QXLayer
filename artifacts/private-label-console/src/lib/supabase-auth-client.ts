import type { QueryClient } from "@tanstack/react-query";
import { resetAccountQueries } from "./auth-query-transition";
import { authActionSessionError } from "./auth-action-session";
import {
  getGetSupabaseAuthSessionQueryKey,
  getSupabaseAuthSession,
  performSupabaseAuthAction,
  useGetSupabaseAuthSession,
  type SupabaseActionInput,
  type SupabaseActionResult,
  type SupabaseSession,
} from "@workspace/api-client-react";

/**
 * Shared account API over the first-party, environment-scoped Supabase session API.
 * The browser holds only opaque HTTP-only cookies set by the server; no provider
 * token or service key ever reaches this code.
 */
export type FacadeError = { code?: string; message?: string; status?: number; retryAfterSeconds?: number };
type Result<T> = { data: T | null; error: FacadeError | null };

let queryClient: QueryClient | null = null;
export function registerSupabaseQueryClient(qc: QueryClient) { queryClient = qc; }

function toError(e: unknown): FacadeError {
  const x = e as { status?: number; message?: string; data?: { code?: string; error?: string; message?: string; retryAfterSeconds?: number } | null };
  const d = x?.data ?? null;
  const code = typeof d?.code === "string" ? d.code : typeof d?.error === "string" && /^[A-Z_]+$/.test(d.error) ? d.error : undefined;
  const message = typeof d?.message === "string" ? d.message : typeof d?.error === "string" && d.error !== code ? d.error : undefined;
  return { code, status: x?.status, message: message ?? (x?.status ? undefined : x?.message),
    ...(typeof d?.retryAfterSeconds === "number" ? { retryAfterSeconds: d.retryAfterSeconds } : {}) };
}

/** Actions that change who (or at what assurance level) the browser is. Clear user caches, then fetch a fresh session. */
const IDENTITY_ACTIONS = new Set<SupabaseActionInput["action"]>(["signup", "login", "login-email-verify", "logout", "verify", "reset-password", "change-password", "mfa-verify", "mfa-email-verify", "mfa-remove", "link-existing", "mfa-recover"]);

export async function refreshSupabaseSession(clear: boolean): Promise<SupabaseSession | null> {
  const qc = queryClient; if (!qc) return null;
  const key = getGetSupabaseAuthSessionQueryKey();
  await qc.cancelQueries({ queryKey: key });
  if (clear) await resetAccountQueries(qc);
  try { return await qc.fetchQuery({ queryKey: key, queryFn: ({ signal }) => getSupabaseAuthSession({ signal }), staleTime: 0 }); }
  catch { return null; }
}

async function act(input: SupabaseActionInput): Promise<Result<SupabaseActionResult>> {
  try {
    const data = await performSupabaseAuthAction(input);
    if (!data.ok) return { data: null, error: { message: "The request was not accepted." } };
    const session = await refreshSupabaseSession(IDENTITY_ACTIONS.has(input.action));
    if (!session) return { data: null, error: { message: "Your request was accepted, but your session could not be confirmed. Check your connection and reload before continuing." } };
    if (import.meta.env.VITE_QXLAYER_EXTERNAL_ENVIRONMENT === "development") {
      const message = authActionSessionError(input, session, data);
      if (message) return { data: null, error: {
        code: input.action === "login-email-send" ? "BROWSER_BINDING_REQUIRED" : "AUTH_SESSION_NOT_CONFIRMED", message } };
    }
    return { data, error: null };
  } catch (e) {
    return { data: null, error: toError(e) };
  }
}

export type FacadeSession = {
  data: { user: { id: string; email: string; name: string; emailVerified: boolean; twoFactorEnabled: boolean; totpFactorId?: string | null }; session: { token?: string } } | null;
  isPending: boolean;
  error: unknown;
  refetch: () => Promise<unknown>;
  mfaRequired: boolean;
  recovery: boolean;
};

/** Business UI is signed in only for a full, non-recovery, MFA-satisfied session. */
function useSession(): FacadeSession {
  const q = useGetSupabaseAuthSession({ query: { queryKey: getGetSupabaseAuthSessionQueryKey(), retry: false, networkMode: "always", refetchInterval: query => query.state.error ? false : 10000 } });
  const s = q.data;
  const full = !!s?.user && !s.recovery && !s.mfaRequired;
  return {
    data: full && s?.user ? { user: s.user, session: {} } : null,
    isPending: q.isLoading,
    error: q.error,
    refetch: () => q.refetch(),
    mfaRequired: !!s?.mfaRequired,
    recovery: !!s?.recovery,
  };
}
/** Raw session state, including recovery and pending-MFA, for the auth screens. */
export function useSupabaseSessionState() {
  const q = useGetSupabaseAuthSession({ query: { queryKey: getGetSupabaseAuthSessionQueryKey(), retry: false, networkMode: "always", refetchOnMount: "always", refetchInterval: query => query.state.error ? false : 10000 } });
  return { session: q.data ?? null, error: q.error, isPending: q.isLoading, isFetching: q.isFetching, isFetchedAfterMount: q.isFetchedAfterMount, refetch: () => q.refetch() };
}

export const supabaseFacade = {
  useSession,
  signUp: { email: (i: { name: string; email: string; password: string }) => act({ action: "signup", name: i.name, email: i.email, password: i.password }) },
  signIn: {
    sendEmailCode: (email: string) => act({ action: "login-email-send", email }),
    verifyEmailCode: (email: string, code: string) => act({ action: "login-email-verify", email, code }),
    email: async (i: { email: string; password: string }) => {
      const r = await act({ action: "login", email: i.email, password: i.password });
      return r.error ? r : { data: { ...r.data, twoFactorRedirect: !!r.data?.mfaRequired }, error: null };
    },
  },
  signOut: () => act({ action: "logout" }),
  requestPasswordReset: (i: { email: string }) => act({ action: "recover", email: i.email }),
  sendVerificationEmail: (i: { email: string }) => act({ action: "resend", email: i.email }),
  verifyEmail: (i: { token?: string; query?: { token: string } }) => act({ action: "verify", token: i.token ?? i.query?.token, tokenType: "signup" }),
  resetPassword: (i: { newPassword: string }) => act({ action: "reset-password", password: i.newPassword }),
  changePassword: (i: { currentPassword: string; newPassword: string }) => act({ action: "change-password", currentPassword: i.currentPassword, password: i.newPassword }),
};

/** Recovery link: exchange the token_hash for a recovery-only cookie before any reset is allowed. */
export const verifyRecoveryLink = (token: string) => act({ action: "verify", token, tokenType: "recovery" });
export const supabaseMfa = {
  sendEmailCode: () => act({ action: "mfa-email-send" }),
  verifyEmailCode: (code: string) => act({ action: "mfa-email-verify", code }),
  generateRecoveryCodes: (currentPassword: string, code: string) =>
    act({ action: "mfa-recovery-generate", currentPassword, code, confirmReplace: true }),
  recover: (currentPassword: string, recoveryCode: string) =>
    act({ action: "mfa-recover", currentPassword, recoveryCode, confirmReset: true }),
  enroll: (currentPassword: string) => act({ action: "mfa-enroll", currentPassword }),
  verify: (code: string, factorId?: string) => act({ action: "mfa-verify", code, factorId }),
  remove: (i: { currentPassword: string; factorId: string; code: string }) => act({ action: "mfa-remove", ...i }),
};
