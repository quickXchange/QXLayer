import { useClerk } from '@clerk/react';
import { useQueryClient } from '@tanstack/react-query';
import { getGetCurrentPrincipalQueryKey } from '@workspace/api-client-react';
import { KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/app/shell';
import { usePrincipal } from '@/lib/principal';

export default function Unassigned() {
  const { signOut } = useClerk();
  const qc = useQueryClient();
  const p = usePrincipal();
  return (
    <div className="grain grid min-h-[100dvh] place-items-center px-5">
      <div className="rise w-full max-w-lg rounded-md border bg-card p-8">
        <Logo />
        <KeyRound className="mt-8 h-6 w-6 text-copper" />
        <h1 className="font-display mt-3 text-4xl">Access not assigned</h1>
        <p className="mt-3 text-muted-foreground" data-testid="text-unassigned">You are signed in as <span className="font-mono text-foreground">{p.email ?? p.userId}</span>, but no role has been assigned to this account. Roles are never granted automatically. A platform operator must explicitly assign you to the platform or to a client.</p>
        <div className="mt-6 flex gap-2">
          <Button data-testid="button-recheck" variant="outline" onClick={() => qc.invalidateQueries({ queryKey: getGetCurrentPrincipalQueryKey() })}>Check again</Button>
          <Button data-testid="button-signout" variant="ghost" onClick={() => signOut({ redirectUrl: '/' })}>Sign out</Button>
        </div>
      </div>
    </div>
  );
}
