import { Link, Redirect } from 'wouter';
import { BrandLogo } from '@/components/brand-logo';
import { ConsoleThemeScope } from '@/components/app/console-frame';
import { Skeleton } from '@/components/ui/skeleton';
import { authClient } from '@/lib/owned-auth-client';
import { SecurityPanel } from '@/components/auth/security-panel';
import { useClerk } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import type { ReactNode } from 'react';

export function OwnedSessionGate({ children }: { children: ReactNode }) {
  const s = authClient.useSession();
  if (s.isPending) return <div className="mx-auto max-w-3xl space-y-3 p-10"><Skeleton className="h-10 w-64" /><Skeleton className="h-64 w-full" /></div>;
  if (!s.data?.user) return <Redirect to={(s as { mfaRequired?: boolean }).mfaRequired ? '/two-factor' : '/sign-in'} />;
  return <>{children}</>;
}

export default function AccountSecurityPage() {
  const { signOut } = useClerk();
  return (
    <OwnedSessionGate>
      <ConsoleThemeScope><div className="min-h-[100dvh]">
        <header className="border-b border-border bg-card">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2" data-testid="link-home"><BrandLogo size={36} /><span className="font-display text-xl">Account security</span></Link>
            <div className="flex gap-2"><Button asChild variant="ghost" size="sm"><Link href="/admin" data-testid="link-console">Console</Link></Button>
              <Button variant="ghost" size="sm" data-testid="button-signout" onClick={() => void signOut({ redirectUrl: '/' })}>Sign out</Button></div>
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-4 py-8"><SecurityPanel /></main>
      </div></ConsoleThemeScope>
    </OwnedSessionGate>
  );
}
