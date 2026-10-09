import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeftRight, Banknote, Coins, Repeat, Search, ShieldCheck, WifiOff } from 'lucide-react';
import {
  useGetPublicSite, getGetPublicSiteQueryKey, useGetPublicTelegramMiniConfig, getGetPublicTelegramMiniConfigQueryKey,
  trackSandboxOrder,
} from '@workspace/api-client-react';
import { MiniAppLogo, ExchangeRateSummary, parseTrackingInput, I18nProvider } from '@workspace/quickxchange-mini-core';
import { subscribeTelegramTheme } from '../../../../lib/quickxchange-mini-core/src/lib/telegram-theme';
import { ExchangeWidget, type RateInfo } from '@/components/exchange-widget';
import { resolveCaps, TAB_ORDER, type ExchangeTab } from '@/lib/capabilities';
import { tokens, luminance, readable } from '@/lib/theme';
import { websitePreviewRequest } from '@/lib/development-preview';

type Item = ExchangeTab | 'tracking';
const ALL: Item[] = [...TAB_ORDER, 'tracking'];
const LABEL: Record<Item, string> = { swap: 'Swap', buy: 'Buy', sell: 'Sell', convert: 'Convert', tracking: 'Tracking' };
const ICON: Record<Item, typeof Repeat> = { swap: Repeat, buy: Coins, sell: Banknote, convert: ArrowLeftRight, tracking: Search };
const HEX = /^#[0-9a-fA-F]{6}$/;

interface TgHost { ready?: () => void; expand?: () => void; colorScheme: 'light' | 'dark'; onEvent?: (e: string, cb: () => void) => void; offEvent?: (e: string, cb: () => void) => void }

function useHashAction(): string {
  const read = () => window.location.hash.replace(/^#/, '').toLowerCase();
  const [h, setH] = useState(read);
  useEffect(() => { const f = () => setH(read()); window.addEventListener('hashchange', f); return () => window.removeEventListener('hashchange', f); }, []);
  return h;
}

function Unavailable({ onRetry, why }: { onRetry?: () => void; why: string }) {
  return (
    <main className="grid min-h-[100dvh] place-items-center bg-background p-6 text-center" data-testid="state-mini-unavailable">
      <div className="max-w-sm">
        <WifiOff className="mx-auto mb-3" size={28} aria-hidden="true" />
        <h1 className="text-xl font-semibold">Mini App unavailable</h1>
        <p className="mt-2 text-sm opacity-70">{why}</p>
        {onRetry && <button type="button" className="mt-4 rounded-lg border px-4 py-2 text-sm" onClick={onRetry} data-testid="button-mini-retry">Retry</button>}
      </div>
    </main>
  );
}

function Tracking({ slug }: { slug: string }) {
  const [entry, setEntry] = useState('');
  const [tokenEntry, setTokenEntry] = useState('');
  const [sel, setSel] = useState<{ orderId: string; token: string } | null>(null);
  const q = useQuery({
    queryKey: ['mini-tracking', slug, sel?.orderId, sel?.token],
    queryFn: () => trackSandboxOrder(slug, sel!.orderId, { headers: { trackingToken: sel!.token } }),
    enabled: !!sel?.orderId && !!sel?.token, retry: false, refetchInterval: 15000,
  });
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const [main, frag = ''] = entry.trim().split('#');
    const p = parseTrackingInput(main);
    const token = p.trackingToken || frag || tokenEntry.trim();
    if (p.orderId && token.length >= 32) setSel({ orderId: p.orderId, token }); else setSel({ orderId: '', token: '' });
  };
  const bad = sel && (!sel.orderId || q.isError);
  return (
    <section aria-labelledby="mini-track-h" data-testid="panel-mini-tracking">
      <h2 id="mini-track-h" className="text-lg font-semibold">Track a sandbox order</h2>
      <p className="s-muted mt-1 text-sm">Paste your private tracking link, or an order ID with its private code. Only orders you created are available.</p>
      <form onSubmit={submit} className="mt-4 space-y-3">
        <label className="block text-sm">Tracking link or order ID<input className="mt-1 w-full rounded-lg border bg-transparent p-3" value={entry} onChange={(e) => setEntry(e.target.value)} required maxLength={400} autoComplete="off" data-testid="input-mini-track" /></label>
        <label className="block text-sm">Private code (if not in the link)<input className="mt-1 w-full rounded-lg border bg-transparent p-3" type="password" value={tokenEntry} onChange={(e) => setTokenEntry(e.target.value)} maxLength={200} autoComplete="off" data-testid="input-mini-track-code" /></label>
        <button type="submit" className="s-btn s-btn-primary w-full" data-testid="button-mini-track">Track order</button>
      </form>
      {q.isLoading && sel?.orderId && <p className="s-muted mt-4 text-sm">Loading order...</p>}
      {bad && <p role="alert" className="mt-4 text-sm" data-testid="error-mini-track">Order not available. Check the private link or code.</p>}
      {q.data && !bad && !q.isFetching && (
        <div className="mt-5 space-y-3" data-testid="result-mini-track">
          <p className="font-semibold capitalize">{q.data.action} - {q.data.status}</p>
          <p>{q.data.inputAmount} {q.data.sourceSymbol} to {q.data.outputAmount} {q.data.destinationSymbol}</p>
          <ol className="space-y-2 border-t pt-3">{q.data.history.map((h, i) => <li key={i} className="text-sm"><span className="capitalize">{h.status}</span> - {new Date(h.at).toLocaleString()}<span className="s-muted block">{h.note}</span></li>)}</ol>
          <p className="s-muted text-xs">Every status is simulated. No deposit address, wallet or payment exists.</p>
        </div>)}
    </section>
  );
}

function MiniBody({ slug }: { slug: string }) {
  const req = websitePreviewRequest(slug);
  const cfg = useGetPublicTelegramMiniConfig(slug, { request: req, query: { queryKey: getGetPublicTelegramMiniConfigQueryKey(slug), retry: false, staleTime: 0, refetchOnMount: 'always' } });
  const site = useGetPublicSite(slug, { request: req, query: { enabled: !!slug, queryKey: getGetPublicSiteQueryKey(slug), retry: false, staleTime: 0 } });
  const hash = useHashAction();
  const [rate, setRate] = useState<RateInfo | null>(null);
  const c = cfg.data;
  const s = site.data;

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    const attach = () => {
      if (cancelled) return;
      const host = (window as unknown as { Telegram?: { WebApp?: TgHost } }).Telegram?.WebApp;
      if (!host) return;
      try { host.ready?.(); host.expand?.(); } catch { /* Older Telegram clients may omit these APIs. */ }
      unsubscribe = subscribeTelegramTheme(host, document.documentElement);
    };
    if ((window as unknown as { Telegram?: { WebApp?: TgHost } }).Telegram?.WebApp) attach();
    else {
      let script = document.getElementById('qx-telegram-web-app-sdk') as HTMLScriptElement | null;
      if (!script) {
        script = document.createElement('script'); script.id = 'qx-telegram-web-app-sdk';
        script.src = 'https://telegram.org/js/telegram-web-app.js'; script.async = true;
        document.head.appendChild(script);
      }
      script.addEventListener('load', attach, { once: true });
    }
    return () => { cancelled = true; unsubscribe?.(); };
  }, []);

  const caps = useMemo(() => (s ? resolveCaps(s) : null), [s]);
  const menu = useMemo(() => {
    if (!c || !caps) return [] as Item[];
    return ALL.filter((i) => c.menu.includes(i) && (i === 'tracking' || (caps.exchange === 'on' && caps.tabs.includes(i))));
  }, [c, caps]);
  const [active, setActive] = useState<Item | null>(null);
  const pick = (i: string): Item | null => (menu.includes(i as Item) ? (i as Item) : null);
  const current: Item | null = pick(hash) ?? (active && menu.includes(active) ? active : menu[0] ?? null);
  const choose = (i: Item) => { setActive(i); try { history.replaceState(null, '', `#${i}`); } catch { /* ignore */ } };

  if (cfg.isLoading || site.isLoading) return <main className="grid min-h-[100dvh] place-items-center" aria-busy="true"><div className="s-skel h-40 w-72" /></main>;
  if (cfg.isError || !c || !c.enabled) return <Unavailable why="This Telegram Mini App is not enabled or its configuration could not be loaded." onRetry={() => void cfg.refetch()} />;
  if (site.isError || !s || !caps) return <Unavailable why="The exchange for this Mini App could not be loaded." onRetry={() => void site.refetch()} />;
  if (menu.length === 0 || !current) return <Unavailable why="No Mini App actions are currently available." />;

  const bg = HEX.test(c.backgroundColor) ? c.backgroundColor : null;
  const themed = { ...s, primaryColor: HEX.test(c.primaryColor) ? c.primaryColor : s.primaryColor };
  const dark = bg ? luminance(bg) < 0.4 : false;
  const t: Record<string, string> = { ...tokens(themed, dark) };
  if (bg) { t['--s-bg'] = bg; t['--s-bg2'] = bg; t['--s-fg'] = readable(bg); }
  const exchangeItems = menu.filter((i): i is ExchangeTab => i !== 'tracking');

  return (
    <div className="site min-h-[100dvh]" style={t as CSSProperties} data-testid="mini-root">
      <header className="s-wrap flex items-center gap-3 py-4">
        <MiniAppLogo logoUrl={c.logoUrl || s.logoUrl} fallback={c.brandName} alt={c.brandName} size="large" />
        <div className="min-w-0"><p className="truncate font-semibold" data-testid="text-mini-brand">{c.brandName}</p>
          <p className="s-muted flex items-center gap-1 text-xs"><ShieldCheck size={13} aria-hidden="true" />Sandbox only. No real funds.</p></div>
      </header>
      <nav className="s-wrap" aria-label="Mini App menu"><div role="tablist" className="flex gap-1 overflow-x-auto pb-1">
        {menu.map((i) => { const Icon = ICON[i]; return (
          <button key={i} type="button" role="tab" aria-selected={current === i} onClick={() => choose(i)} className={`s-btn ${current === i ? 's-btn-primary' : 's-btn-ghost'} shrink-0`} data-testid={`mini-menu-${i}`}><Icon size={15} aria-hidden="true" className="mr-1.5" />{LABEL[i]}</button>); })}
      </div></nav>
      <main className="s-wrap py-5">
        {current === 'tracking' ? <Tracking slug={slug} /> : (
          <div className="mx-auto max-w-md space-y-4">
            <ExchangeWidget site={s} caps={caps} allowedActions={exchangeItems} initialAction={current} onRateInfo={setRate} />
            {rate && rate.mode && <ExchangeRateSummary mode={rate.mode} sourceAsset={rate.sourceAsset} targetAsset={rate.targetAsset} rate={rate.rate} loading={rate.loading} error={rate.error} />}
          </div>)}
      </main>
    </div>
  );
}

export default function TelegramMini() {
  const { slug = '' } = useParams<{ slug: string }>();
  // Resolve module availability before mounting the remote dictionary provider.
  // Disabled language endpoints must not hide the actual unavailable screen.
  const cfg = useGetPublicTelegramMiniConfig(slug, { request: websitePreviewRequest(slug),
    query: { queryKey: getGetPublicTelegramMiniConfigQueryKey(slug), retry: false, staleTime: 0 } });
  if (cfg.isLoading) return <main className="grid min-h-[100dvh] place-items-center" aria-busy="true">Loading Mini App…</main>;
  if (cfg.isError || !cfg.data?.enabled)
    return <Unavailable why="This Telegram Mini App is not enabled or its configuration could not be loaded." onRetry={() => void cfg.refetch()} />;
  return <I18nProvider apiBase={`/api/public/sites/${encodeURIComponent(slug)}/telegram`}><MiniBody slug={slug} /></I18nProvider>;
}
