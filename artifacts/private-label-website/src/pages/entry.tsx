import { useState } from 'react';
import { useLocation } from 'wouter';

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export default function Entry() {
  const [v, setV] = useState('');
  const [, nav] = useLocation();
  const slug = slugify(v);
  return (
    <div className="grid min-h-[100dvh] place-items-center bg-background px-6">
      <form className="rise w-full max-w-md space-y-5" onSubmit={(e) => { e.preventDefault(); if (slug) nav(`/${slug}`); }}>
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Private label sandbox</p>
        <h1 className="text-4xl font-semibold tracking-tight">Find a branded site</h1>
        <p className="text-muted-foreground">Enter the site identifier you were given. Each tenant has its own branding and capabilities.</p>
        <div className="flex gap-2">
          <input data-testid="input-slug" aria-label="Site identifier" className="h-11 flex-1 rounded-md border bg-card px-3 font-mono text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="your-brand" value={v} onChange={(e) => setV(e.target.value)} />
          <button data-testid="button-go" disabled={!slug} className="h-11 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground disabled:opacity-40">Open</button>
        </div>
      </form>
    </div>
  );
}
