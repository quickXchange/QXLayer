import { useLocation } from 'wouter';

export const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
}
export function useAnchors(slug: string) {
  const [loc, nav] = useLocation();
  const base = `/${slug}`;
  const prefix = import.meta.env.BASE_URL.replace(/\/$/, '');
  return {
    href: (id: string) => `${prefix}${base}#${id}`,
    go: (id: string, after?: () => void) => (e: React.MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      after?.();
      if (loc === base || loc === `${base}/`) {
        window.history.replaceState(window.history.state, '', `${prefix}${base}#${encodeURIComponent(id)}`);
        window.requestAnimationFrame(() => scrollToId(id));
      } else nav(`${base}#${encodeURIComponent(id)}`);
    },
  };
}
