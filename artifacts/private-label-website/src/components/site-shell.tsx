import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'wouter';
import type { PublicSite } from '@workspace/api-client-react';
import { fontLink, humanize, tokens } from '@/lib/theme';

function useDark(mode: PublicSite['themeMode']) {
  const [sys, setSys] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const h = (e: MediaQueryListEvent) => setSys(e.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);
  return mode === 'dark' || (mode === 'system' && sys);
}

export function SiteShell({ site, children }: { site: PublicSite; children: ReactNode }) {
  const dark = useDark(site.themeMode);
  const ws = site.websiteSettings;
  useEffect(() => {
    document.title = site.brandName;
    const links: HTMLLinkElement[] = [];
    const add = (rel: string, href: string) => { const l = document.createElement('link'); l.rel = rel; l.href = href; document.head.appendChild(l); links.push(l); };
    const f = fontLink(ws.fontKey); if (f) add('stylesheet', f);
    const prev = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    const prevHref = prev?.href;
    if (ws.faviconUrl) { if (prev) prev.href = ws.faviconUrl; else add('icon', ws.faviconUrl); }
    return () => { links.forEach((l) => l.remove()); if (prev && prevHref) prev.href = prevHref; };
  }, [site.brandName, ws.fontKey, ws.faviconUrl]);
  const base = `/${site.tenantSlug}`;
  const feats = Object.entries(site.features).filter(([, v]) => v).map(([k]) => k);
  return (
    <div className="site min-h-[100dvh]" style={{ ...tokens(site, dark), background: 'var(--site-bg)', color: 'var(--site-fg)' } as CSSProperties} data-testid="site-root">
      <header className="sticky top-0 z-10 border-b backdrop-blur" style={{ borderColor: 'var(--site-line)', background: 'color-mix(in srgb, var(--site-bg) 88%, transparent)' }}>
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-5 py-4">
          <Link href={base} className="flex items-center gap-2.5" data-testid="link-home">
            {site.logoUrl ? <img src={site.logoUrl} alt={site.brandName} className="h-8 max-w-40 object-contain" /> : <span className="grid h-8 w-8 place-items-center rounded-md text-sm font-bold" style={{ background: 'var(--site-primary)', color: 'var(--site-primary-fg)' }}>{site.brandName[0]}</span>}
            <span className="text-lg font-semibold tracking-tight">{site.brandName}</span>
          </Link>
          <nav className="ml-auto hidden gap-5 text-sm md:flex">
            {feats.map((k) => <Link key={k} href={`${base}/${k}`} className="opacity-75 hover:opacity-100" data-testid={`link-feature-${k}`}>{humanize(k)}</Link>)}
          </nav>
        </div>
      </header>
      <main>{children}</main>
      <footer className="mt-24 border-t" style={{ borderColor: 'var(--site-line)' }}>
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 md:grid-cols-3">
          <div><p className="font-semibold">{site.brandName}</p><p className="mt-2 whitespace-pre-line text-sm" style={{ color: 'var(--site-muted)' }}>{ws.footerText}</p></div>
          <div className="text-sm"><p className="mb-2 font-semibold">Support</p>
            {ws.supportEmail && <a className="block underline-offset-2 hover:underline" href={`mailto:${ws.supportEmail}`}>{ws.supportEmail}</a>}
            {ws.supportUrl && <a className="block underline-offset-2 hover:underline" href={ws.supportUrl} target="_blank" rel="noreferrer noopener">Help center</a>}
            {ws.supportDetails && <p className="mt-1 whitespace-pre-line" style={{ color: 'var(--site-muted)' }}>{ws.supportDetails}</p>}</div>
          <div className="text-sm"><p className="mb-2 font-semibold">Links</p>
            {ws.socialLinks.map((l) => <a key={l.url} className="block underline-offset-2 hover:underline" href={l.url} target="_blank" rel="noreferrer noopener">{l.label}</a>)}
            <Link href={`${base}/privacy`} className="block hover:underline" data-testid="link-privacy">Privacy</Link>
            <Link href={`${base}/terms`} className="block hover:underline" data-testid="link-terms">Terms</Link></div>
        </div>
        {site.sandboxOnly && <p className="border-t py-3 text-center font-mono text-[11px] uppercase tracking-widest" style={{ borderColor: 'var(--site-line)', color: 'var(--site-muted)' }}>Sandbox environment - no real funds move here</p>}
      </footer>
    </div>
  );
}

export function Unavailable({ title = 'This site is unavailable', body = 'It may not exist, or it is not currently published to the public.' }: { title?: string; body?: string }) {
  return (
    <div className="grid min-h-[100dvh] place-items-center bg-background px-6 text-center" data-testid="state-unavailable">
      <div className="max-w-md space-y-3"><p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Unavailable</p>
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1><p className="text-muted-foreground">{body}</p></div>
    </div>
  );
}

export function SiteSkeleton() {
  return <div className="min-h-[100dvh] bg-background p-10"><div className="mx-auto max-w-5xl space-y-4"><div className="h-10 w-48 animate-pulse rounded bg-muted" /><div className="h-64 animate-pulse rounded bg-muted" /></div></div>;
}
