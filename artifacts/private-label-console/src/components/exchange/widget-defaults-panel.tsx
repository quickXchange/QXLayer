import { Link } from 'wouter';
import { ExSection as Section } from './manage';
import { DraftFooter, Field, Pick, SimNote } from './ui';
import { methodServes, isFiatEp, type ExchangeDraft } from './use-exchange-draft';

const NONE = 'none';
/** Widget defaults: Swap and Convert are chosen independently, only from enabled routes. */
export function WidgetDefaultsPanel({ d, locked, root }: { d: ExchangeDraft; locked: boolean; root: string }) {
  const s = d.draft!;
  const label = (id: string) => { if (isFiatEp(id)) return `${id.slice(5)} (fiat)`; const c = d.catalog.find((x) => x.assetNetworkId === id); return c ? `${c.symbol} on ${c.networkName}` : id; };
  const live = (a: 'swap' | 'convert') => s.routes.filter((r) => r.action === a && r.enabled);
  const pmsFor = (r: { source: string; destination: string; paymentMethodIds: string[] }) => { const f = [r.source, r.destination].find(isFiatEp)?.slice(5); return f ? s.paymentMethods.filter((p) => p.enabled && r.paymentMethodIds.includes(p.id) && methodServes(p, f)) : []; };
  const dp = s.defaultPairs ?? {};
  const write = (a: 'swap' | 'convert', v: { source: string; destination: string; paymentMethodId?: string } | null) => { const next = { ...dp }; if (v) next[a] = v as never; else delete next[a]; d.patch({ defaultPairs: next }); };
  const swap = dp.swap; const conv = dp.convert;
  const swapRoutes = live('swap'); const convRoutes = live('convert');
  const sources = (rs: typeof swapRoutes) => [...new Set(rs.map((r) => r.source))];
  const dests = (rs: typeof swapRoutes, src?: string) => [...new Set(rs.filter((r) => r.source === src).map((r) => r.destination))];
  const routeOf = (rs: typeof swapRoutes, src?: string, dst?: string) => rs.find((r) => r.source === src && r.destination === dst);
  const swapRoute = routeOf(swapRoutes, swap?.source, swap?.destination);
  const swapPms = swapRoute ? pmsFor(swapRoute) : [];
  const stale = (p: typeof swap, rs: typeof swapRoutes) => !!p && !routeOf(rs, p.source, p.destination);
  const pickSwapSource = (src: string) => { if (src === NONE) return write('swap', null); const dst = dests(swapRoutes, src)[0]; const r = routeOf(swapRoutes, src, dst); write('swap', { source: src, destination: dst, paymentMethodId: r ? pmsFor(r)[0]?.id : undefined }); };
  const pickSwapDest = (dst: string) => { const r = routeOf(swapRoutes, swap?.source, dst); write('swap', { source: swap!.source, destination: dst, paymentMethodId: r ? pmsFor(r)[0]?.id : undefined }); };
  const pickConvSource = (src: string) => { if (src === NONE) return write('convert', null); write('convert', { source: src, destination: dests(convRoutes, src)[0] }); };
  const opts = (ids: string[]): [string, string][] => ids.map((i) => [i, label(i)]);
  return (
    <Section n="X7" title="Widget defaults" note="The pair a visitor sees first in each product. Swap and Convert are independent. Only enabled routes are offered; defaults never create a route." footer={<DraftFooter d={d} locked={locked} />}>
      <SimNote />
      <fieldset disabled={locked} className="space-y-6" data-testid="section-widget-defaults">
        <div className="space-y-3 rounded-md border p-4" data-testid="defaults-swap">
          <h3 className="font-display text-lg">Swap default (crypto and fiat)</h3>
          {swapRoutes.length === 0 ? <p className="text-sm text-muted-foreground" data-testid="text-no-swap-routes">No enabled Swap route. <Link href={`${root}/routes`} className="text-copper hover:underline">Configure routes</Link></p> : (
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="You send"><Pick bounded testid="select-default-swap-source" disabled={locked} value={swap?.source ?? NONE} onChange={pickSwapSource} options={[[NONE, 'No default'], ...opts(sources(swapRoutes))]} /></Field>
              <Field label="You receive"><Pick bounded testid="select-default-swap-destination" disabled={locked || !swap} value={swap?.destination ?? ''} onChange={pickSwapDest} options={opts(dests(swapRoutes, swap?.source))} /></Field>
              <Field label="Payment method (required)"><Pick testid="select-default-swap-method" disabled={locked || !swap} value={swap?.paymentMethodId ?? ''} onChange={(v) => swap && write('swap', { ...swap, paymentMethodId: v })} options={swapPms.length ? swapPms.map((p): [string, string] => [p.id, p.label || 'Unnamed']) : [['', 'No compatible enabled method']]} /></Field>
            </div>)}
          {stale(swap, swapRoutes) && <p role="alert" className="text-xs text-destructive" data-testid="text-swap-stale">The saved Swap default no longer matches an enabled route. Choose another or clear it.</p>}
        </div>
        <div className="space-y-3 rounded-md border p-4" data-testid="defaults-convert">
          <h3 className="font-display text-lg">Convert default (crypto to crypto)</h3>
          {convRoutes.length === 0 ? <p className="text-sm text-muted-foreground" data-testid="text-no-convert-routes">No enabled Convert route. <Link href={`${root}/routes`} className="text-copper hover:underline">Configure routes</Link></p> : (
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="You send"><Pick bounded testid="select-default-convert-source" disabled={locked} value={conv?.source ?? NONE} onChange={pickConvSource} options={[[NONE, 'No default'], ...opts(sources(convRoutes))]} /></Field>
              <Field label="You receive"><Pick bounded testid="select-default-convert-destination" disabled={locked || !conv} value={conv?.destination ?? ''} onChange={(v) => conv && write('convert', { source: conv.source, destination: v })} options={opts(dests(convRoutes, conv?.source))} /></Field>
            </div>)}
          {stale(conv, convRoutes) && <p role="alert" className="text-xs text-destructive" data-testid="text-convert-stale">The saved Convert default no longer matches an enabled route.</p>}
        </div>
      </fieldset>
    </Section>
  );
}
