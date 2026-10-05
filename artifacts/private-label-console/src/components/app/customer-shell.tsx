import type { ReactNode } from 'react';
import { useLocation } from 'wouter';
import { useClerk } from '@clerk/react';
import { LayoutGrid, ShoppingBag, Layers, ShieldCheck, UserRound, LogOut } from 'lucide-react';
import { usePrincipal } from '@/lib/principal';
import { useAdminPanels } from '@/lib/customer';
import { ConsoleFrame, type ConsoleNavItem } from '@/components/app/console-frame';

export function CustomerShell({ children }: { children: ReactNode }) {
  const [loc] = useLocation();
  const p = usePrincipal();
  const { signOut } = useClerk();
  const panels = useAdminPanels().data ?? [];
  const items = [
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
    <ConsoleFrame homeHref="/account" navLabel="Customer navigation" items={navItems} maxWidth="max-w-6xl"
      footer={
        <div className="space-y-3">
          <div className="min-w-0"><p data-testid="text-user-email" className="truncate text-sm">{p.email ?? 'Your account'}</p>
            <p className="font-mono text-[11px] uppercase tracking-wider text-sidebar-primary">Customer account</p></div>
          <button data-testid="button-signout" onClick={() => signOut({ redirectUrl: '/' })} className="flex shrink-0 items-center gap-2 py-2 text-xs"><LogOut className="h-3.5 w-3.5" /> Sign out</button>
        </div>
      }>
      {children}
    </ConsoleFrame>
  );
}
