import type { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { useClerk } from '@clerk/react';
import { LayoutGrid, Users, Boxes, ScrollText, LogOut } from 'lucide-react';
import { useHealthCheck } from '@workspace/api-client-react';
import { usePrincipal } from '@/lib/principal';
import { roleLabel } from '@/lib/format';
import { Button } from '@/components/ui/button';

const nav = [
  { href: '/admin', label: 'Overview', icon: LayoutGrid },
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/modules', label: 'Modules', icon: Boxes },
  { href: '/activity', label: 'Activity', icon: ScrollText },
];

export function Logo({ light }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="" className="h-8 w-8" />
      <span className={`font-display text-xl leading-none ${light ? 'text-sidebar-accent-foreground' : ''}`}>Private Label</span>
    </div>
  );
}

function Health() {
  const h = useHealthCheck({ query: { refetchInterval: 30000 } as never });
  const ok = h.data?.status === 'ok' || h.data?.status === 'healthy';
  const text = h.isLoading ? 'Checking API' : h.isError ? 'API unreachable' : `API ${h.data?.status}`;
  return (
    <div data-testid="status-health" className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider">
      <span className={`h-2 w-2 rounded-full ${h.isError ? 'bg-destructive' : ok || h.data ? 'bg-emerald-400' : 'bg-muted-foreground animate-pulse'}`} />
      {text}
    </div>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const [loc] = useLocation();
  const p = usePrincipal();
  const { signOut } = useClerk();
  const active = (h: string) => (h === '/admin' ? loc === h : loc.startsWith(h));
  return (
    <div className="grain min-h-[100dvh] md:flex">
      <aside className="bg-sidebar text-sidebar-foreground md:fixed md:inset-y-0 md:flex md:w-60 md:flex-col md:justify-between md:p-5">
        <div className="flex items-center justify-between p-4 md:block md:p-0">
          <Link href="/admin" data-testid="link-logo"><Logo light /></Link>
          <nav className="mt-0 hidden md:mt-10 md:block md:space-y-1">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} data-testid={`link-nav-${n.label.toLowerCase()}`}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${active(n.href) ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'hover:bg-sidebar-accent/60'}`}>
                <n.icon className={`h-4 w-4 ${active(n.href) ? 'text-sidebar-primary' : ''}`} /> {n.label}
              </Link>
            ))}
          </nav>
          <Button data-testid="button-signout-mobile" size="icon" variant="ghost" className="md:hidden" onClick={() => signOut({ redirectUrl: '/' })}><LogOut className="h-4 w-4" /></Button>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:hidden">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm ${active(n.href) ? 'bg-sidebar-accent text-sidebar-accent-foreground' : ''}`}>{n.label}</Link>
          ))}
        </nav>
        <div className="hidden space-y-4 md:block">
          <Health />
          <div className="border-t border-sidebar-border pt-4">
            <p data-testid="text-user-email" className="truncate text-sm">{p.email ?? p.userId}</p>
            <p data-testid="text-user-role" className="font-mono text-[11px] uppercase tracking-wider text-sidebar-primary">{roleLabel[p.role]}</p>
            <button data-testid="button-signout" onClick={() => signOut({ redirectUrl: '/' })} className="mt-3 flex items-center gap-2 text-xs text-sidebar-foreground/70 hover:text-sidebar-accent-foreground"><LogOut className="h-3.5 w-3.5" /> Sign out</button>
          </div>
        </div>
      </aside>
      <main className="min-w-0 flex-1 md:ml-60">
        <div className="mx-auto max-w-6xl px-5 py-8 md:px-10 md:py-12">{children}</div>
      </main>
    </div>
  );
}
