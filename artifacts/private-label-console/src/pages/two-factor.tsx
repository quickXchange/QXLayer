import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { supabaseDevelopmentAuth } from '@/lib/owned-auth-client';
import { supabaseMfa, useSupabaseSessionState } from '@/lib/supabase-auth-client';
import { A, AuthFrame, ErrorLine, Field, Form, Submit, authErrorText } from '@/components/auth/auth-ui';

export default function TwoFactorPage() {
  const [, nav] = useLocation();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const [lost, setLost] = useState(false); const [pw, setPw] = useState(''); const [confirmReset, setConfirmReset] = useState(false);
  const { session } = useSupabaseSessionState();
  const [emailMethod, setEmailMethod] = useState(false);
  const [sent, setSent] = useState(false);
  const [retryAt, setRetryAt] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const emailAvailable = supabaseDevelopmentAuth && !!session?.emailMfaAvailable;
  useEffect(() => {
    const tick = () => setSeconds(Math.max(0, Math.ceil((retryAt - Date.now()) / 1000)));
    tick(); const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [retryAt]);
  useEffect(() => { if (!emailAvailable) { setEmailMethod(false); setSent(false); } }, [emailAvailable]);
  const sendEmail = async () => {
    setBusy(true); setErr('');
    try {
      const r = await supabaseMfa.sendEmailCode();
      if (r.error) { setErr(authErrorText(r.error)); return; }
      setSent(true); setCode(''); setRetryAt(Date.now() + 60000);
    } catch (e) { setErr(authErrorText(e as Error)); } finally { setBusy(false); }
  };
  useEffect(() => () => setCode(''), []);
  const submit = async () => {
    setBusy(true); setErr('');
    try {
      const c = code.replace(/\s/g, '');
      const r = emailMethod ? await supabaseMfa.verifyEmailCode(c) : await supabaseMfa.verify(c);
      if (r.error) { setErr(authErrorText(r.error)); return; }
      setCode(''); nav('/admin', { replace: true });
    } catch (e) { setErr(authErrorText(e as Error)); } finally { setBusy(false); }
  };
  return (
    <AuthFrame title={lost ? 'Recover a lost authenticator' : 'Two-step verification'} subtitle={lost ? 'Use a recovery code you saved earlier and confirm your password.' : emailMethod ? 'Receive a sign-in code at your verified Gmail address.' : 'Enter the 6-digit code from Google Authenticator.'} footer={<A id="link-back-sign-in" href="/sign-in">Back to sign in</A>}>
      {lost ? <Form onSubmit={async () => {
        if (!confirmReset) return;
        setBusy(true); setErr('');
        try {
          const r = await supabaseMfa.recover(pw, code);
          if (r.error) { setErr(authErrorText(r.error)); return; }
          setPw(''); setCode('');
          window.location.assign(`${import.meta.env.BASE_URL.replace(/\/$/, '')}/sign-in?authenticator=recovered`);
        } catch (e) { setErr(authErrorText(e as Error)); } finally { setBusy(false); }
      }}>
        <Field id="lost-authenticator-password" label="Current password" type="password" value={pw} onChange={setPw} autoComplete="current-password" />
        <Field id="lost-authenticator-code" label="Unused recovery code" value={code} onChange={setCode} autoComplete="off" maxLength={64} />
        <p className="text-sm text-muted-foreground">This resets the existing authenticator, invalidates the remaining recovery codes, and signs out every session. Your account, roles and data stay unchanged. Enable 2FA again before opening Super Admin. If you have no saved recovery code, do not register another Owner; recovery requires a separate ownership review.</p>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" data-testid="checkbox-confirm-authenticator-reset" checked={confirmReset} onChange={e => setConfirmReset(e.target.checked)} /><span>I confirm the authenticator reset and sign-out of all sessions.</span></label>
        <ErrorLine>{err}</ErrorLine>
        <Submit id="button-recover-authenticator" busy={busy} disabled={!pw || !code || !confirmReset}>Reset lost authenticator and sign out</Submit>
      </Form> : <Form onSubmit={submit}>
        {emailMethod && <>
          <p className="text-sm text-muted-foreground">The code is single-use and expires in 5 minutes. Google Authenticator stays enabled.</p>
          {sent && <p role="status" className="text-sm">Code sent to your verified Gmail address. Check your inbox.</p>}
          <button type="button" data-testid="button-send-email-code" disabled={busy || seconds > 0} className="text-sm font-medium hover:underline" onClick={() => void sendEmail()}>
            {seconds > 0 ? `Resend available in ${seconds}s` : sent ? 'Resend email code' : 'Send email code'}
          </button>
        </>}
        <Field id="code" label={emailMethod ? 'Email verification code' : 'Google Authenticator code'} value={code} onChange={setCode} autoComplete="one-time-code" inputMode="numeric" maxLength={6} />
        <ErrorLine>{err}</ErrorLine>
        <Submit id="button-verify" busy={busy} disabled={!/^[0-9]{6}$/.test(code) || (emailMethod && !sent)}>Verify</Submit>
      </Form>}
      {emailAvailable && !lost && <button type="button" disabled={busy} data-testid="button-another-method" className="block w-full text-center text-sm font-medium hover:underline"
        onClick={() => { setEmailMethod(!emailMethod); setCode(''); setErr(''); }}>{emailMethod ? 'Use Google Authenticator instead' : 'Another Method'}</button>}
      {supabaseDevelopmentAuth && <button type="button" disabled={busy} data-testid="button-toggle-authenticator-recovery" className="block w-full text-center text-sm font-medium hover:underline"
        onClick={() => { setLost(!lost); setEmailMethod(false); setCode(''); setPw(''); setErr(''); setConfirmReset(false); }}>{lost ? 'Use authenticator app instead' : 'Lost your authenticator? Use a saved recovery code'}</button>}
    </AuthFrame>
  );
}
