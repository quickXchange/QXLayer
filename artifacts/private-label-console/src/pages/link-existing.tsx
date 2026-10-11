import { useState } from 'react';
import { Link } from 'wouter';
import { ClerkProvider, SignIn, useAuth as useClerkAuth, useClerk } from '@clerk/react';
import { authClient } from '@/lib/owned-auth-client';
import { useQueryClient } from '@tanstack/react-query';
import { getGetCurrentPrincipalQueryKey } from '@workspace/api-client-react';
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
  return (
    <OwnedSessionGate>
      <AuthFrame title="Link your existing account" subtitle="One-time migration" footer={<Link href="/account/security" data-testid="link-back-security" className="font-medium text-[#b4551f] hover:underline">Back to account security</Link>}>
        <p className="text-sm text-muted-foreground">Sign in to your previous VYNOX LAYER account once to prove ownership. We then attach its existing access to this new account. Your old password cannot be copied, and access is never granted by matching email addresses.</p>
        {pk ? <ClerkProvider publishableKey={pk} signInUrl={`${base}/account/link-existing`}><Linker /></ClerkProvider> : <ErrorLine>The previous sign-in service is not configured here.</ErrorLine>}
      </AuthFrame>
    </OwnedSessionGate>
  );
}
