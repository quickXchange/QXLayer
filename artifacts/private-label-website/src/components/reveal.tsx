import { useEffect, useRef, useState, type ReactNode } from 'react';

const pending = new Map<Element, () => void>();
let observer: IntersectionObserver | undefined;
function observe(el: Element, reveal: () => void) {
  observer ??= new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) {
      const callback = pending.get(entry.target);
      pending.delete(entry.target); observer!.unobserve(entry.target); callback?.();
    }
  }, { rootMargin: '0px 0px -8% 0px' });
  pending.set(el, reveal); observer.observe(el);
  return () => { pending.delete(el); observer!.unobserve(el); };
}

export function Reveal({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setSeen(true); return; }
    return observe(el, () => setSeen(true));
  }, []);
  return <div ref={ref} className={`s-reveal ${seen ? 'is-in' : ''} ${className}`} style={{ transitionDelay: `${delay}ms` }}>{children}</div>;
}
