import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import QRCode from 'react-qr-code';
import { Link2, ShieldCheck } from 'lucide-react';
import { authClient } from '@/lib/owned-auth-client';
import { supabaseMfa, refreshSupabaseSession, useSupabaseSessionState } from '@/lib/supabase-auth-client';
import { Button } from '@/components/ui/button';
import { ErrorLine, Field, Form, SuccessLine, Submit, authErrorText, MIN_PASSWORD, MAX_PASSWORD } from '@/components/auth/auth-ui';

function Section({ title, desc, children, id }: { title: string; desc?: string; children: React.ReactNode; id: string }) {
  return (
    <section data-testid={`section-${id}`} className="rounded-xl border border-border bg-card p-5 sm:p-6">
      <h2 className="font-display text-2xl">{title}</h2>
      {desc && <p className="mt-1 text-sm text-muted-foreground">{desc}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function PasswordForm() {
  const [cur, setCur] = useState(''); const [pw, setPw] = useState(''); const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [ok, setOk] = useState('');
  useEffect(() => () => { setCur(''); setPw(''); setConfirm(''); }, []);
  const save = async () => {
    setErr(''); setOk('');
    if (pw.length < MIN_PASSWORD || pw.length > MAX_PASSWORD) { setErr(`Use ${MIN_PASSWORD} to ${MAX_PASSWORD} characters.`); return; }
    if (pw !== confirm) { setErr('The passwords do not match.'); return; }
    setBusy(true);
    try {
      const r = await authClient.changePassword({ currentPassword: cur, newPassword: pw, revokeOtherSessions: true });
      if (r.error) { setErr(authErrorText(r.error)); return; }
      setCur(''); setPw(''); setConfirm(''); setOk('Password changed.');
    } catch (e) { setErr(authErrorText(e as Error)); } finally { setBusy(false); }
  };
  return <Form onSubmit={save}>
    <Field id="current-password" label="Current password" type="password" value={cur} onChange={setCur} autoComplete="current-password" />
    <Field id="change-new-password" label="New password" type="password" value={pw} onChange={setPw} autoComplete="new-password" hint={`${MIN_PASSWORD} to ${MAX_PASSWORD} characters.`} />
    <Field id="change-confirm-password" label="Confirm new password" type="password" value={confirm} onChange={setConfirm} autoComplete="new-password" />
    <ErrorLine>{err}</ErrorLine><SuccessLine>{ok}</SuccessLine>
    <Submit id="button-change-password" busy={busy} disabled={!cur || !pw}>Change password</Submit>
  </Form>;
}

type Enrollment = { factorId: string; totpUri: string; secret?: string };

function TwoFactor({ enabled }: { enabled: boolean }) {
  const hasFactor = !!useSupabaseSessionState().session?.user?.totpFactorId;
  const [mode, setMode] = useState<'idle' | 'enroll' | 'remove'>('idle');
  const [pw, setPw] = useState(''); const [code, setCode] = useState('');
  const [enr, setEnr] = useState<Enrollment | null>(null);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [ok, setOk] = useState('');
  const clear = () => { setPw(''); setCode(''); setEnr(null); };
  useEffect(() => clear, []);
  const reset = () => { clear(); setMode('idle'); setErr(''); };
  const run = async (fn: () => Promise<void>) => { setBusy(true); setErr(''); setOk(''); try { await fn(); } catch (e) { setErr(authErrorText(e as Error)); } finally { setBusy(false); } };
  const start = () => run(async () => {
    const r = await supabaseMfa.enroll(pw);
    if (r.error) { setErr(authErrorText(r.error)); return; }
    const d = r.data;
    if (!d?.totpUri || !d.factorId) { setErr('Authenticator setup is unavailable.'); return; }
    setPw(''); setEnr({ factorId: d.factorId, totpUri: d.totpUri, secret: d.secret });
  });
  const verify = () => run(async () => {
    const r = await supabaseMfa.verify(code.replace(/\s/g, ''), enr?.factorId);
    if (r.error) { setErr(authErrorText(r.error)); return; }
    clear(); setMode('idle'); setOk('Two-factor authentication is on.');
  });
  const remove = () => run(async () => {
    const s = await refreshSupabaseSession(false);
    const fid = s?.user?.totpFactorId;
    if (!fid) { setErr('No authenticator is set up on this account.'); return; }
    const r = await supabaseMfa.remove({ currentPassword: pw, factorId: fid, code: code.replace(/\s/g, '') });
    if (r.error) { setErr(authErrorText(r.error)); return; }
    clear(); setMode('idle'); setOk('Two-factor authentication is off.');
  });
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm" data-testid="status-2fa" role="status"><ShieldCheck className={`h-4 w-4 ${enabled ? 'text-primary' : 'text-muted-foreground'}`} />{enabled ? 'Enabled' : 'Not enabled. Required before administrator access.'}</div>
      <SuccessLine>{ok}</SuccessLine>
      {mode === 'idle' && <div className="flex flex-wrap gap-2">
        {!enabled && <Button data-testid="button-enable-2fa" onClick={() => { setMode('enroll'); setOk(''); }}>Set up authenticator</Button>}
        {enabled && !hasFactor && <p className="text-xs text-muted-foreground" data-testid="text-no-factor">No authenticator is linked to this account.</p>}
        {enabled && <Button data-testid="button-disable-2fa" variant="outline" disabled={!hasFactor} onClick={() => { setMode('remove'); setOk(''); }}>Turn off</Button>}
      </div>}
      {mode === 'enroll' && !enr && <Form onSubmit={start}><Field id="2fa-password" label="Confirm your password" type="password" value={pw} onChange={setPw} autoComplete="current-password" /><ErrorLine>{err}</ErrorLine><div className="flex gap-2"><Submit id="button-start-2fa" busy={busy} disabled={!pw}>Continue</Submit><Button type="button" variant="ghost" onClick={reset}>Cancel</Button></div></Form>}
      {mode === 'enroll' && enr && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Scan this QR code with an authenticator app, then enter the 6-digit code.</p>
          <div className="inline-block rounded-md border border-input bg-white p-3" data-testid="img-totp-qr"><QRCode value={enr.totpUri} size={176} /></div>
          <details data-testid="details-setup-key" className="text-sm">
            <summary className="cursor-pointer">Can’t scan the QR code?</summary>
            <p className="mt-2 text-muted-foreground">Enter this setup key in your authenticator. Do not share it.</p>
            <code data-testid="text-totp-setup-key" className="mt-2 block break-all rounded border p-3">{enr.secret ?? new URL(enr.totpUri).searchParams.get('secret')}</code>
          </details>
          <p className="text-xs text-muted-foreground">Authenticator apps only. Backup codes are not available, so keep access to this authenticator.</p>
          <Form onSubmit={verify}><Field id="2fa-code" label="6-digit code" value={code} onChange={setCode} inputMode="numeric" maxLength={6} autoComplete="one-time-code" /><ErrorLine>{err}</ErrorLine><div className="flex gap-2"><Submit id="button-verify-2fa" busy={busy} disabled={code.replace(/\s/g, '').length !== 6}>Verify and enable</Submit><Button type="button" variant="ghost" onClick={reset}>Cancel</Button></div></Form>
        </div>)}
      {mode === 'remove' && (
        <Form onSubmit={remove}>
          <p className="text-sm text-muted-foreground">Removing your authenticator requires your password and a current code from it. You must be signed in with two-step verification.</p>
          <Field id="2fa-action-password" label="Confirm your password" type="password" value={pw} onChange={setPw} autoComplete="current-password" />
          <Field id="2fa-action-code" label="6-digit code" value={code} onChange={setCode} inputMode="numeric" maxLength={6} autoComplete="one-time-code" />
          <ErrorLine>{err}</ErrorLine>
          <div className="flex gap-2"><Submit id="button-confirm-2fa-action" busy={busy} disabled={!pw || code.replace(/\s/g, '').length !== 6}>Turn off two-factor</Submit><Button type="button" variant="ghost" data-testid="button-cancel-2fa" onClick={reset}>Cancel</Button></div>
        </Form>)}
    </div>
  );
}

export function SupabaseSecurityPanel() {
  const s = authClient.useSession();
  const user = s.data?.user as { name?: string; email?: string; twoFactorEnabled?: boolean | null } | undefined;
  if (!user) return null;
  return (
    <div className="space-y-5" data-testid="panel-security">
      <div><p className="text-xs uppercase tracking-widest text-copper">Signed in as</p><p className="font-display text-3xl" data-testid="text-account-email">{user.email}</p>{user.name && <p className="text-sm text-muted-foreground" data-testid="text-account-name">{user.name}</p>}</div>
      <Section id="password" title="Password" desc="Use 12 to 128 characters."><PasswordForm /></Section>
      <Section id="two-factor" title="Two-factor authentication" desc="Authenticator app (TOTP). Required for super administrator access."><TwoFactor enabled={!!user.twoFactorEnabled} /></Section>
      <Section id="migration" title="Link an existing VYNOX LAYER account" desc="Your existing IDs and access are preserved. Linking needs a separate proof-approved step and is never matched by email address.">
        <Button asChild variant="outline"><Link href="/account/link-existing" data-testid="link-existing-account"><Link2 className="mr-2 h-4 w-4" />Link existing account</Link></Button>
      </Section>
    </div>
  );
}
