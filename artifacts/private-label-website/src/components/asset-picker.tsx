import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import type { AssetNetwork } from '@workspace/api-client-react';

export const assetKey = (a: AssetNetwork) => `${a.assetId}:${a.networkId}`;

const GLYPH: Record<string, { bg: string; node: React.ReactNode }> = {
  btc: { bg: '#f7931a', node: <path d="M10 8h5a2.2 2.2 0 010 4.4H10m0 0h5.5a2.3 2.3 0 010 4.6H10M10 8v9m2-11v2m0 9v2" stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" /> },
  eth: { bg: '#5b6ee1', node: <g fill="#fff"><path d="M12 4l5 8.2-5 2.9-5-2.9z" opacity=".95" /><path d="M12 16l5-2.9-5 6.9-5-6.9z" opacity=".75" /></g> },
  usdt: { bg: '#1fa37a', node: <g stroke="#fff" strokeWidth="1.8" strokeLinecap="round" fill="none"><path d="M7 7.5h10M12 7.5V18" /><ellipse cx="12" cy="12" rx="5.6" ry="1.9" strokeWidth="1.3" /></g> },
};
export function Coin({ asset, size = 36 }: { asset: Pick<AssetNetwork, 'symbol' | 'assetId'>; size?: number }) {
  const g = GLYPH[asset.symbol.toLowerCase()] ?? GLYPH[asset.assetId.toLowerCase()];
  if (g) return <span className="s-coin" aria-hidden="true" style={{ width: size, height: size, background: g.bg }}><svg viewBox="0 0 24 24" width={size * 0.62} height={size * 0.62}>{g.node}</svg></span>;
  let h = 0; for (const c of asset.assetId) h = (h * 31 + c.charCodeAt(0)) % 360;
  return <span className="s-coin" aria-hidden="true" style={{ width: size, height: size, fontSize: size * 0.34, background: `linear-gradient(135deg,hsl(${h} 55% 38%),hsl(${(h + 40) % 360} 60% 28%))` }}>{asset.symbol.slice(0, 3)}</span>;
}
export function NetBadge({ a }: { a: AssetNetwork }) {
  return <span className="s-badge" data-testid={`badge-network-${a.networkId}`}>{a.networkName}{a.testnet ? ' testnet' : ''}</span>;
}

export function AssetPicker({ assets, selected, blockedAssetId, title, onSelect, onClose }: { assets: AssetNetwork[]; selected: string | null; blockedAssetId?: string | null; title: string; onSelect: (a: AssetNetwork) => void; onClose: () => void }) {
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
  const list = useMemo(() => { const s = q.trim().toLowerCase(); return s ? assets.filter((a) => `${a.symbol} ${a.name} ${a.networkName}`.toLowerCase().includes(s)) : assets; }, [assets, q]);
  return (
    <div className="s-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }} data-testid="dialog-asset-picker">
      <div ref={sheet} className="s-sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="flex items-center justify-between px-4 pb-2 pt-4">
          <h2 className="text-base font-semibold">{title}</h2>
          <button type="button" onClick={onClose} className="s-iconbtn" style={{ width: 40, height: 40 }} aria-label="Close asset selector" data-testid="button-picker-close"><X size={18} /></button>
        </div>
        <div className="px-4 pb-3">
          <label className="s-side flex items-center gap-2.5" style={{ padding: '.2rem .8rem' }}>
            <Search size={16} className="s-muted" aria-hidden="true" />
            <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, symbol or network" aria-label="Search assets" className="h-11 w-full bg-transparent text-sm outline-none" data-testid="input-asset-search" />
          </label>
        </div>
        <div className="overflow-y-auto px-2 pb-4" role="listbox" aria-label="Assets">
          {list.length === 0 && <p className="s-muted px-4 py-10 text-center text-sm" data-testid="state-picker-empty">No configured asset matches &ldquo;{q}&rdquo;.</p>}
          {list.map((a) => {
            const blocked = !!blockedAssetId && a.assetId === blockedAssetId;
            const sel = assetKey(a) === selected;
            return (
              <button key={assetKey(a)} type="button" role="option" aria-selected={sel} disabled={blocked} onClick={() => onSelect(a)} className="s-opt" data-testid={`option-asset-${a.assetId}-${a.networkId}`}>
                <Coin asset={a} />
                <span className="min-w-0 flex-1"><span className="block font-semibold">{a.symbol}</span><span className="s-muted block truncate text-xs">{a.name}{blocked ? ' - already on the other side' : ''}</span></span>
                <NetBadge a={a} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
