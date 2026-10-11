import { useState } from 'react';
import { authClient } from '@/lib/owned-auth-client';
import { A, AuthFrame, ErrorLine, Field, Form, MailNotice, SuccessLine, Submit, authErrorText, useOwnedStatus } from '@/components/auth/auth-ui';

export default function SignUpPage() {
  const { status, failed } = useOwnedStatus();
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [done, setDone] = useState(false);
  const submit = async () => {
    setErr('');
    if (password.length < 8) { setErr('Use at least 8 characters for your password.'); return; }
    if (password !== confirm) { setErr('The passwords do not match.'); return; }
    setBusy(true);
    try {
      const r = await authClient.signUp.email({ name: name.trim(), email: email.trim(), password, callbackURL: `${import.meta.env.BASE_URL}verify-email?verified=1` });
      if (r.error) { setErr(authErrorText(r.error)); return; }
      setPassword(''); setConfirm(''); setDone(true);
    } catch (e) { setErr(authErrorText(e as Error)); } finally { setBusy(false); }
  };
  return (
    <AuthFrame title="Create a VYNOX LAYER account" subtitle="Configure and request your White Label Exchange" footer={<>Already registered? <A id="link-sign-in" href="/sign-in">Sign in</A></>}>
      <MailNotice status={status} failed={failed} />
      {done ? <div className="space-y-3"><SuccessLine>Account created. Open the verification link we emailed to {email} before signing in.</SuccessLine><A id="link-to-sign-in" href="/sign-in">Continue to sign in</A></div> : (
        <Form onSubmit={submit}>
          <Field id="name" label="Full name" value={name} onChange={setName} autoComplete="name" />
          <Field id="email" label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
          <Field id="password" label="Password" type="password" value={password} onChange={setPassword} autoComplete="new-password" hint="At least 8 characters." />
          <Field id="confirm" label="Confirm password" type="password" value={confirm} onChange={setConfirm} autoComplete="new-password" />
          <ErrorLine>{err}</ErrorLine>
          <Submit id="button-sign-up" busy={busy} disabled={!name || !email || !password}>Create account</Submit>
        </Form>)}
    </AuthFrame>
  );
}
