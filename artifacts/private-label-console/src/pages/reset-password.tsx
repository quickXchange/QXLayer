import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authClient, supabaseAuth } from '@/lib/owned-auth-client';
import { verifyRecoveryLink, supabaseMfa, useSupabaseSessionState } from '@/lib/supabase-auth-client';
import { A, AuthFrame, ErrorLine, Field, Form, SuccessLine, Submit, authErrorText, PASSWORD_HINT, validateNewPassword } from '@/components/auth/auth-ui';

export default function ResetPasswordPage() {
  const qc = useQueryClient();
  const { session } = useSupabaseSessionState();
  const needsMfa = !!session?.recovery && !!session.user?.twoFactorEnabled;
  const [code, setCode] = useState('');
  // Read on route mount, not module import: SPA navigation can happen after the
  // initial bundle loaded. GETs, mail scanners and protection redirects must
  // never redeem a one-time link.
  const token = useRef(new URLSearchParams(window.location.search).get(supabaseAuth ? 'token_hash' : 'token') ?? '');
  const [gate, setGate] = useState<'waiting' | 'checking' | 'ready' | 'invalid'>('waiting');
  const [pw, setPw] = useState(''); const [confirm, setConfirm] = useState(''); const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [done, setDone] = useState(false);
  const redeeming = useRef(false);
  const recoveryReady = gate === 'ready' || (!token.current && !!session?.recovery && !!session.user);
  const continueSetup = async () => {
    if (redeeming.current) return;
    if (!token.current) { setGate('invalid'); return; }
    redeeming.current = true; setErr(''); setGate('checking');
    try {
      const r = await verifyRecoveryLink(token.current);
      if (r.error) { setErr(authErrorText(r.error)); setGate('invalid'); return; }
      token.current = '';
      // Scrub only after the server has established the recovery-only cookie.
      // Reloads then resume that cookie instead of replaying a consumed token.
      window.history.replaceState(null, '', window.location.pathname);
      setGate('ready');
    } catch (e) { setErr(authErrorText(e as Error)); setGate('waiting'); }
    finally { redeeming.current = false; }
  };
  const submit = async () => {
    setErr('');
    const passwordError = validateNewPassword(pw);
    if (passwordError) { setErr(passwordError); return; }
    if (pw !== confirm) { setErr('The passwords do not match.'); return; }
    if (needsMfa && !/^[0-9]{6}$/.test(code)) { setErr('Enter the 6-digit code from your existing authenticator.'); return; }
    setBusy(true);
    try {
      if (needsMfa) {
        const verification = await supabaseMfa.verify(code);
        if (verification.error) { setErr(authErrorText(verification.error)); return; }
      }
      const r = await authClient.resetPassword({ newPassword: pw });
      if (r.error) { setErr(authErrorText(r.error)); return; }
      qc.clear(); setPw(''); setConfirm(''); setCode(''); setDone(true);
    } catch (e) { setErr(authErrorText(e as Error)); } finally { setBusy(false); }
  };
  return (
    <AuthFrame title="Choose a new password" footer={<A id="link-back-sign-in" href="/sign-in">Back to sign in</A>}>
      {done ? <SuccessLine>{supabaseAuth ? 'Password updated. You can sign in now.' : 'Password updated. All other sessions were signed out. You can sign in now.'}</SuccessLine>
        : recoveryReady ? (
        <Form onSubmit={submit}>
          <Field id="new-password" label="New password" type="password" value={pw} onChange={setPw} autoComplete="new-password" hint={PASSWORD_HINT} />
          <Field id="confirm-password" label="Confirm new password" type="password" value={confirm} onChange={setConfirm} autoComplete="new-password" />
           {needsMfa && <Field id="reset-authenticator-code" label="Existing authenticator code" value={code} onChange={setCode} autoComplete="one-time-code" inputMode="numeric" maxLength={6} hint="Password recovery does not remove two-factor authentication." />}
          <ErrorLine>{err}</ErrorLine>
           <Submit id="button-reset" busy={busy} disabled={!pw || (needsMfa && code.length !== 6)}>Update password</Submit>
        </Form>)
        : gate === 'checking' ? <p className="text-center text-sm text-muted-foreground" role="status" data-testid="text-verifying">Checking your reset link...</p>
        : gate === 'invalid' ? <><ErrorLine>This reset link is invalid or has expired. Request a new link; opening the email alone will not use it.</ErrorLine><A id="link-request-new" href="/forgot-password">Request a new link</A></>
        : <><p className="text-sm text-muted-foreground">Continue when you are ready to choose your password. Your single-use link is not used until you press this button.</p><ErrorLine>{err}</ErrorLine><Form onSubmit={continueSetup}><Submit id="button-continue-password-setup" busy={false}>Continue to password setup</Submit></Form></>}
    </AuthFrame>
  );
}
