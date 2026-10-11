import { useState } from 'react';
import { authClient } from '@/lib/owned-auth-client';
import { A, AuthFrame, ErrorLine, Field, Form, MailNotice, SuccessLine, Submit, authErrorText, useOwnedStatus } from '@/components/auth/auth-ui';

export default function ForgotPasswordPage() {
  const { status, failed } = useOwnedStatus();
  const [email, setEmail] = useState(''); const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [sent, setSent] = useState(false);
  const submit = async () => {
    setBusy(true); setErr('');
    try {
      const r = await authClient.requestPasswordReset({ email: email.trim(), redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}reset-password` });
      if (r.error) setErr(authErrorText(r.error)); else setSent(true);
    } catch (e) { setErr(authErrorText(e as Error)); } finally { setBusy(false); }
  };
  return (
    <AuthFrame title="Reset your password" subtitle="We will email a single-use link. Resetting signs you out everywhere." footer={<A id="link-back-sign-in" href="/sign-in">Back to sign in</A>}>
      <MailNotice status={status} failed={failed} />
      {sent ? <SuccessLine>If an account exists for that address, a reset link has been sent.</SuccessLine> : (
        <Form onSubmit={submit}>
          <Field id="email" label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
          <ErrorLine>{err}</ErrorLine>
          <Submit id="button-send-reset" busy={busy} disabled={!email}>Send reset link</Submit>
        </Form>)}
    </AuthFrame>
  );
}
