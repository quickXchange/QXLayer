import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { authClient, supabaseAuth } from '@/lib/owned-auth-client';
import { supabaseMfa } from '@/lib/supabase-auth-client';
import { signInDestination } from '@/lib/existing-account-link';
import { A, AuthFrame, ErrorLine, Field, Form, Submit, authErrorText } from '@/components/auth/auth-ui';

export default function TwoFactorPage() {
  const [, nav] = useLocation(); const qc = useQueryClient();
  const [backupMode, setBackup] = useState(false); const [code, setCode] = useState(''); const [trust, setTrust] = useState(false);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  // Supabase supports authenticator TOTP only: no backup codes, no trusted devices.
  const backup = backupMode && !supabaseAuth;
  useEffect(() => () => setCode(''), []);
  const submit = async () => {
    setBusy(true); setErr('');
    try {
      const c = code.replace(/\s/g, '');
      const r = supabaseAuth ? await supabaseMfa.verify(c)
        : backup ? await authClient.twoFactor.verifyBackupCode({ code: c, trustDevice: trust }) : await authClient.twoFactor.verifyTotp({ code: c, trustDevice: trust });
      if (r.error) { setErr(authErrorText(r.error)); return; }
      qc.clear(); setCode(''); nav(supabaseAuth ? signInDestination(window.location.search) : '/admin');
    } catch (e) { setErr(authErrorText(e as Error)); } finally { setBusy(false); }
  };
  return (
    <AuthFrame title="Two-step verification" subtitle={backup ? 'Enter one of your unused backup codes.' : 'Enter the 6-digit code from your authenticator app.'} footer={<A id="link-back-sign-in" href="/sign-in">Back to sign in</A>}>
      <Form onSubmit={submit}>
        <Field id="code" label={backup ? 'Backup code' : 'Authenticator code'} value={code} onChange={setCode} autoComplete="one-time-code" inputMode={backup ? 'text' : 'numeric'} maxLength={backup ? 24 : supabaseAuth ? 6 : 8} />
        {!supabaseAuth && <label className="flex items-center gap-2 text-sm text-muted-foreground"><input data-testid="checkbox-trust" type="checkbox" checked={trust} onChange={(e) => setTrust(e.target.checked)} /> Trust this device</label>}
        <ErrorLine>{err}</ErrorLine>
        <Submit id="button-verify" busy={busy} disabled={!code}>Verify</Submit>
      </Form>
      {!supabaseAuth && <button type="button" data-testid="button-toggle-backup" onClick={() => { setBackup(!backupMode); setCode(''); setErr(''); }} className="block w-full text-center text-sm font-medium text-[var(--s-accent-ink,hsl(var(--primary)))] hover:underline">{backup ? 'Use authenticator app instead' : 'Use a backup code'}</button>}
    </AuthFrame>
  );
}
