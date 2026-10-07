import type { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { useClerk } from '@clerk/react';
import { LayoutGrid, Users, Boxes, ScrollText, LogOut, Globe2, Puzzle, Plug, Workflow, Eye } from 'lucide-react';
import { useHealthCheck } from '@workspace/api-client-react';
import { usePrincipal } from '@/lib/principal';
import { roleLabel } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { BrandLogo } from '@/components/brand-logo';
import { ConsoleFrame, type ConsoleNavItem } from '@/components/app/console-frame';

const nav = [
  { href: '/admin', label: 'Overview', icon: LayoutGrid },
  { href: '/white-label-requests', label: 'White Label Orders', icon: ScrollText, op: true, group: 'White Labels' },
  { href: '/white-labels', label: 'White Labels', icon: Globe2, op: true, group: 'White Labels' },
  { href: '/clients', label: 'Clients', icon: Users, group: 'White Labels' },
  { href: '/plans', label: 'Plans', icon: Boxes, op: true, group: 'Commercial' },
  { href: '/add-ons', label: 'Add-ons', icon: Puzzle, op: true, group: 'Commercial' },
  { href: '/modules', label: 'Modules', icon: Boxes, group: 'Platform' },
  { href: '/providers', label: 'Providers', icon: Plug, op: true, group: 'Platform' },
  { href: '/provisioning', label: 'Provisioning', icon: Workflow, op: true, group: 'System' },
  { href: '/activity', label: 'Activity', icon: ScrollText, group: 'System' },
  { href: '/landing-products', label: 'Landing', icon: LayoutGrid, op: true, group: 'Additional' },
  { href: '/catalog-preview', label: 'Preview', icon: Eye, group: 'Additional' },
];

export function Logo({ light }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <BrandLogo />
      <span className={`font-display text-xl leading-none ${light ? 'text-sidebar-accent-foreground' : ''}`}>QXLayer</span>
    </div>
  );
}

function Health() {
  const h = useHealthCheck({ query: { refetchInterval: 30000 } as never });
  const ok = h.data?.status === 'ok' || h.data?.status === 'healthy';
  const text = h.isLoading ? 'Checking API' : h.isError ? 'API unreachable' : `API ${h.data?.status}`;
  return (
    <div data-testid="status-health" className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider">
      <span className={`h-2 w-2 rounded-full ${h.isError ? 'bg-destructive' : ok || h.data ? 'bg-emerald-500' : 'bg-muted-foreground animate-pulse'}`} />
      {text}
    </div>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const [loc] = useLocation();
  const p = usePrincipal();
  const { signOut } = useClerk();
  const active = (h: string) => (h === '/admin' ? loc === h : h === '/clients' ? loc.startsWith('/clients') || loc.startsWith('/customers') : loc.startsWith(h));
  const items: ConsoleNavItem[] = nav.filter((n) => !n.op || p.role === 'super_admin').map((n) => ({
    key: n.href, href: n.href, label: n.label, icon: n.icon, testId: `link-nav-${n.label.toLowerCase().replace(/ /g, '')}`, current: active(n.href), group: n.group,
  }));
  return (
    <ConsoleFrame homeHref="/admin" navLabel="Administration navigation" items={items} maxWidth="max-w-6xl"
      mobileAction={<Button data-testid="button-signout-mobile" aria-label="Sign out" size="icon" variant="ghost" onClick={() => signOut({ redirectUrl: '/' })}><LogOut className="h-4 w-4" /></Button>}
      footer={
        <div className="space-y-4">
          <Health />
          <div className="border-t border-sidebar-border pt-4">
            <p data-testid="text-user-email" className="truncate text-sm">{p.email ?? 'Your account'}</p>
            <p data-testid="text-user-role" className="font-mono text-[11px] uppercase tracking-wider text-sidebar-primary">{roleLabel[p.role]}</p>
            <button data-testid="button-signout" onClick={() => signOut({ redirectUrl: '/' })} className="mt-3 flex items-center gap-2 text-xs"><LogOut className="h-3.5 w-3.5" /> Sign out</button>
          </div>
        </div>
      }>
      {children}
    </ConsoleFrame>
  );
}
