import { withRequestDeadline } from '@workspace/api-client-react';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'wouter';
import { AlertCircle, CheckCircle2, MailWarning } from 'lucide-react';
import { BrandLogo } from '@/components/brand-logo';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ConsoleThemeScope } from '@/components/app/console-frame';
import { supabaseAuth, supabaseDevelopmentAuth } from '@/lib/owned-auth-client';
import { DEVELOPMENT_PASSWORD_HINT, newPasswordError } from '@/lib/password-policy';

/** Minimum length for newly chosen passwords. Sign-in never restricts length. */
export const MIN_PASSWORD = supabaseDevelopmentAuth ? 10 : supabaseAuth ? 12 : 8;
export const MAX_PASSWORD = 128;
export const PASSWORD_HINT = supabaseDevelopmentAuth ? DEVELOPMENT_PASSWORD_HINT : '12 to 128 characters.';
export const validateNewPassword = (value: string) => newPasswordError(value, supabaseDevelopmentAuth);

export type OwnedStatus = { enabled: boolean; mailReady: boolean };

export function useOwnedStatus() {
  const [status, setStatus] = useState<OwnedStatus | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const ac = new AbortController();
    withRequestDeadline(ac.signal, supabaseAuth ? 20000 : 0, async signal => {
      const r = await fetch(`${import.meta.env.BASE_URL.replace(/\/$/, '')}/api/${supabaseAuth ? 'supabase-auth' : 'owned-auth'}/status`, { credentials: 'include', signal });
      if (!r.ok) throw new Error('status');
      return r.json();
    })
      .then((j: OwnedStatus) => setStatus(j))
      .catch(() => { if (!ac.signal.aborted) setFailed(true); });
    return () => ac.abort();
  }, []);
  return { status, failed };
}

type AuthErr = { code?: string; message?: string; status?: number; retryAfterSeconds?: number } | null | undefined;
export function authErrorText(e: AuthErr): string {
  if (!e) return 'Something went wrong. Please try again.';
  const code = e.code ?? '';
  if (code === 'MAIL_UNAVAILABLE' || /MAIL_UNAVAILABLE/.test(e.message ?? '')) return 'Email delivery is not configured on this deployment, so we cannot send this message. An administrator must connect a mail provider first.';
  if (code === 'EMAIL_NOT_VERIFIED') return 'Verify your email address before signing in. Check your inbox or request a new link.';
  if (code === 'INVALID_EMAIL_OR_PASSWORD') return 'Email or password is incorrect.';
  if (code === 'INVALID_PASSWORD') return 'The password you entered is incorrect.';
  if (code === 'INVALID_TWO_FACTOR_COOKIE') return 'Your sign-in step expired. Sign in again.';
  if (code === 'INVALID_CODE' || code === 'INVALID_BACKUP_CODE') return 'That code is not valid.';
  if (code === 'EMAIL_LOGIN_RESTART') return (e.message ?? 'Request a new sign-in code in this browser tab.').replace(/^EMAIL_LOGIN_RESTART:\s*/, '');
  if (e.status === 429) return supabaseDevelopmentAuth
    ? typeof e.retryAfterSeconds === 'number' && Number.isFinite(e.retryAfterSeconds) && e.retryAfterSeconds > 0
      ? `Please wait ${Math.ceil(e.retryAfterSeconds)} seconds before trying again.`
      : e.message || 'Please wait 60 seconds before trying again.'
    : 'Too many attempts. Wait a moment and try again.';
  return e.message || 'Request failed. Please try again.';
}
export const isMailUnavailable = (e: AuthErr) => !!e && (e.code === 'MAIL_UNAVAILABLE' || /MAIL_UNAVAILABLE/.test(e.message ?? ''));

export function ErrorLine({ children, id }: { children?: ReactNode; id?: string }) {
  if (!children) return null;
  return <div role="alert" data-testid={id ?? 'text-auth-error'} className="flex gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{children}</span></div>;
}
export function SuccessLine({ children, id }: { children?: ReactNode; id?: string }) {
  if (!children) return null;
  return <div role="status" data-testid={id ?? 'text-auth-success'} className="flex gap-2 rounded-md border border-primary/25 bg-primary/5 px-3 py-2 text-sm text-primary"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /><span>{children}</span></div>;
}
export function MailNotice({ status, failed }: { status: OwnedStatus | null; failed: boolean }) {
  if (failed) return <ErrorLine id="text-status-error">Could not reach the authentication service. Reload to retry.</ErrorLine>;
  if (status && !status.enabled) return <ErrorLine id="text-owned-disabled">VYNOX LAYER account sign-in is not enabled on this deployment.</ErrorLine>;
  if (status && !status.mailReady) return <div data-testid="text-mail-unavailable" className="flex gap-2 rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground"><MailWarning className="mt-0.5 h-4 w-4 shrink-0 text-copper" /><span>Email delivery is not configured yet. Verification and password-reset emails cannot be sent until an administrator connects a mail provider. Verification is never bypassed.</span></div>;
  return null;
}

export function AuthFrame({ title, subtitle, children, footer, wide }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  return (
    <ConsoleThemeScope><div className="flex min-h-[100dvh] items-center justify-center px-4 py-10">
      <div className={`rise w-full ${wide ? 'max-w-3xl' : 'max-w-[440px]'}`}>
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[0_30px_80px_-40px_var(--s-glow)]">
          <div className="h-1.5 bg-gradient-to-r from-primary via-[var(--s-glow)] to-[var(--s-secondary)]" />
          <div className="space-y-6 p-7 sm:p-9">
            <div className="flex flex-col items-center gap-3 text-center">
              <Link href="/" className="block" data-testid="link-brand-home"><BrandLogo size={72} /></Link>
              <h1 className="font-display text-3xl leading-tight text-foreground" data-testid="text-auth-title">{title}</h1>
              {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
            </div>
            {children}
          </div>
        </div>
        {footer && <div className="mt-4 text-center text-sm text-muted-foreground">{footer}</div>}
      </div>
    </div></ConsoleThemeScope>
  );
}

export function Field({ id, label, type = 'text', value, onChange, autoComplete, hint, disabled, inputMode, maxLength }: { id: string; label: string; type?: string; value: string; onChange: (v: string) => void; autoComplete?: string; hint?: string; disabled?: boolean; inputMode?: 'numeric' | 'text'; maxLength?: number }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-foreground">{label}</Label>
      <Input id={id} data-testid={`input-${id}`} type={type} value={value} disabled={disabled} inputMode={inputMode} maxLength={maxLength} autoComplete={autoComplete} onChange={(e) => onChange(e.target.value)} className="border-input bg-white" />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function Form({ onSubmit, children }: { onSubmit: () => void | Promise<void>; children: ReactNode }) {
  return <form className="space-y-4" noValidate onSubmit={(e: FormEvent) => { e.preventDefault(); void onSubmit(); }}>{children}</form>;
}
export function Submit({ busy, children, id, disabled }: { busy?: boolean; children: ReactNode; id: string; disabled?: boolean }) {
  return <Button type="submit" data-testid={id} disabled={busy || disabled} className="w-full">{busy ? 'Working...' : children}</Button>;
}
export const A = ({ href, children, id }: { href: string; children: ReactNode; id: string }) => <Link href={href} data-testid={id} className="font-medium text-[var(--s-accent-ink,hsl(var(--primary)))] hover:underline">{children}</Link>;
