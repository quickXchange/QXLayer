import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, X, ZoomIn, ZoomOut } from 'lucide-react';

export type ViewerItem = { title: string; caption?: string; imageUrl: string; device?: string; label: string; captured: boolean };

function Shot({ it, host, zoom, big }: { it: ViewerItem; host: string; zoom: boolean; big?: boolean }) {
  const [bad, setBad] = useState(false);
  useEffect(() => setBad(false), [it.imageUrl]);
  if (bad) return <div className="xpv-bad">Image unavailable</div>;
  const img = <img className="xpv-img" src={it.imageUrl} alt={it.title} decoding="async" referrerPolicy="no-referrer" onError={() => setBad(true)} />;
  if (it.device === 'phone') return <div className={`xpv-phone ${big ? 'big' : ''}`}>{img}</div>;
  return (
    <div className="xp-browser">
      <div className="xp-bar"><i /><i /><i /><span className="xp-url">{host}</span></div>
      <div className={`xpv-scroll ${zoom ? 'zoom' : ''}`} tabIndex={0} aria-label="Scrollable capture">{img}</div>
    </div>
  );
}

export function CaptureViewer({ items, host, name }: { items: ViewerItem[]; host: string; name: string }) {
  const [i, setI] = useState(() => (typeof window !== 'undefined' && window.innerWidth < 700 ? Math.max(0, items.findIndex((x) => x.device === 'phone')) : 0));
  const [zoom, setZoom] = useState(false);
  const [full, setFull] = useState(false);
  const n = items.length;
  const opener = useRef<HTMLElement | null>(null);
  const dlg = useRef<HTMLDivElement>(null);
  const open = () => { opener.current = document.activeElement as HTMLElement; setFull(true); };
  const cur = items[Math.min(i, n - 1)];
  const go = (d: number) => setI((x) => (x + d + n) % n);
  useEffect(() => {
    if (!full) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setFull(false); if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1); };
    const trap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !dlg.current) return;
      const f = dlg.current.querySelectorAll<HTMLElement>('button,[tabindex="0"]');
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.body.style.overflow = 'hidden';
    dlg.current?.querySelector<HTMLElement>('[data-testid="button-capture-close"]')?.focus();
    window.addEventListener('keydown', k); window.addEventListener('keydown', trap);
    return () => { window.removeEventListener('keydown', k); window.removeEventListener('keydown', trap); document.body.style.overflow = ''; opener.current?.focus(); };
  }, [full, n]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="xpv" data-testid="viewer-captures">
      <div className="xpv-head">
        <div className="min-w-0">
          <p className="xpv-count">{String(i + 1).padStart(2, '0')} / {String(n).padStart(2, '0')}</p>
          <h3 className="xpv-title" data-testid="text-capture-title">{cur.title}</h3>
          {cur.caption && <p className="s-muted xpv-cap">{cur.caption}</p>}
        </div>
        <div className="xpv-tools">
          {cur.device !== 'phone' && <button type="button" className="xpv-btn" onClick={() => setZoom((z) => !z)} aria-pressed={zoom} data-testid="button-capture-zoom">{zoom ? <ZoomOut size={16} /> : <ZoomIn size={16} />}<span>{zoom ? 'Fit' : 'Zoom'}</span></button>}
          <button type="button" className="xpv-btn" onClick={open} data-testid="button-capture-fullscreen"><Maximize2 size={16} /><span>Full screen</span></button>
        </div>
      </div>
      <div className="xpv-stage" key={i}><Shot it={cur} host={host} zoom={zoom} /></div>
      <p className="xpv-label s-muted" data-testid="text-capture-label">{cur.label}</p>
      {n > 1 && (
        <div className="xpv-thumbs" role="tablist" aria-label={`${name} screens`}>
          {items.map((it, k) => (
            <button key={k} type="button" role="tab" aria-selected={k === i} className="xpv-th" onClick={() => setI(k)} data-testid={`figure-gallery-${k}`}>
              <span className="xpv-thimg"><img src={it.imageUrl} alt="" loading="lazy" /></span>
              <span className="xpv-thname">{it.title}</span>
            </button>
          ))}
        </div>
      )}
      {full && (
        <div ref={dlg} className="xpv-full" role="dialog" aria-modal="true" aria-label={cur.title} data-testid="dialog-capture-fullscreen">
          <div className="xpv-fbar">
            <span className="xpv-ftitle">{cur.title}</span>
            {cur.device !== 'phone' && <button type="button" className="xpv-btn" onClick={() => setZoom((z) => !z)} aria-pressed={zoom} aria-label="Toggle zoom">{zoom ? <ZoomOut size={16} /> : <ZoomIn size={16} />}</button>}
            {n > 1 && <><button type="button" className="xpv-btn" onClick={() => go(-1)} aria-label="Previous"><ChevronLeft size={16} /></button><button type="button" className="xpv-btn" onClick={() => go(1)} aria-label="Next"><ChevronRight size={16} /></button></>}
            <button type="button" className="xpv-btn" onClick={() => setFull(false)} aria-label="Close full screen" data-testid="button-capture-close"><X size={16} /></button>
          </div>
          <div className="xpv-fbody"><Shot it={cur} host={host} zoom={zoom} big /></div>
          <p className="xpv-flabel">{cur.label}</p>
        </div>
      )}
    </div>
  );
}
