import type { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { useClerk } from '@clerk/react';
import { LayoutGrid, ShoppingBag, Layers, ShieldCheck, UserRound, LogOut } from 'lucide-react';
import { usePrincipal } from '@/lib/principal';
import { useAdminPanels } from '@/lib/customer';
import { Logo } from '@/components/app/shell';

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
  return (
    <div className="grain min-h-[100dvh] md:flex">
      <aside className="bg-sidebar text-sidebar-foreground md:fixed md:inset-y-0 md:flex md:w-60 md:flex-col md:justify-between md:p-5">
        <div>
          <div className="p-4 md:p-0"><Link href="/account" data-testid="link-logo"><Logo light /></Link></div>
          <nav aria-label="Customer navigation" className="grid grid-cols-2 gap-1 px-3 pb-3 md:mt-10 md:flex md:flex-col md:space-y-1 md:px-0 md:pb-0">
            {items.map((n) => (
              <Link key={n.label} href={n.href} data-testid={`link-nav-${n.label.toLowerCase().replace(/[^a-z]+/g, '-')}`}
                aria-current={active(n.href, n.exact) ? 'page' : undefined}
                className={`flex min-w-0 items-center gap-3 rounded-md px-3 py-2 text-sm ${active(n.href, n.exact) ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'hover:bg-sidebar-accent/60'}`}>
                <n.icon className="h-4 w-4 shrink-0" /><span>{n.label}</span>
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-sidebar-border px-4 py-3 md:block md:px-0 md:pt-4">
          <div className="min-w-0"><p data-testid="text-user-email" className="truncate text-sm">{p.email ?? 'Your account'}</p>
          <p className="font-mono text-[11px] uppercase tracking-wider text-sidebar-primary">Customer account</p></div>
          <button data-testid="button-signout" onClick={() => signOut({ redirectUrl: '/' })} className="flex shrink-0 items-center gap-2 py-2 text-xs text-sidebar-foreground/70 hover:text-sidebar-accent-foreground md:mt-3"><LogOut className="h-3.5 w-3.5" /> Sign out</button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 md:ml-60"><div className="mx-auto max-w-5xl px-5 py-8 md:px-10 md:py-12">{children}</div></main>
    </div>
  );
}
