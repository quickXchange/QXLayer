import { useRef, useState } from 'react';
import { Download, Loader2, Paperclip, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ALLOWED, MAX_BYTES, fmtSize, useAttachmentApi, useBlobUrl, type Att } from '@/lib/wl';

export function AttachmentChip({ a, onRemove }: { a: Att; onRemove?: () => void }) {
  const api = useAttachmentApi(); const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const img = a.contentType.startsWith('image/');
  const { url, fail } = useBlobUrl(a.id, img);
  const dl = async () => {
    setBusy(true); setErr('');
    try { const u = URL.createObjectURL(await api.blob(a.id, true)); const l = document.createElement('a'); l.href = u; l.download = a.fileName; document.body.appendChild(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); }
    catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-md border bg-background p-2" data-testid={`file-${a.id}`}>
      <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded border bg-muted">
        {img ? (url ? <img src={url} alt={a.fileName} className="h-full w-full object-contain" /> : fail ? <span className="text-[10px]">n/a</span> : <Loader2 className="h-4 w-4 animate-spin" />) : <Paperclip className="h-4 w-4 text-muted-foreground" />}
      </div>
      <div className="min-w-0 flex-1"><p title={a.fileName} className="truncate text-sm">{a.fileName}</p><p className="text-[10px] uppercase text-muted-foreground">{a.category.replaceAll('_', ' ')} · {fmtSize(a.size)}</p>{err && <p className="break-words text-xs text-destructive">{err}</p>}</div>
      <Button type="button" className="shrink-0" size="icon" variant="ghost" aria-label={`Download ${a.fileName}`} disabled={busy} onClick={dl}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}</Button>
      {onRemove && <Button type="button" className="shrink-0" size="icon" variant="ghost" aria-label={`Remove ${a.fileName}`} onClick={onRemove}><X className="h-4 w-4" /></Button>}
    </div>
  );
}

export function AttachmentList({ items }: { items: Att[] }) {
  if (!items.length) return <p className="text-sm text-muted-foreground">None</p>;
  return <div className="grid gap-2 md:grid-cols-2">{items.map((a) => <AttachmentChip key={a.id} a={a} />)}</div>;
}

type Rule = { exts: string[]; hint: string };
export const RULES: Record<string, Rule> = {
  logo: { exts: ['png', 'jpg', 'jpeg', 'webp', 'gif'], hint: 'PNG, JPEG, WEBP or GIF (raster only)' },
  favicon: { exts: ['png', 'ico'], hint: 'PNG or ICO' },
  design_reference: { exts: ALLOWED, hint: 'Images, PDF, TXT, DOCX, ZIP' },
  requirement: { exts: ALLOWED, hint: 'Images, PDF, TXT, DOCX, ZIP' },
};

export function Uploader({ category, items, single, onAdd, onRemove, onBusy, label }: { category: keyof typeof RULES & string; items: Att[]; single?: boolean; onAdd: (a: Att) => void; onRemove: (id: string) => void; onBusy: (d: number) => void; label: string }) {
  const api = useAttachmentApi(); const ref = useRef<HTMLInputElement>(null); const [errs, setErrs] = useState<string[]>([]); const [n, setN] = useState(0);
  const rule = RULES[category];
  const pick = async (files: FileList | null) => {
    if (!files) return; setErrs([]);
    for (const f of Array.from(files).slice(0, single ? 1 : 20)) {
      const ext = f.name.split('.').pop()?.toLowerCase() ?? '';
      if (!rule.exts.includes(ext)) { setErrs((e) => [...e, `${f.name}: type not allowed. ${rule.hint}`]); continue; }
      if (f.size > MAX_BYTES) { setErrs((e) => [...e, `${f.name}: larger than 8 MB`]); continue; }
      setN((x) => x + 1); onBusy(1);
      try { onAdd(await api.upload(f, category)); } catch (e) { setErrs((x) => [...x, `${f.name}: ${(e as Error).message}`]); } finally { setN((x) => x - 1); onBusy(-1); }
    }
    if (ref.current) ref.current.value = '';
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" size="sm" disabled={n > 0} onClick={() => ref.current?.click()}>{n > 0 ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Paperclip className="mr-2 h-4 w-4" />}{n > 0 ? 'Uploading' : label}</Button>
        <span className="text-xs text-muted-foreground">{rule.hint} · max 8 MB</span>
        <input ref={ref} type="file" hidden multiple={!single} accept={rule.exts.map((x) => `.${x}`).join(',')} onChange={(e) => pick(e.target.files)} aria-label={label} />
      </div>
      {errs.map((e, i) => <p key={i} role="alert" className="text-sm text-destructive">{e}</p>)}
      {items.length > 0 && <div className={`grid min-w-0 gap-2 ${!single && items.length > 1 ? 'md:grid-cols-2' : ''}`}>{items.map((a) => <AttachmentChip key={a.id} a={a} onRemove={() => onRemove(a.id)} />)}</div>}
    </div>
  );
}
