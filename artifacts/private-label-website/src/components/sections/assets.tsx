import { useMemo, useState } from 'react';
import type { PublicSite } from '@workspace/api-client-react';
import { Section, SectionHead } from './common';
import { Reveal } from '@/components/reveal';
import { Coin, NetBadge, assetKey } from '@/components/asset-picker';

export function Assets({ site }: { site: PublicSite }) {
  const [net, setNet] = useState<string | null>(null);
  const nets = useMemo(() => Array.from(new Map(site.assets.map((a) => [a.networkId, a.networkName]))), [site.assets]);
  if (!site.assets.length) return null;
  const list = net ? site.assets.filter((a) => a.networkId === net) : site.assets;
  return (
    <Section id="assets">
      <SectionHead eyebrow="Supported assets" title="Every asset and network listed here is configured for this site." body="Nothing is added for decoration. If it appears below, it is enabled in this tenant's configuration." />
      {nets.length > 1 && (
        <div className="mt-8 flex flex-wrap gap-2" role="group" aria-label="Filter by network">
          {[[null, 'All networks'] as const, ...nets.map(([id, n]) => [id, n] as const)].map(([id, n]) => <button key={id ?? 'all'} type="button" aria-pressed={net === id} onClick={() => setNet(id)} className="s-chip min-h-[40px] cursor-pointer px-4" style={net === id ? { borderColor: 'var(--s-accent)', color: 'var(--s-accent-ink)' } : undefined} data-testid={`filter-network-${id ?? 'all'}`}>{n}</button>)}
        </div>)}
      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((a, i) => (
          <Reveal key={assetKey(a)} delay={Math.min(i, 6) * 60}>
            <div className="s-card s-tile flex items-center gap-4 p-4" data-testid={`chip-asset-${a.assetId}-${a.networkId}`}>
              <Coin asset={a} size={44} />
              <div className="min-w-0 flex-1"><p className="font-semibold">{a.symbol}</p><p className="s-muted truncate text-sm">{a.name}</p></div>
              <NetBadge a={a} />
            </div>
          </Reveal>))}
      </div>
    </Section>
  );
}
