import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { authClient, supabaseAuth, supabaseDevelopmentAuth } from '@/lib/owned-auth-client';
import { supabaseMfa } from '@/lib/supabase-auth-client';
import { signInDestination } from '@/lib/existing-account-link';
import { A, AuthFrame, ErrorLine, Field, Form, Submit, authErrorText } from '@/components/auth/auth-ui';

export default function TwoFactorPage() {
  const [, nav] = useLocation(); const qc = useQueryClient();
  const [backupMode, setBackup] = useState(false); const [code, setCode] = useState(''); const [trust, setTrust] = useState(false);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const [lost, setLost] = useState(false); const [pw, setPw] = useState(''); const [confirmReset, setConfirmReset] = useState(false);
  // Development recovery is explicitly separate from Staging TOTP and legacy backup-code verification.
  const backup = backupMode && !supabaseAuth;
  useEffect(() => () => setCode(''), []);
  const submit = async () => {
    setBusy(true); setErr('');
    try {
      const c = code.replace(/\s/g, '');
      const r = supabaseAuth ? await supabaseMfa.verify(c)
        : backup ? await authClient.twoFactor.verifyBackupCode({ code: c, trustDevice: trust }) : await authClient.twoFactor.verifyTotp({ code: c, trustDevice: trust });
      if (r.error) { setErr(authErrorText(r.error)); return; }
      if (!supabaseAuth) qc.clear();
      setCode(''); nav(supabaseAuth ? signInDestination(window.location.search) : '/admin', { replace: supabaseAuth });
    } catch (e) { setErr(authErrorText(e as Error)); } finally { setBusy(false); }
  };
  return (
    <AuthFrame title={lost ? 'Recover a lost authenticator' : 'Two-step verification'} subtitle={lost ? 'Use a recovery code you saved earlier and confirm your password.' : backup ? 'Enter one of your unused backup codes.' : 'Enter the 6-digit code from your authenticator app.'} footer={<A id="link-back-sign-in" href="/sign-in">Back to sign in</A>}>
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
        <Field id="code" label={backup ? 'Backup code' : 'Authenticator code'} value={code} onChange={setCode} autoComplete="one-time-code" inputMode={backup ? 'text' : 'numeric'} maxLength={backup ? 24 : supabaseAuth ? 6 : 8} />
        {!supabaseAuth && <label className="flex items-center gap-2 text-sm text-muted-foreground"><input data-testid="checkbox-trust" type="checkbox" checked={trust} onChange={(e) => setTrust(e.target.checked)} /> Trust this device</label>}
        <ErrorLine>{err}</ErrorLine>
        <Submit id="button-verify" busy={busy} disabled={!code}>Verify</Submit>
      </Form>}
      {supabaseDevelopmentAuth && <button type="button" disabled={busy} data-testid="button-toggle-authenticator-recovery" className="block w-full text-center text-sm font-medium hover:underline"
        onClick={() => { setLost(!lost); setCode(''); setPw(''); setErr(''); setConfirmReset(false); }}>{lost ? 'Use authenticator app instead' : 'Lost your authenticator? Use a saved recovery code'}</button>}
      {!supabaseAuth && <button type="button" data-testid="button-toggle-backup" onClick={() => { setBackup(!backupMode); setCode(''); setErr(''); }} className="block w-full text-center text-sm font-medium text-[var(--s-accent-ink,hsl(var(--primary)))] hover:underline">{backup ? 'Use authenticator app instead' : 'Use a backup code'}</button>}
    </AuthFrame>
  );
}
