import type { ReactNode } from 'react';
import { useLocation } from 'wouter';
import { useClerk } from '@clerk/react';
import { LayoutGrid, ShoppingBag, Layers, ShieldCheck, UserRound, LogOut } from 'lucide-react';
import { usePrincipal } from '@/lib/principal';
import { useAdminPanels } from '@/lib/customer';
import { ConsoleFrame, type ConsoleNavItem } from '@/components/app/console-frame';
import { useQueryClient } from '@tanstack/react-query';
import { endDemoSession } from '@workspace/api-client-react';

export function CustomerShell({ children }: { children: ReactNode }) {
  const [loc] = useLocation();
  const p = usePrincipal();
  const { signOut } = useClerk();
  const qc = useQueryClient();
  const exit = async () => {
    if (!p.demo) { await signOut({ redirectUrl: '/' }); return; }
    await endDemoSession();
    qc.clear();
    window.location.assign(import.meta.env.BASE_URL);
  };
  const panels = useAdminPanels().data ?? [];
  const items = p.demo ? [{ href: `/clients/${p.tenantId}/exchange`, label: 'NovaX Admin Demo', icon: ShieldCheck }] : [
    { href: '/account', label: 'Dashboard', icon: LayoutGrid, exact: true },
    { href: '/account/orders', label: 'My Orders', icon: ShoppingBag },
    { href: '/account/white-labels', label: 'My White Labels', icon: Layers },
    ...(panels.length ? [{ href: panels.length === 1 ? `/clients/${panels[0].tenantId}/exchange` : '/account/admin-panels', label: 'Admin Panel', icon: ShieldCheck }] : []),
    { href: '/account/profile', label: 'Profile / Account', icon: UserRound },
  ];
  const active = (h: string, exact?: boolean) => (exact ? loc === h : h.includes('/exchange') ? loc.startsWith('/clients/') : loc.startsWith(h));
  const navItems: ConsoleNavItem[] = items.map((n) => ({
    key: n.label, href: n.href, label: n.label, icon: n.icon, testId: `link-nav-${n.label.toLowerCase().replace(/[^a-z]+/g, '-')}`, current: active(n.href, n.exact),
  }));
  return (
    <ConsoleFrame homeHref={p.demo ? `/clients/${p.tenantId}/exchange` : '/account'} navLabel="Customer navigation" items={navItems} maxWidth="max-w-6xl"
      footer={
        <div className="space-y-3">
          <div className="min-w-0"><p data-testid="text-user-email" className="truncate text-sm">{p.email ?? 'Your account'}</p>
            <p className="font-mono text-[11px] uppercase tracking-wider text-sidebar-primary">{p.demo ? 'Sandbox Demo · Read-only' : 'Customer account'}</p></div>
          <button data-testid="button-signout" onClick={() => void exit()} className="flex shrink-0 items-center gap-2 py-2 text-xs"><LogOut className="h-3.5 w-3.5" /> {p.demo ? 'Exit demo' : 'Sign out'}</button>
        </div>
      }>
      {p.demo && <div role="status" className="mb-5 rounded-xl border bg-card px-5 py-3 text-sm" data-testid="banner-demo-readonly">Sandbox Demo · NovaX Exchange · Read-only admin · No real funds or credentials</div>}
      {children}
    </ConsoleFrame>
  );
}
