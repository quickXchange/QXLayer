import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { supabaseDevelopmentAuth } from '@/lib/owned-auth-client';
import { supabaseMfa } from '@/lib/supabase-auth-client';
import { A, AuthFrame, ErrorLine, Field, Form, Submit, authErrorText } from '@/components/auth/auth-ui';

export default function TwoFactorPage() {
  const [, nav] = useLocation();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const [lost, setLost] = useState(false); const [pw, setPw] = useState(''); const [confirmReset, setConfirmReset] = useState(false);
  useEffect(() => () => setCode(''), []);
  const submit = async () => {
    setBusy(true); setErr('');
    try {
      const c = code.replace(/\s/g, '');
      const r = await supabaseMfa.verify(c);
      if (r.error) { setErr(authErrorText(r.error)); return; }
      setCode(''); nav('/admin', { replace: true });
    } catch (e) { setErr(authErrorText(e as Error)); } finally { setBusy(false); }
  };
  return (
    <AuthFrame title={lost ? 'Recover a lost authenticator' : 'Two-step verification'} subtitle={lost ? 'Use a recovery code you saved earlier and confirm your password.' : 'Enter the 6-digit code from your authenticator app.'} footer={<A id="link-back-sign-in" href="/sign-in">Back to sign in</A>}>
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
        <Field id="code" label="Authenticator code" value={code} onChange={setCode} autoComplete="one-time-code" inputMode="numeric" maxLength={6} />
        <ErrorLine>{err}</ErrorLine>
        <Submit id="button-verify" busy={busy} disabled={!code}>Verify</Submit>
      </Form>}
      {supabaseDevelopmentAuth && <button type="button" disabled={busy} data-testid="button-toggle-authenticator-recovery" className="block w-full text-center text-sm font-medium hover:underline"
        onClick={() => { setLost(!lost); setCode(''); setPw(''); setErr(''); setConfirmReset(false); }}>{lost ? 'Use authenticator app instead' : 'Lost your authenticator? Use a saved recovery code'}</button>}
    </AuthFrame>
  );
}
