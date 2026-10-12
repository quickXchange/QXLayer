import { useCallback, useEffect, useState } from 'react';
import { Link } from 'wouter';
import QRCode from 'react-qr-code';
import { Link2, Monitor, ShieldCheck } from 'lucide-react';
import { authClient } from '@/lib/owned-auth-client';
import { Button } from '@/components/ui/button';
import { ErrorLine, Field, Form, SuccessLine, Submit, authErrorText } from '@/components/auth/auth-ui';

function Section({ title, desc, children, id }: { title: string; desc?: string; children: React.ReactNode; id: string }) {
  return (
    <section data-testid={`section-${id}`} className="rounded-xl border border-border bg-card p-5 sm:p-6">
      <h2 className="font-display text-2xl">{title}</h2>
      {desc && <p className="mt-1 text-sm text-muted-foreground">{desc}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function ProfileForm({ name: initial }: { name: string }) {
  const [name, setName] = useState(initial); const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [ok, setOk] = useState('');
  const save = async () => {
    setBusy(true); setErr(''); setOk('');
    try { const r = await authClient.updateUser({ name: name.trim() }); if (r.error) setErr(authErrorText(r.error)); else setOk('Profile updated.'); }
    catch (e) { setErr(authErrorText(e as Error)); } finally { setBusy(false); }
  };
  return <Form onSubmit={save}><Field id="profile-name" label="Display name" value={name} onChange={setName} autoComplete="name" /><ErrorLine>{err}</ErrorLine><SuccessLine>{ok}</SuccessLine><Submit id="button-save-profile" busy={busy} disabled={!name.trim()}>Save profile</Submit></Form>;
}

function PasswordForm() {
  const [cur, setCur] = useState(''); const [pw, setPw] = useState(''); const [confirm, setConfirm] = useState(''); const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [ok, setOk] = useState('');
  useEffect(() => () => { setCur(''); setPw(''); setConfirm(''); }, []);
  const save = async () => {
    setErr(''); setOk('');
    if (pw.length < 8) { setErr('Use at least 8 characters.'); return; }
    if (pw !== confirm) { setErr('The passwords do not match.'); return; }
    setBusy(true);
    try {
      const r = await authClient.changePassword({ currentPassword: cur, newPassword: pw, revokeOtherSessions: true });
      if (r.error) { setErr(authErrorText(r.error)); return; }
      setCur(''); setPw(''); setConfirm(''); setOk('Password changed. Other sessions were signed out.');
    } catch (e) { setErr(authErrorText(e as Error)); } finally { setBusy(false); }
  };
  return <Form onSubmit={save}>
    <Field id="current-password" label="Current password" type="password" value={cur} onChange={setCur} autoComplete="current-password" />
    <Field id="change-new-password" label="New password" type="password" value={pw} onChange={setPw} autoComplete="new-password" />
    <Field id="change-confirm-password" label="Confirm new password" type="password" value={confirm} onChange={setConfirm} autoComplete="new-password" />
    <ErrorLine>{err}</ErrorLine><SuccessLine>{ok}</SuccessLine>
    <Submit id="button-change-password" busy={busy} disabled={!cur || !pw}>Change password</Submit>
  </Form>;
}

function Codes({ codes }: { codes: string[] }) {
  return <div data-testid="list-backup-codes" className="grid grid-cols-2 gap-2 rounded-md border border-input bg-popover p-3 font-mono text-sm sm:grid-cols-3">{codes.map((c) => <span key={c}>{c}</span>)}</div>;
}

function TwoFactor({ enabled, onChanged }: { enabled: boolean; onChanged: () => void }) {
  const [mode, setMode] = useState<'idle' | 'enroll' | 'disable' | 'regen'>('idle');
  const [pw, setPw] = useState(''); const [code, setCode] = useState('');
  const [uri, setUri] = useState(''); const [codes, setCodes] = useState<string[]>([]);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [ok, setOk] = useState('');
  const clear = useCallback(() => { setPw(''); setCode(''); setUri(''); setCodes([]); }, []);
  useEffect(() => clear, [clear]);
  const reset = () => { clear(); setMode('idle'); setErr(''); };
  const run = async (fn: () => Promise<void>) => { setBusy(true); setErr(''); setOk(''); try { await fn(); } catch (e) { setErr(authErrorText(e as Error)); } finally { setBusy(false); } };
  const start = () => run(async () => {
    const r = await authClient.twoFactor.enable({ password: pw, issuer: 'VYNOX LAYER' });
    if (r.error) { setErr(authErrorText(r.error)); return; }
    const d = r.data as { totpURI?: string; backupCodes?: string[] };
    if (!d.totpURI) { setErr('Authenticator setup is unavailable.'); return; }
    setPw(''); setUri(d.totpURI); setCodes(d.backupCodes ?? []);
  });
  const verify = () => run(async () => {
    const r = await authClient.twoFactor.verifyTotp({ code: code.replace(/\s/g, '') });
    if (r.error) { setErr(authErrorText(r.error)); return; }
    setCode(''); setUri(''); setOk('Two-factor authentication is on. Save your backup codes now; they are shown once.'); onChanged();
  });
  const disable = () => run(async () => {
    const r = await authClient.twoFactor.disable({ password: pw });
    if (r.error) { setErr(authErrorText(r.error)); return; }
    clear(); setMode('idle'); setOk('Two-factor authentication is off.'); onChanged();
  });
  const regen = () => run(async () => {
    const r = await authClient.twoFactor.generateBackupCodes({ password: pw });
    if (r.error) { setErr(authErrorText(r.error)); return; }
    setPw(''); setCodes(r.data.backupCodes); setOk('New backup codes generated. Old codes no longer work.');
  });
  const showEnrolled = enabled && codes.length > 0 && !uri;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm" data-testid="status-2fa"><ShieldCheck className={`h-4 w-4 ${enabled ? 'text-primary' : 'text-muted-foreground'}`} />{enabled ? 'Enabled' : 'Not enabled. Required before administrator access.'}</div>
      <SuccessLine>{ok}</SuccessLine>
      {showEnrolled && <><Codes codes={codes} /><Button data-testid="button-codes-saved" variant="outline" onClick={reset}>I have saved these codes</Button></>}
      {mode === 'idle' && !showEnrolled && (
        <div className="flex flex-wrap gap-2">
          {!enabled && <Button data-testid="button-enable-2fa" onClick={() => { setMode('enroll'); setOk(''); }}>Set up authenticator</Button>}
          {enabled && <><Button data-testid="button-regen-codes" variant="outline" onClick={() => { setMode('regen'); setOk(''); }}>Regenerate backup codes</Button>
            <Button data-testid="button-disable-2fa" variant="outline" onClick={() => { setMode('disable'); setOk(''); }}>Turn off</Button></>}
        </div>)}
      {mode === 'enroll' && !uri && <Form onSubmit={start}><Field id="2fa-password" label="Confirm your password" type="password" value={pw} onChange={setPw} autoComplete="current-password" /><ErrorLine>{err}</ErrorLine><div className="flex gap-2"><Submit id="button-start-2fa" busy={busy} disabled={!pw}>Continue</Submit><Button type="button" variant="ghost" onClick={reset}>Cancel</Button></div></Form>}
      {mode === 'enroll' && uri && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Scan this QR code with an authenticator app, then enter the 6-digit code. It is rendered locally and never leaves this page.</p>
          <div className="inline-block rounded-md border border-input bg-popover p-3" data-testid="img-totp-qr"><QRCode value={uri} size={176} /></div>
          <details data-testid="details-setup-key" className="text-sm">
            <summary className="cursor-pointer">Can’t scan the QR code?</summary>
            <p className="mt-2 text-muted-foreground">Enter this setup key in your authenticator. Do not share it.</p>
            <code data-testid="text-totp-setup-key" className="mt-2 block break-all rounded border p-3">{new URL(uri).searchParams.get('secret')}</code>
          </details>
          <div><p className="mb-2 text-sm font-medium">Backup codes</p><Codes codes={codes} /></div>
          <Form onSubmit={verify}><Field id="2fa-code" label="6-digit code" value={code} onChange={setCode} inputMode="numeric" maxLength={8} autoComplete="one-time-code" /><ErrorLine>{err}</ErrorLine><div className="flex gap-2"><Submit id="button-verify-2fa" busy={busy} disabled={!code}>Verify and enable</Submit><Button type="button" variant="ghost" onClick={reset}>Cancel</Button></div></Form>
        </div>)}
      {(mode === 'disable' || mode === 'regen') && (
        <Form onSubmit={mode === 'disable' ? disable : regen}>
          <Field id="2fa-action-password" label="Confirm your password" type="password" value={pw} onChange={setPw} autoComplete="current-password" />
          <ErrorLine>{err}</ErrorLine>
          {mode === 'regen' && codes.length > 0 && <Codes codes={codes} />}
          <div className="flex gap-2"><Submit id="button-confirm-2fa-action" busy={busy} disabled={!pw}>{mode === 'disable' ? 'Turn off two-factor' : 'Generate new codes'}</Submit><Button type="button" variant="ghost" data-testid="button-cancel-2fa" onClick={reset}>{codes.length ? 'Done' : 'Cancel'}</Button></div>
        </Form>)}
    </div>
  );
}

type Sess = { id: string; token: string; userAgent?: string | null; ipAddress?: string | null; createdAt: string | Date };
function Sessions({ currentToken }: { currentToken?: string }) {
  const [list, setList] = useState<Sess[] | null>(null); const [err, setErr] = useState(''); const [busy, setBusy] = useState('');
  const load = useCallback(async () => {
    try { const r = await authClient.listSessions(); if (r.error) setErr(authErrorText(r.error)); else { setErr(''); setList(r.data as Sess[]); } }
    catch (e) { setErr(authErrorText(e as Error)); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const act = async (key: string, fn: () => Promise<{ error?: unknown } | undefined>) => {
    setBusy(key); setErr('');
    try { const r = await fn(); if (r?.error) setErr(authErrorText(r.error as { message?: string })); else await load(); }
    catch (e) { setErr(authErrorText(e as Error)); } finally { setBusy(''); }
  };
  return (
    <div className="space-y-3">
      <ErrorLine>{err}</ErrorLine>
      {!list && !err && <p className="text-sm text-muted-foreground">Loading sessions...</p>}
      {list?.map((s) => (
        <div key={s.id} data-testid={`row-session-${s.id}`} className="flex items-center justify-between gap-3 rounded-md border border-border bg-popover px-3 py-2">
          <div className="flex min-w-0 items-center gap-3"><Monitor className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 text-sm"><p className="truncate">{s.userAgent || 'Unknown device'}{s.token === currentToken && <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">This device</span>}</p>
              <p className="text-xs text-muted-foreground">{s.ipAddress || 'IP unavailable'} - {new Date(s.createdAt).toLocaleString()}</p></div></div>
          {s.token !== currentToken && <Button size="sm" variant="outline" data-testid={`button-revoke-${s.id}`} disabled={busy === s.id} onClick={() => void act(s.id, () => authClient.revokeSession({ token: s.token }))}>Revoke</Button>}
        </div>))}
      {list && list.length > 1 && <Button variant="outline" data-testid="button-revoke-others" disabled={busy === 'others'} onClick={() => void act('others', () => authClient.revokeOtherSessions())}>Sign out all other sessions</Button>}
    </div>
  );
}

export function SecurityPanel() {
  const s = authClient.useSession();
  const user = s.data?.user as { name?: string; email?: string; twoFactorEnabled?: boolean | null } | undefined;
  if (!user) return null;
  return (
    <div className="space-y-5" data-testid="panel-security">
      <div><p className="text-xs uppercase tracking-widest text-copper">Signed in as</p><p className="font-display text-3xl" data-testid="text-account-email">{user.email}</p></div>
      <Section id="profile" title="Profile"><ProfileForm name={user.name ?? ''} /></Section>
      <Section id="password" title="Password" desc="Changing it signs out every other session."><PasswordForm /></Section>
      <Section id="two-factor" title="Two-factor authentication" desc="Authenticator app (TOTP) with one-time backup codes. Required for super administrator access."><TwoFactor enabled={!!user.twoFactorEnabled} onChanged={() => void s.refetch()} /></Section>
      <Section id="sessions" title="Active sessions"><Sessions currentToken={s.data?.session?.token} /></Section>
      <Section id="migration" title="Link an existing VYNOX LAYER account" desc="One-time migration for people who already used the previous sign-in. It cannot copy your old password.">
        <Button asChild variant="outline"><Link href="/account/link-existing" data-testid="link-existing-account"><Link2 className="mr-2 h-4 w-4" />Link existing account</Link></Button>
      </Section>
    </div>
  );
}
