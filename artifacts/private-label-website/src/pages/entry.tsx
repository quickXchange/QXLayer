import { useState } from 'react';
import { useLocation } from 'wouter';
import { ArrowRight } from 'lucide-react';

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export default function Entry() {
  const [v, setV] = useState('');
  const [, nav] = useLocation();
  const slug = slugify(v);
  return (
    <div className="relative grid min-h-[100dvh] place-items-center overflow-hidden bg-background px-5 py-10">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse 60% 45% at 50% 0%, hsl(var(--primary) / .14), transparent 70%)' }} />
      <form className="rise relative w-full max-w-md space-y-6 rounded-2xl border bg-card p-6 shadow-sm sm:p-8" onSubmit={(e) => { e.preventDefault(); if (slug) nav(`/${slug}`); }}>
        <div className="space-y-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Private label sandbox</p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Find a branded site</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">Enter the site identifier you were given. Each site has its own branding and services.</p>
        </div>
        <div>
          <label htmlFor="slug" className="mb-1.5 block text-xs font-medium text-muted-foreground">Site identifier</label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input id="slug" data-testid="input-slug" autoComplete="off" autoCapitalize="none" spellCheck={false} className="h-12 flex-1 rounded-lg border bg-background px-3.5 font-mono text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="your-brand" value={v} onChange={(e) => setV(e.target.value)} />
            <button data-testid="button-go" disabled={!slug} className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition-opacity disabled:opacity-40">Open<ArrowRight size={15} /></button>
          </div>
          {slug && <p className="mt-2 font-mono text-xs text-muted-foreground" data-testid="text-slug-preview">/{slug}</p>}
        </div>
      </form>
    </div>
  );
}
