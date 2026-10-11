import type { ComponentType, ReactNode } from 'react';
import { useAuth as useClerkAuth, useClerk as useClerkLegacy, UserProfile as ClerkUserProfile } from '@clerk/react';
import { authClient, ownedAuth } from '@/lib/owned-auth-client';
import { SecurityPanel } from '@/components/auth/security-panel';

type SignOutOptions = { redirectUrl?: string };
export { ownedAuth };

async function ownedSignOut(opts?: SignOutOptions) {
  const result = await authClient.signOut();
  if (result.error) throw new Error("Sign out failed. Please retry before leaving this device.");
  const base = import.meta.env.BASE_URL;
  const to = opts?.redirectUrl && opts.redirectUrl !== '/' ? opts.redirectUrl : '';
  window.location.assign(to || base);
}
function useOwnedClerk() { return { signOut: ownedSignOut }; }
function useOwnedAuth() { return { getToken: async (): Promise<string | null> => null }; }

/** Selected once at module load, so hook order never changes. */
export const useClerk: () => { signOut: (o?: SignOutOptions) => Promise<void> } =
  ownedAuth ? useOwnedClerk : (useClerkLegacy as unknown as () => { signOut: (o?: SignOutOptions) => Promise<void> });
export const useAuth: () => { getToken: () => Promise<string | null> } =
  ownedAuth ? useOwnedAuth : (useClerkAuth as unknown as () => { getToken: () => Promise<string | null> });

function OwnedShow({ when, children }: { when: 'signed-in' | 'signed-out'; children?: ReactNode }) {
  const s = authClient.useSession();
  if (s.isPending) return null;
  const signedIn = !!s.data?.user;
  return (when === 'signed-in') === signedIn ? <>{children}</> : null;
}
function LegacyShow(props: { when: 'signed-in' | 'signed-out'; children?: ReactNode }) {
  return <ClerkShow {...props} />;
}
import { Show as ClerkShow } from '@clerk/react';
export const Show: ComponentType<{ when: 'signed-in' | 'signed-out'; children?: ReactNode }> = ownedAuth ? OwnedShow : LegacyShow;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const UserProfile: ComponentType<any> = ownedAuth ? SecurityPanel : ClerkUserProfile;
