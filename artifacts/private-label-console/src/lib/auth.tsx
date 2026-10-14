import type { ComponentType, ReactNode } from 'react';
import { authClient, ownedAuth } from '@/lib/owned-auth-client';
import { SupabaseSecurityPanel } from '@/components/auth/supabase-security-panel';

type SignOutOptions = { redirectUrl?: string };
export { ownedAuth };

async function ownedSignOut(opts?: SignOutOptions) {
  const result = await authClient.signOut();
  if (result.error) throw new Error("Sign out failed. Please retry before leaving this device.");
  const base = import.meta.env.BASE_URL;
  const to = opts?.redirectUrl && opts.redirectUrl !== '/' ? opts.redirectUrl : '';
  window.location.assign(to || base);
}
function useAccountSignOut() { return { signOut: ownedSignOut }; }
function useOwnedAuth() { return { getToken: async (): Promise<string | null> => null }; }

/** Selected once at module load, so hook order never changes. */
export const useAccountAuth = useAccountSignOut;
export const useAuth = useOwnedAuth;

function OwnedShow({ when, children }: { when: 'signed-in' | 'signed-out'; children?: ReactNode }) {
  const s = authClient.useSession();
  if (s.isPending) return null;
  const signedIn = !!s.data?.user;
  return (when === 'signed-in') === signedIn ? <>{children}</> : null;
}
export const Show: ComponentType<{ when: 'signed-in' | 'signed-out'; children?: ReactNode }> = OwnedShow;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const UserProfile: ComponentType<any> = SupabaseSecurityPanel;
