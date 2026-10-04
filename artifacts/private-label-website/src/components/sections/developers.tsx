import { FlaskConical, KeyRound, Webhook, Code2 } from 'lucide-react';
import type { Caps } from '../../lib/capabilities';
import { Section, SectionHead, PreviewNote } from './common';
import { Reveal } from '../reveal';

const CODE = `// Configuration shape preview - not a live endpoint
{
  "mode": "test",
  "asset": "<configured asset>",
  "network": "<configured network>",
  "amount": "<decimal string>"
}`;

export function Developers({ caps }: { caps: Caps }) {
  const f: [typeof Code2, string, string][] = [[Code2, 'Merchant API', 'Programmatic access is planned for this site. It is not available yet.']];
  if (caps.keys) f.push([KeyRound, 'API keys', 'Key management is included in the plan. Keys are not issued from this site and are never displayed here.']);
  if (caps.webhooks) f.push([Webhook, 'Webhooks', 'Event delivery is included in the plan but is not active yet. No notifications are sent today.']);
  f.push([FlaskConical, 'Sandbox', 'This environment is a sandbox. Nothing here connects to a live API.']);
  return (
    <Section id="developers">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <div>
          <SectionHead eyebrow="Developers - coming later" title="Developer tools are not live yet." body="The merchant API is part of this site's plan, but it is deferred. What follows describes what is planned, not what you can use today." />
          <ul className="mt-8 space-y-5">{f.map(([I, t, d], i) => <Reveal key={t} delay={i * 70}><li className="flex gap-4" data-testid={`feature-dev-${i}`}><span className="grid h-10 w-10 flex-none place-items-center border" style={{ borderRadius: 'var(--s-r1)', borderColor: 'var(--s-line)' }}><I size={18} style={{ color: 'var(--s-accent-ink)' }} aria-hidden="true" /></span><div><p className="font-semibold">{t}</p><p className="s-muted mt-1 text-sm leading-relaxed">{d}</p></div></li></Reveal>)}</ul>
        </div>
        <Reveal>
          <div className="s-lit s-codewin overflow-hidden" data-testid="code-preview">
            <div className="flex items-center justify-between border-b px-4 py-2.5" style={{ borderColor: 'var(--s-line)' }}><span className="flex items-center gap-3"><span className="s-dots" aria-hidden="true"><i /><i /><i /></span><span className="s-mono text-xs s-muted">config-preview.json</span></span><span className="s-badge">Not live</span></div>
            <pre className="s-code p-4" tabIndex={0} aria-label="Example configuration shape"><code>{CODE}</code></pre>
          </div>
          <PreviewNote>Placeholders only. No credentials or endpoints are shown.</PreviewNote>
        </Reveal>
      </div>
    </Section>
  );
}
