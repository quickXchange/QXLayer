import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import type { Option } from '../../lib/exchange-model';
import { OptionLogo } from './option-logo';

/** Searchable selector. Crypto assets and fiat payment methods appear directly, each with its own logo. */
export function OptionPicker({ options, selected, title, onSelect, onClose }: { options: Option[]; selected: string | null; title: string; onSelect: (o: Option) => void; onClose: () => void }) {
  const [q, setQ] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    input.current?.focus();
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); closeRef.current(); return; }
      if (e.key !== 'Tab' || !sheet.current) return;
      const f = Array.from(sheet.current.querySelectorAll<HTMLElement>('button:not(:disabled),input'));
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', k);
    return () => { document.removeEventListener('keydown', k); document.body.style.overflow = overflow; prev?.focus(); };
  }, []);
  const list = useMemo(() => { const s = q.trim().toLowerCase(); return s ? options.filter((o) => `${o.title} ${o.subtitle} ${o.symbol}`.toLowerCase().includes(s)) : options; }, [options, q]);
  return (
    <div className="s-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }} data-testid="dialog-option-picker">
      <div ref={sheet} className="s-sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="flex items-center justify-between px-4 pb-2 pt-4">
          <h2 className="text-base font-semibold">{title}</h2>
          <button type="button" onClick={onClose} className="s-iconbtn" style={{ width: 40, height: 40 }} aria-label="Close selector" data-testid="button-picker-close"><X size={18} /></button>
        </div>
        <div className="px-4 pb-3">
          <label className="s-side flex items-center gap-2.5" style={{ padding: '.2rem .8rem' }}>
            <Search size={16} className="s-muted" aria-hidden="true" />
            <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search currency, method or network" aria-label="Search options" className="h-11 w-full bg-transparent text-sm outline-none" data-testid="input-option-search" />
          </label>
        </div>
        <div className="overflow-y-auto px-2 pb-4" role="listbox" aria-label={title}>
          {list.length === 0 && <p className="s-muted px-4 py-10 text-center text-sm" data-testid="state-picker-empty">{options.length ? `Nothing matches \u201C${q}\u201D.` : 'No compatible options are enabled.'}</p>}
          {list.map((o) => (
            <button key={o.key} type="button" role="option" aria-selected={o.key === selected} onClick={() => onSelect(o)} className="s-opt" data-testid={`option-${o.key}`}>
              <OptionLogo option={o} />
              <span className="min-w-0 flex-1"><span className="block font-semibold">{o.title}</span><span className="s-muted block truncate text-xs">{o.subtitle}</span></span>
              <span className="s-badge">{o.kind === 'fiat' ? o.symbol : o.asset?.networkName}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
