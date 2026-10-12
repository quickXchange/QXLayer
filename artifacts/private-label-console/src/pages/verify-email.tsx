import { useEffect, useRef, useState } from 'react';
import { authClient, supabaseAuth } from '@/lib/owned-auth-client';
import { A, AuthFrame, ErrorLine, Field, Form, MailNotice, SuccessLine, Submit, authErrorText, useOwnedStatus } from '@/components/auth/auth-ui';

let verifyOnce: Promise<{ error?: unknown }> | null = null;

export default function VerifyEmailPage() {
  const params = new URLSearchParams(window.location.search);
  const tokenRef = useRef((supabaseAuth ? params.get('token_hash') : params.get('token')) ?? null);
  const token = tokenRef.current;
  // Better Auth redirects back with verified=1. Supabase never trusts that flag.
  const verifiedFlag = !supabaseAuth && params.get('verified') === '1'; const urlErr = params.get('error');
  const { status, failed } = useOwnedStatus();
  const [state, setState] = useState<'idle' | 'checking' | 'ok' | 'bad'>(token ? 'checking' : verifiedFlag ? 'ok' : urlErr ? 'bad' : 'idle');
  const [email, setEmail] = useState(''); const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [sent, setSent] = useState(false);
  useEffect(() => {
    if (!token) return;
    let live = true;
    if (supabaseAuth) window.history.replaceState(null, '', window.location.pathname);
    // Single-use token: share one request across StrictMode effect re-runs.
    (verifyOnce ??= authClient.verifyEmail({ query: { token } }) as Promise<{ error?: unknown }>).then((r) => { if (live) setState(r.error ? 'bad' : 'ok'); }).catch(() => { if (live) setState('bad'); });
    return () => { live = false; };
  }, [token]);
  const resend = async () => {
    setBusy(true); setErr('');
    try {
      const r = await authClient.sendVerificationEmail({ email: email.trim(), callbackURL: `${import.meta.env.BASE_URL}verify-email?verified=1` });
      if (r.error) setErr(authErrorText(r.error)); else setSent(true);
    } catch (e) { setErr(authErrorText(e as Error)); } finally { setBusy(false); }
  };
  return (
    <AuthFrame title="Verify your email" footer={<A id="link-back-sign-in" href="/sign-in">Go to sign in</A>}>
      {state === 'checking' && <p className="text-center text-sm text-muted-foreground" data-testid="text-verifying">Verifying your link...</p>}
      {state === 'ok' && <SuccessLine>Your email is verified. You can sign in now.</SuccessLine>}
      {state === 'bad' && <ErrorLine>This verification link is invalid or has expired. Request a new one below.</ErrorLine>}
      {(state === 'idle' || state === 'bad') && (<>
        {state === 'idle' && <p className="text-center text-sm text-muted-foreground">Open the link we emailed you to finish creating your account. Did not get it? Request another.</p>}
        <MailNotice status={status} failed={failed} />
        {sent ? <SuccessLine>If that account is unverified, a new link has been sent.</SuccessLine> : (
          <Form onSubmit={resend}>
            <Field id="email" label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
            <ErrorLine>{err}</ErrorLine>
            <Submit id="button-resend" busy={busy} disabled={!email}>Send a new link</Submit>
          </Form>)}
      </>)}
    </AuthFrame>
  );
}
