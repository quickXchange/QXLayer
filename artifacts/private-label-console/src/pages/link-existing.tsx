import { useState } from 'react';
import { Link, Redirect } from 'wouter';
import { ClerkProvider, SignIn, useAuth as useClerkAuth, useClerk } from '@clerk/react';
import { useSupabaseSessionState } from '@/lib/supabase-auth-client';
import { authClient, supabaseAuth } from '@/lib/owned-auth-client';
import { useQueryClient } from '@tanstack/react-query';
import { performSupabaseAuthAction, getGetCurrentPrincipalQueryKey } from '@workspace/api-client-react';
import { AuthFrame, ErrorLine } from '@/components/auth/auth-ui';
import { Button } from '@/components/ui/button';
import { OwnedSessionGate } from '@/pages/account-security';

const pk = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;
const base = import.meta.env.BASE_URL.replace(/\/$/, '');

function Linker() {
  const { isSignedIn, getToken } = useClerkAuth(); const clerk = useClerk();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const link = async () => {
    setBusy(true); setErr('');
    try {
      const token = await getToken({ skipCache: true });
      if (!token) { setErr('Your existing-account sign-in expired. Sign in again.'); return; }
      const r = await fetch(`${base}/api/auth-migration/link`, { method: 'POST', credentials: 'include', headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) {
        const j = (await r.json().catch(() => null)) as { error?: string; message?: string; code?: string } | null;
        if (r.status === 409 || /mapped|already/i.test(`${j?.code ?? ''} ${j?.error ?? ''} ${j?.message ?? ''}`)) setErr('This account is already linked. Each existing account can be linked only once, to one new account.');
        else setErr(j?.message ?? j?.error ?? `Linking failed (${r.status}). Make sure both sign-ins are fresh and your new email is verified.`);
        return;
      }
      await qc.invalidateQueries({ queryKey: getGetCurrentPrincipalQueryKey() });
      await authClient.signOut();
      try { await clerk.signOut({ redirectUrl: `${base}/sign-in` }); }
      finally { window.location.assign(`${base}/sign-in`); }
    } catch { setErr('Could not complete linking. Try again.'); } finally { setBusy(false); }
  };
  if (!isSignedIn) return <SignIn routing="hash" appearance={{ elements: { header: '!hidden', logoBox: '!hidden' } }} />;
  return <div className="space-y-4 text-center"><p className="text-sm">Existing account verified. Link it to your new VYNOX LAYER account?</p><ErrorLine id="text-link-error">{err}</ErrorLine>
    <Button data-testid="button-link-account" disabled={busy} onClick={() => void link()} className="w-full">{busy ? 'Linking...' : 'Link accounts'}</Button></div>;
}

export default function LinkExistingPage() {
  if (supabaseAuth) return <SupabaseLinkInfo />;
  return (
    <OwnedSessionGate>
      <AuthFrame title="Link your existing account" subtitle="One-time migration" footer={<Link href="/account/security" data-testid="link-back-security" className="font-medium text-[var(--s-accent-ink,hsl(var(--primary)))] hover:underline">Back to account security</Link>}>
        <p className="text-sm text-muted-foreground">Sign in to your previous VYNOX LAYER account once to prove ownership. We then attach its existing access to this new account. Your old password cannot be copied, and access is never granted by matching email addresses.</p>
        {pk ? <ClerkProvider publishableKey={pk} signInUrl={`${base}/account/link-existing`}><Linker /></ClerkProvider> : <ErrorLine>The previous sign-in service is not configured here.</ErrorLine>}
      </AuthFrame>
    </OwnedSessionGate>
  );
}

function SupabaseLinker() {
  const { isSignedIn, getToken } = useClerkAuth(); const clerk = useClerk();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const link = async () => {
    setErr(''); setBusy(true);
    try {
      const token = await getToken({ skipCache: true });
      if (!token) { setErr('Your existing-account proof expired. Sign in to the existing account again.'); return; }
      const r = await performSupabaseAuthAction({ action: 'link-existing' }, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) { setErr('The link was not accepted.'); return; }
      qc.clear();
      try { await clerk.signOut(); } catch { /* proof session cleanup is best effort */ }
      window.location.assign(`${base}/sign-in?linked=1`);
    } catch (e) {
      const x = e as { status?: number; data?: { code?: string; error?: string; message?: string } | null };
      const m = x?.data?.message ?? x?.data?.error ?? '';
      if (x?.status === 401 || /expired|recent|fresh/i.test(m)) setErr('A sign-in proof has expired. Both the new and the existing sign-in must be within the last 10 minutes. Sign in to the existing account again, or sign in again here.');
      else if (x?.status === 409 || /bound|binding|mapped|already|conflict/i.test(`${x?.data?.code ?? ''} ${m}`)) setErr('This existing account cannot be linked to this account: it is already linked, or its approved binding does not match. Nothing was changed.');
      else setErr(m || `Linking failed (${x?.status ?? 'network'}). Nothing was changed.`);
    } finally { setBusy(false); }
  };
  if (!isSignedIn) return <SignIn routing="hash" appearance={{ elements: { header: '!hidden', logoBox: '!hidden' } }} />;
  return (
    <div className="space-y-4 text-center">
      <p className="text-sm" data-testid="text-existing-verified">Existing account verified. Link it to this account?</p>
      <p className="text-xs text-muted-foreground">The server decides whether this pairing is approved. Proving the existing account never grants roles by itself, and email addresses are never matched. After linking you will be signed out and asked to sign in again.</p>
      <ErrorLine id="text-link-error">{err}</ErrorLine>
      <Button data-testid="button-link-account" disabled={busy} onClick={() => void link()} className="w-full">{busy ? 'Linking...' : 'Link accounts'}</Button>
      <Button data-testid="button-existing-signout" type="button" variant="ghost" disabled={busy} onClick={() => void clerk.signOut()} className="w-full">Sign out of the existing account</Button>
    </div>
  );
}

function SupabaseLinkInfo() {
  const { session, isPending } = useSupabaseSessionState();
  const full = !!session?.user && !session.recovery && !session.mfaRequired;
  const footer = <Link href="/account/security" data-testid="link-back-security" className="font-medium text-[var(--s-accent-ink,hsl(var(--primary)))] hover:underline">Back to account security</Link>;
  if (isPending) return <AuthFrame title="Link your existing account" footer={footer}><p className="text-sm text-muted-foreground">Checking your session...</p></AuthFrame>;
  if (session?.mfaRequired) return <Redirect to="/two-factor" />;
  if (!full) return <Redirect to="/sign-in" />;
  const verified = !!session?.user?.emailVerified;
  const keyOk = !!pk && pk.startsWith('pk_test_');
  return (
    <AuthFrame title="Link your existing account" subtitle="Two proofs, one approval" footer={footer}>
      <p className="text-sm text-muted-foreground" data-testid="text-link-explainer">Your existing IDs and access are preserved. Sign in to the existing account to prove you own it. The server then checks that both sign-ins are recent and that this pairing is approved. Matching email addresses never links accounts or grants roles.</p>
      {!verified ? <ErrorLine id="text-link-unverified">Verify this account's email first, then return here.</ErrorLine>
        : !keyOk ? <ErrorLine id="text-link-unconfigured">The existing-account sign-in is not available in this environment.</ErrorLine>
        : <ClerkProvider publishableKey={pk} signInUrl={`${base}/account/link-existing`}><SupabaseLinker /></ClerkProvider>}
    </AuthFrame>
  );
}
