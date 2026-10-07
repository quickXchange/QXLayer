import { useState } from 'react';
import { useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { useStartDemoSession } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { ConsoleThemeScope } from '@/components/app/console-frame';
import { BrandLogo } from '@/components/brand-logo';

export default function DemoAdmin() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const login = useStartDemoSession();
  const [error, setError] = useState('');
  const open = async () => {
    setError('');
    try {
      const session = await login.mutateAsync({ data: {} });
      sessionStorage.setItem('qx-isolated-demo', 'read-only');
      qc.clear();
      navigate(`/clients/${session.tenantId}/exchange`);
    } catch { setError('Could not open the secure demo. Please try again.'); }
  };
  return <ConsoleThemeScope><main className="grid min-h-[100dvh] place-items-center px-5 py-12">
    <div className="w-full max-w-md space-y-6 rounded-2xl border bg-card p-7">
      <BrandLogo size={48} />
      <div><p className="text-xs font-medium uppercase tracking-widest text-primary">Sandbox Demo</p>
        <h1 className="mt-3 font-display text-3xl">NovaX Admin Demo</h1>
        <p className="mt-3 text-sm text-muted-foreground">Explore the real White Label Admin Panel. This public demo is read-only: identity, security and persistent settings cannot be changed.</p></div>
        <form className="space-y-4" onSubmit={e => { e.preventDefault(); void open(); }}>
          <p className="text-sm text-muted-foreground">No username or password. This temporary session can read only fictional demo configuration, never real accounts or customer data.</p>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button className="w-full" type="submit" disabled={login.isPending} data-testid="button-demo-signin">{login.isPending ? 'Signing in…' : 'Open Admin Demo'}</Button>
        </form>
      <p className="text-xs text-muted-foreground">No real funds, wallets, providers or payment credentials. Sessions expire after 15 minutes.</p>
      <a href={`${import.meta.env.BASE_URL}`} onClick={() => sessionStorage.removeItem('qx-isolated-demo')} className="text-sm text-primary underline">Back to QXLayer</a>
    </div>
  </main></ConsoleThemeScope>;
}
