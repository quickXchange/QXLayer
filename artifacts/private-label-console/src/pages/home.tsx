import { Link } from 'wouter';
import { ArrowRight, ShieldCheck, Layers, Network } from 'lucide-react';
import { Logo } from '@/components/app/shell';
import { Button } from '@/components/ui/button';

export default function Home() {
  const pts = [
    { i: Layers, t: 'One client, one boundary', d: 'Each tenant carries its own brand, domain, modules, asset list and configuration. Nothing is shared by accident.' },
    { i: ShieldCheck, t: 'Explicit access', d: 'Roles are assigned by an operator. Signing up never grants admin rights.' },
    { i: Network, t: 'Entitlements, not products', d: 'Modules describe what a client may use in the sandbox. This console does not run exchanges or move funds.' },
  ];
  return (
    <div className="grain min-h-[100dvh]">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Logo />
        <div className="flex gap-2">
          <Button asChild variant="ghost" data-testid="link-sign-in"><Link href="/sign-in">Sign in</Link></Button>
          <Button asChild data-testid="link-sign-up"><Link href="/sign-up">Request access</Link></Button>
        </div>
      </header>
      <section className="mx-auto grid max-w-6xl gap-10 px-6 pb-20 pt-14 md:grid-cols-[1.4fr_1fr] md:pt-24">
        <div className="rise">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-copper">Sandbox control plane</p>
          <h1 className="font-display mt-4 text-6xl leading-[0.95] md:text-8xl">Stand up a branded crypto business. Keep every client apart.</h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">An operator console for provisioning white-label tenants: brand, domain, modules, assets and networks, configuration. Sandbox activation only.</p>
          <Button asChild size="lg" className="mt-8" data-testid="link-enter-console"><Link href="/sign-in">Enter the console <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
        </div>
        <div className="rise rounded-md border bg-card p-6 font-mono text-xs [animation-delay:150ms]">
          <p className="mb-4 uppercase tracking-wider text-muted-foreground">Provisioning order</p>
          {['Create client', 'Brand', 'Domain', 'Modules', 'Assets and networks', 'Configuration'].map((s, i) => (
            <div key={s} className="flex items-center gap-3 border-t py-3"><span className="text-copper">0{i + 1}</span><span className="text-sm font-sans">{s}</span></div>
          ))}
        </div>
      </section>
      <section className="border-y bg-sidebar text-sidebar-foreground">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 md:grid-cols-3">
          {pts.map((p) => (<div key={p.t}><p.i className="h-5 w-5 text-sidebar-primary" /><h3 className="font-display mt-4 text-2xl">{p.t}</h3><p className="mt-2 text-sm text-sidebar-foreground/75">{p.d}</p></div>))}
        </div>
      </section>
      <footer className="mx-auto max-w-6xl px-6 py-8 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Independent sandbox · no live finance · no production launch</footer>
    </div>
  );
}
