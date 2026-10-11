import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authClient } from '@/lib/owned-auth-client';
import { A, AuthFrame, ErrorLine, Field, Form, SuccessLine, Submit, authErrorText } from '@/components/auth/auth-ui';

export default function ResetPasswordPage() {
  const qc = useQueryClient();
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token') ?? '';
  const invalid = params.get('error') === 'INVALID_TOKEN' || !token;
  const [pw, setPw] = useState(''); const [confirm, setConfirm] = useState(''); const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [done, setDone] = useState(false);
  const submit = async () => {
    setErr('');
    if (pw.length < 8) { setErr('Use at least 8 characters.'); return; }
    if (pw !== confirm) { setErr('The passwords do not match.'); return; }
    setBusy(true);
    try {
      const r = await authClient.resetPassword({ newPassword: pw, token });
      if (r.error) { setErr(authErrorText(r.error)); return; }
      qc.clear(); setPw(''); setConfirm(''); setDone(true);
    } catch (e) { setErr(authErrorText(e as Error)); } finally { setBusy(false); }
  };
  return (
    <AuthFrame title="Choose a new password" footer={<A id="link-back-sign-in" href="/sign-in">Back to sign in</A>}>
      {invalid ? <><ErrorLine>This reset link is invalid or has expired.</ErrorLine><A id="link-request-new" href="/forgot-password">Request a new link</A></>
        : done ? <SuccessLine>Password updated. All other sessions were signed out. You can sign in now.</SuccessLine> : (
        <Form onSubmit={submit}>
          <Field id="new-password" label="New password" type="password" value={pw} onChange={setPw} autoComplete="new-password" />
          <Field id="confirm-password" label="Confirm new password" type="password" value={confirm} onChange={setConfirm} autoComplete="new-password" />
          <ErrorLine>{err}</ErrorLine>
          <Submit id="button-reset" busy={busy} disabled={!pw}>Update password</Submit>
        </Form>)}
    </AuthFrame>
  );
}
