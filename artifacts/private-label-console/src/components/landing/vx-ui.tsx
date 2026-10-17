import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { glowMove } from '@/lib/landing';

export function VxTabs({ id, label, tabs, value, onChange }: { id: string; label: string; tabs: { key: string; label: string }[]; value: string; onChange: (k: string) => void }) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const onKey = (e: KeyboardEvent) => {
    // Arrow navigation follows the focused tab, which can differ from the
    // selected tab after a mouse click or programmatic focus.
    const focused = tabs.findIndex((t) => refs.current[t.key] === e.target);
    const i = focused >= 0 ? focused : tabs.findIndex((t) => t.key === value);
    let n = i;
    if (e.key === 'ArrowRight') n = (i + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') n = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') n = 0;
    else if (e.key === 'End') n = tabs.length - 1;
    else return;
    e.preventDefault();
    e.stopPropagation();
    onChange(tabs[n].key);
    refs.current[tabs[n].key]?.focus();
  };
  return (
    <div role="tablist" aria-label={label} className="vx-tabs" onKeyDown={onKey}>
      {tabs.map((t) => (
        <button key={t.key} ref={(el) => { refs.current[t.key] = el; }} role="tab" type="button" id={`${id}-tab-${t.key}`} aria-controls={`${id}-panel`} aria-selected={value === t.key} tabIndex={value === t.key ? 0 : -1} className="vx-tab" onClick={() => onChange(t.key)} data-testid={`tab-${id}-${t.key}`}>{t.label}</button>
      ))}
    </div>
  );
}
export const tabPanelProps = (id: string, key: string) => ({ role: 'tabpanel' as const, id: `${id}-panel`, 'aria-labelledby': `${id}-tab-${key}`, tabIndex: 0 });

export function VxCard({ children, className = '', testid }: { children: ReactNode; className?: string; testid?: string }) {
  return <div className={`vx-card ${className}`} data-testid={testid} onPointerMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); e.currentTarget.style.setProperty('--gx', `${e.clientX - r.left}px`); e.currentTarget.style.setProperty('--gy', `${e.clientY - r.top}px`); void glowMove; }}>{children}</div>;
}

export function VxFaq({ items, id }: { items: { question: string; answer: string }[]; id: string }) {
  return (
    <div className="vx-faq" data-testid={`list-faq-${id}`}>
      {items.map((f, i) => (
        <details key={i} name={`faq-${id}`}>
          <summary data-testid={`button-faq-${id}-${i}`}><span>{f.question}</span><Plus size={18} aria-hidden="true" /></summary>
          <p className="s-muted pb-5 text-sm leading-relaxed">{f.answer}</p>
        </details>
      ))}
    </div>
  );
}
