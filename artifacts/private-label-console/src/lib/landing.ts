import { useEffect, useRef, useState, useCallback } from 'react';
import type { LandingProduct } from '@workspace/api-client-react';

export const billingLabel: Record<string, string> = { monthly: 'per month', yearly: 'per year', one_time: 'one-time', on_request: 'on request' };

function money(v: string, cur: string) {
  try { return new Intl.NumberFormat('en-US', { style: 'currency', currency: cur, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(v)); }
  catch { return `${v} ${cur}`; }
}
export function priceText(p: LandingProduct) {
  if (p.startingPrice === null) return { main: 'Pricing on request', sub: '' };
  return { main: money(p.startingPrice, p.currency), sub: p.billingPeriod === 'on_request' ? '' : billingLabel[p.billingPeriod] };
}
export function setupText(p: LandingProduct) { return p.setupFee === null ? null : money(p.setupFee, p.currency); }
export const statusLabel = (s: string) => (s === 'available' ? 'Available' : 'Coming soon');
export const readinessNote = (r: string) =>
  r === 'sandbox_only'
    ? 'Sandbox only. This is a non-executing Exchange sandbox: no live trading, no real funds, no production service.'
    : 'Planned. Not implemented: there are no demos, APIs or dashboards for this product.';

const KEY = 'pl-landing-theme';
export function useLandingTheme() {
  const [t, setT] = useState<'dark' | 'light'>(() => {
    try { const s = localStorage.getItem(KEY); if (s === 'dark' || s === 'light') return s; } catch { /* ignore */ }
    return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  });
  useEffect(() => {
    document.documentElement.setAttribute('data-lp-theme', t);
    return () => { document.documentElement.removeAttribute('data-lp-theme'); };
  }, [t]);
  const toggle = useCallback(() => setT((c) => { const n = c === 'dark' ? 'light' : 'dark'; try { localStorage.setItem(KEY, n); } catch { /* ignore */ } return n; }), []);
  return { theme: t, toggle };
}

export function useReveal<T extends HTMLElement>(deps: unknown[] = []) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const root = ref.current; if (!root) return;
    const els = root.querySelectorAll('.lp-rv:not(.in)');
    if (!('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('in')); return; }
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.12 });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}

export function glowMove(e: React.PointerEvent<HTMLElement>) {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
}
