import { useEffect } from 'react';

// Only navigation intent in an already-authorized shell; never fetch user data.
const pages: Record<string, () => Promise<unknown>> = {
  admin: () => import('@/pages/admin'), clients: () => import('@/pages/clients'),
  account: () => import('@/pages/account'), plans: () => import('@/pages/plans'),
  'add-ons': () => import('@/pages/addons'), modules: () => import('@/pages/modules'),
  providers: () => import('@/pages/providers'), integrations: () => import('@/pages/integrations'),
  provisioning: () => import('@/pages/provisioning'), activity: () => import('@/pages/activity'),
  'white-labels': () => import('@/pages/white-labels'),
  'white-label-requests': () => import('@/pages/white-label-requests'),
  'landing-products': () => import('@/pages/landing-products'),
  'catalog-preview': () => import('@/pages/catalog-preview'),
};
const warmed = new Set<string>();
const nestedPages: [RegExp, () => Promise<unknown>][] = [
  [/^\/clients\/[^/]+\/exchange(?:\/|$)/, () => import('@/pages/exchange')],
  [/^\/clients\/[^/]+\/integrations$/, () => import('@/pages/integrations')],
  [/^\/clients\/new$/, () => import('@/pages/client-new')],
  [/^\/clients\/[^/]+$/, () => import('@/pages/client-detail')],
  [/^\/customers\/[^/]+$/, () => import('@/pages/customer-detail')],
  [/^\/plans\/[^/]+$/, () => import('@/pages/plan-detail')],
  [/^\/white-label-requests\/[^/]+$/, () => import('@/pages/white-label-order')],
  [/^\/account\/orders\/[^/]+$/, () => import('@/pages/account-order')],
];
export function RoutePrefetch() {
  useEffect(() => {
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    if (connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType ?? '')) return;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const prefetch = (event: Event) => {
      const anchor = (event.target as Element)?.closest?.('a[href]');
      if (!(anchor instanceof HTMLAnchorElement)) return;
      const url = new URL(anchor.href);
      if (url.origin !== window.location.origin) return;
      const base = import.meta.env.BASE_URL.replace(/\/$/, '');
      if (base && !url.pathname.startsWith(`${base}/`)) return;
      const route = url.pathname.slice(base.length);
      const loader = nestedPages.find(([pattern]) => pattern.test(route))?.[1] ?? pages[route.split('/')[1]];
      if (!loader || warmed.has(route)) return;
      const timer = setTimeout(() => {
        timers.delete(timer);
        if (warmed.has(route)) return;
        warmed.add(route);
        void loader().catch(() => warmed.delete(route));
      }, 120);
      timers.add(timer);
    };
    document.addEventListener('pointerover', prefetch, { passive: true });
    document.addEventListener('focusin', prefetch);
    return () => {
      document.removeEventListener('pointerover', prefetch);
      document.removeEventListener('focusin', prefetch);
      for (const timer of timers) clearTimeout(timer);
    };
  }, []);
  return null;
}
