import { useState } from 'react';
import { useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { authClient } from '@/lib/owned-auth-client';
import { A, AuthFrame, ErrorLine, Field, Form, MailNotice, SuccessLine, Submit, authErrorText, isMailUnavailable, useOwnedStatus } from '@/components/auth/auth-ui';

export default function SignInPage() {
  const [, nav] = useLocation(); const qc = useQueryClient();
  const { status, failed } = useOwnedStatus();
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [needsVerify, setNeedsVerify] = useState(false); const [sent, setSent] = useState('');
  const submit = async () => {
    setBusy(true); setErr(''); setSent(''); setNeedsVerify(false);
    try {
      const r = await authClient.signIn.email({ email: email.trim(), password });
      if (r.error) { setNeedsVerify(r.error.code === 'EMAIL_NOT_VERIFIED'); setErr(authErrorText(r.error)); return; }
      qc.clear(); setPassword('');
      if ((r.data as { twoFactorRedirect?: boolean } | null)?.twoFactorRedirect) { nav('/two-factor'); return; }
      nav('/admin');
    } catch (e) { setErr(authErrorText(e as Error)); } finally { setBusy(false); }
  };
  const resend = async () => {
    setErr('');
    const r = await authClient.sendVerificationEmail({ email: email.trim(), callbackURL: `${import.meta.env.BASE_URL}verify-email?verified=1` });
    if (r.error) setErr(authErrorText(r.error)); else setSent('If the account exists, a new verification link is on its way.');
  };
  return (
    <AuthFrame title="Sign in to VYNOX LAYER" subtitle="Your VYNOX LAYER account" footer={<>New here? <A id="link-sign-up" href="/sign-up">Create an account</A></>}>
      <MailNotice status={status} failed={failed} />
      <Form onSubmit={submit}>
        <Field id="email" label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
        <Field id="password" label="Password" type="password" value={password} onChange={setPassword} autoComplete="current-password" />
        <ErrorLine>{err}</ErrorLine><SuccessLine>{sent}</SuccessLine>
        {needsVerify && !isMailUnavailable(null) && <button type="button" data-testid="button-resend-verification" onClick={() => void resend()} className="text-sm font-medium text-[#b4551f] hover:underline">Resend verification email</button>}
        <Submit id="button-sign-in" busy={busy} disabled={!email || !password}>Sign in</Submit>
      </Form>
      <div className="rounded-md border border-[#ddd5c4] bg-secondary px-3 py-2 text-center text-sm">Used VYNOX LAYER before? <A id="link-migrate" href="/migrate-account">Move your existing account</A></div>
      <div className="text-center text-sm"><A id="link-forgot" href="/forgot-password">Forgot your password?</A></div>
    </AuthFrame>
  );
}
