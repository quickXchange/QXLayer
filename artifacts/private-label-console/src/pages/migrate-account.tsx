import { useEffect, useState } from 'react';
import { ClerkProvider, SignIn, useAuth as useClerkAuth, useClerk } from '@clerk/react';
import { A, AuthFrame, ErrorLine, Field, Form, SuccessLine, Submit } from '@/components/auth/auth-ui';
import { existingClerkKey, existingClerkProxy } from '@/lib/existing-clerk-config';
import { supabaseDevelopmentAuth } from '@/lib/owned-auth-client';

const pk = existingClerkKey;
const base = import.meta.env.BASE_URL.replace(/\/$/, '');

function Enroll() {
  const { isSignedIn, getToken } = useClerkAuth(); const clerk = useClerk();
  const [pw, setPw] = useState(''); const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [done, setDone] = useState(false);
  useEffect(() => () => { setPw(''); setConfirm(''); }, []);
  const submit = async () => {
    setErr('');
    if (pw.length < 12 || pw.length > 128) { setErr('Use between 12 and 128 characters.'); return; }
    if (pw !== confirm) { setErr('The passwords do not match.'); return; }
    setBusy(true);
    try {
      const token = await getToken({ skipCache: true });
      if (!token) { setErr('Your existing-account sign-in expired. Sign in again.'); return; }
      const r = await fetch(`${base}/api/auth-migration/enroll`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ password: pw }) });
      if (!r.ok) {
        const j = (await r.json().catch(() => null)) as { error?: string; message?: string } | null;
        setErr(r.status === 409 ? 'This account has already been migrated. Sign in with your new password.' : j?.message ?? j?.error ?? `Migration failed (${r.status}). Sign in again and retry.`);
        return;
      }
      setPw(''); setConfirm(''); setDone(true);
      try { await clerk.signOut({ redirectUrl: `${base}/sign-in` }); }
      finally { window.location.assign(`${base}/sign-in`); }
    } catch { setErr('Could not complete migration. Try again.'); } finally { setBusy(false); }
  };
  if (done) return <SuccessLine id="text-migrated">Migration complete. Redirecting to sign in with your new password...</SuccessLine>;
  const returnUrl = new URL(`${base}/migrate-account`, window.location.origin).href;
  if (!isSignedIn) return <SignIn routing="hash"
    {...(supabaseDevelopmentAuth ? { forceRedirectUrl: returnUrl, fallbackRedirectUrl: returnUrl } : {})}
    appearance={{ elements: { header: '!hidden', logoBox: '!hidden' } }} />;
  return (
    <Form onSubmit={submit}>
      <Field id="migrate-password" label="New VYNOX LAYER password" type="password" value={pw} onChange={setPw} autoComplete="new-password" hint="12 to 128 characters. Your old password is unchanged and is never copied." />
      <Field id="migrate-confirm" label="Confirm new password" type="password" value={confirm} onChange={setConfirm} autoComplete="new-password" />
      <ErrorLine>{err}</ErrorLine>
      <Submit id="button-migrate" busy={busy} disabled={!pw}>Create my new sign-in</Submit>
      {supabaseDevelopmentAuth && <button type="button" className="text-sm underline" data-testid="button-refresh-existing-proof"
        onClick={() => void clerk.signOut({ redirectUrl: returnUrl })}>Sign out of the existing account to obtain fresh proof</button>}
    </Form>
  );
}

export default function MigrateAccountPage() {
  return (
    <AuthFrame title="Move your existing account" subtitle="One-time migration" footer={<>Already migrated? <A id="link-sign-in" href="/sign-in">Sign in</A></>}>
      <p className="text-sm text-muted-foreground">Sign in once with your existing VYNOX LAYER account. That verifies your email and identity, so there is no new verification email and no need to create a new account. Then choose a password for the new sign-in. Your roles and data stay attached, and this works only once per account.</p>
      {supabaseDevelopmentAuth && <p className="text-sm text-muted-foreground" data-testid="text-development-owner-proof">This Development enrollment is restricted to the account that already owns the existing Super Admin record. A different verified account cannot receive that access. After migration, enable and verify two-factor authentication before opening Admin.</p>}
      {pk ? <ClerkProvider publishableKey={pk} proxyUrl={existingClerkProxy} signInUrl={`${base}/migrate-account`}><Enroll /></ClerkProvider> : <ErrorLine>The previous sign-in service is not configured here.</ErrorLine>}
    </AuthFrame>
  );
}
