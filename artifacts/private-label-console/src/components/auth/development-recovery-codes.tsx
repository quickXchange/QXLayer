import { useState } from 'react';
import { supabaseMfa, useSupabaseSessionState } from '@/lib/supabase-auth-client';
import { Button } from '@/components/ui/button';
import { ErrorLine, Field, Form, Submit, authErrorText } from './auth-ui';

export function DevelopmentRecoveryCodes() {
  const { session } = useSupabaseSessionState();
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!session?.user?.twoFactorEnabled || session.mfaRequired) return (
    <p className="text-sm text-muted-foreground">Enable and verify two-factor authentication before generating recovery codes.</p>
  );
  const generate = async () => {
    if (!confirmed) return;
    setBusy(true); setError('');
    try {
      const r = await supabaseMfa.generateRecoveryCodes(password, code.replace(/\s/g, ''));
      if (r.error) { setError(authErrorText(r.error)); return; }
      if (!r.data?.recoveryCodes?.length) { setError('No recovery codes were returned. Check Account Security before retrying.'); return; }
      setCodes(r.data.recoveryCodes); setPassword(''); setCode(''); setConfirmed(false);
    } catch (e) { setError(authErrorText(e as Error)); } finally { setBusy(false); }
  };
  return <div className="space-y-4" data-testid="development-recovery-codes">
    <p className="text-sm">{session.recoveryCodesRemaining ?? 0} unused codes available for your current authenticator.</p>
    <p className="text-sm text-muted-foreground">Store these privately in your password manager. A code plus your password can reset a lost authenticator. Each code works once. Recovery signs out every session and requires new 2FA setup before Super Admin access. No email matching or new Owner record is used.</p>
    {codes ? <>
      <p className="text-sm font-medium">Shown only now. Save them before hiding this list; the server stores hashes, not these codes.</p>
      <pre data-testid="recovery-codes" className="select-text overflow-x-auto rounded-lg bg-muted p-3 text-xs leading-6">{codes.join('\n')}</pre>
      <Button type="button" data-testid="button-hide-recovery-codes" onClick={() => setCodes(null)}>I saved my codes — hide them</Button>
    </> : <Form onSubmit={generate}>
      <Field id="recovery-password" label="Confirm current password" type="password" value={password} onChange={setPassword} autoComplete="current-password" />
      <Field id="recovery-totp" label="Fresh authenticator code" value={code} onChange={setCode} inputMode="numeric" maxLength={6} autoComplete="one-time-code" />
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" data-testid="checkbox-replace-recovery-codes" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} /><span>Replace any previous recovery codes. The old codes will stop working.</span></label>
      <ErrorLine>{error}</ErrorLine>
      <Submit id="button-generate-recovery-codes" busy={busy} disabled={!confirmed || !password || code.length !== 6}>Generate 10 recovery codes</Submit>
    </Form>}
  </div>;
}
