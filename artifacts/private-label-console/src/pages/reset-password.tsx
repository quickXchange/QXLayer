import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authClient, supabaseAuth } from '@/lib/owned-auth-client';
import { verifyRecoveryLink } from '@/lib/supabase-auth-client';
import { A, AuthFrame, ErrorLine, Field, Form, SuccessLine, Submit, authErrorText, MIN_PASSWORD, MAX_PASSWORD } from '@/components/auth/auth-ui';

// Read once at module load so the token can be scrubbed from the address bar immediately.
const initial = new URLSearchParams(window.location.search);
const initialToken = (supabaseAuth ? initial.get('token_hash') : initial.get('token')) ?? '';
const initialBadLink = initial.get('error') === 'INVALID_TOKEN' || !initialToken;

export default function ResetPasswordPage() {
  const qc = useQueryClient();
  const token = useRef(initialToken);
  // Better Auth keeps its token for the reset call; Supabase must verify first.
  const [gate, setGate] = useState<'checking' | 'ready' | 'invalid'>(initialBadLink ? 'invalid' : supabaseAuth ? 'checking' : 'ready');
  const [pw, setPw] = useState(''); const [confirm, setConfirm] = useState(''); const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [done, setDone] = useState(false);
  const started = useRef(false);
  useEffect(() => {
    if (!supabaseAuth || initialBadLink || started.current) return;
    started.current = true;
    const t = token.current; token.current = '';
    window.history.replaceState(null, '', `${window.location.pathname}`);
    void verifyRecoveryLink(t).then((r) => setGate(r.error ? 'invalid' : 'ready'));
  }, []);
  const submit = async () => {
    setErr('');
    if (pw.length < MIN_PASSWORD || pw.length > MAX_PASSWORD) { setErr(`Use ${MIN_PASSWORD} to ${MAX_PASSWORD} characters.`); return; }
    if (pw !== confirm) { setErr('The passwords do not match.'); return; }
    setBusy(true);
    try {
      const r = await authClient.resetPassword({ newPassword: pw, token: token.current });
      if (r.error) { setErr(authErrorText(r.error)); return; }
      qc.clear(); setPw(''); setConfirm(''); setDone(true);
    } catch (e) { setErr(authErrorText(e as Error)); } finally { setBusy(false); }
  };
  return (
    <AuthFrame title="Choose a new password" footer={<A id="link-back-sign-in" href="/sign-in">Back to sign in</A>}>
      {gate === 'checking' ? <p className="text-center text-sm text-muted-foreground" role="status" data-testid="text-verifying">Checking your reset link...</p>
        : gate === 'invalid' ? <><ErrorLine>This reset link is invalid or has expired.</ErrorLine><A id="link-request-new" href="/forgot-password">Request a new link</A></>
        : done ? <SuccessLine>{supabaseAuth ? 'Password updated. You can sign in now.' : 'Password updated. All other sessions were signed out. You can sign in now.'}</SuccessLine> : (
        <Form onSubmit={submit}>
          <Field id="new-password" label="New password" type="password" value={pw} onChange={setPw} autoComplete="new-password" hint={supabaseAuth ? `${MIN_PASSWORD} to ${MAX_PASSWORD} characters.` : undefined} />
          <Field id="confirm-password" label="Confirm new password" type="password" value={confirm} onChange={setConfirm} autoComplete="new-password" />
          <ErrorLine>{err}</ErrorLine>
          <Submit id="button-reset" busy={busy} disabled={!pw}>Update password</Submit>
        </Form>)}
    </AuthFrame>
  );
}
