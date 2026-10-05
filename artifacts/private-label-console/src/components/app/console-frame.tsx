import { createContext, useContext, useEffect, useRef, useState, type CSSProperties, type ElementType, type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { Menu, Moon, Sun, X } from 'lucide-react';
import { Ambient } from '@site/components/ambient';
import { BrandLogo } from '@/components/brand-logo';
import { useConsoleTheme } from '@/lib/console-theme';

export interface ConsoleNavItem { key: string; href: string; label: string; icon: ElementType; testId?: string; current: boolean }

/** Applies the shared QXLayer theme and renders children inside the themed root. */
const ThemeCtx = createContext<{ dark: boolean; toggle: () => void } | null>(null);

export function ConsoleThemeScope({ children }: { children: ReactNode }) {
  const { dark, toggle, vars } = useConsoleTheme();
  return (
    <ThemeCtx.Provider value={{ dark, toggle }}><div className="site qx-root min-h-[100dvh]" style={vars as CSSProperties} data-qx-theme={dark ? 'dark' : 'light'} data-surface="glass">
      <Ambient />
      <div className="relative z-[2]">{children}</div>
    </div></ThemeCtx.Provider>
  );
}

function useDesktop() {
  const q = '(min-width: 768px)';
  const [v, setV] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q); const h = (e: MediaQueryListEvent) => setV(e.matches);
    mq.addEventListener('change', h); return () => mq.removeEventListener('change', h);
  }, []);
  return v;
}

function Brand({ href }: { href: string }) {
  return (
    <Link href={href} data-testid="link-logo" className="qx-brand flex min-w-0 items-center gap-2.5">
      <BrandLogo size={32} />
      <span className="truncate text-[1.05rem] font-semibold tracking-tight">QXLayer</span>
    </Link>
  );
}

function Inner({ homeHref, navLabel, items, footer, mobileAction, maxWidth, children }: {
  homeHref: string; navLabel: string; items: ConsoleNavItem[]; footer: ReactNode; mobileAction?: ReactNode; maxWidth: string; children: ReactNode;
}) {
  const { dark, toggle } = useContext(ThemeCtx)!;
  const desktop = useDesktop();
  const [loc] = useLocation();
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => { setOpen(false); }, [loc]);
  useEffect(() => { if (desktop) setOpen(false); }, [desktop]);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); btn.current?.focus(); } };
    document.addEventListener('keydown', k);
    panel.current?.querySelector<HTMLElement>('a,button')?.focus();
    return () => document.removeEventListener('keydown', k);
  }, [open]);
  const themeBtn = (
    <button type="button" onClick={toggle} className="s-iconbtn" aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'} aria-pressed={dark} data-testid="button-theme">
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
  const links = (mobile: boolean) => items.map((n) => (
    <Link key={n.key} href={n.href} data-testid={n.testId} aria-current={n.current ? 'page' : undefined}
      className={`qx-navlink ${mobile ? 'qx-navlink-m' : ''}`}>
      <n.icon className="h-4 w-4 shrink-0" /><span className="truncate">{n.label}</span>
    </Link>
  ));
  return (
    <div className="qx-frame min-h-[100dvh] md:flex">
      {desktop ? (
        <aside className="qx-side md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col md:justify-between">
          <div>
            <div className="flex items-center justify-between gap-2">{<Brand href={homeHref} />}{themeBtn}</div>
            <nav aria-label={navLabel} className="qx-nav mt-8 flex flex-col gap-1">{links(false)}</nav>
          </div>
          <div className="qx-side-foot">{footer}</div>
        </aside>
      ) : (
        <header className="s-header">
          <div className="flex h-[68px] items-center gap-2 px-4">
            <Brand href={homeHref} />
            <div className="ml-auto flex items-center gap-2">
              {themeBtn}{mobileAction}
              <button ref={btn} type="button" className="s-iconbtn" aria-expanded={open} aria-controls="qx-mobile-menu" aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen((v) => !v)} data-testid="button-menu">
                {open ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
          {open && (
            <div id="qx-mobile-menu" ref={panel} className="s-mobile-menu qx-drawer border-t">
              <nav aria-label={navLabel} className="grid gap-1 p-3">{links(true)}</nav>
              <div className="qx-side-foot border-t p-4">{footer}</div>
            </div>
          )}
        </header>
      )}
      <main className="qx-main min-w-0 flex-1 md:ml-64">
        <div className={`mx-auto ${maxWidth} px-5 py-8 md:px-10 md:py-12`}>{children}</div>
      </main>
    </div>
  );
}

export function ConsoleFrame(props: Parameters<typeof Inner>[0]) {
  return <ConsoleThemeScope><Inner {...props} /></ConsoleThemeScope>;
}
