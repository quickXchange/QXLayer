import { useState } from 'react';
import { useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { useGetDemoSession, useStartDemoSession, getGetDemoSessionQueryKey } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConsoleThemeScope } from '@/components/app/console-frame';
import { BrandLogo } from '@/components/brand-logo';

export default function DemoAdmin() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const status = useGetDemoSession({ query: { queryKey: getGetDemoSessionQueryKey(), retry: false } });
  const login = useStartDemoSession();
  const [username, setUsername] = useState('demo@qxlayer.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const open = async () => {
    setError('');
    try {
      const session = await login.mutateAsync({ data: { username, password } });
      qc.clear();
      navigate(`/clients/${session.tenantId}/exchange`);
    } catch { setError('Could not sign in. Check the demo credentials and try again.'); }
  };
  return <ConsoleThemeScope><main className="grid min-h-[100dvh] place-items-center px-5 py-12">
    <div className="w-full max-w-md space-y-6 rounded-2xl border bg-card p-7">
      <BrandLogo size={48} />
      <div><p className="text-xs font-medium uppercase tracking-widest text-primary">Sandbox Demo</p>
        <h1 className="mt-3 font-display text-3xl">NovaX Admin Demo</h1>
        <p className="mt-3 text-sm text-muted-foreground">Explore the real White Label Admin Panel. This public demo is read-only: identity, security and persistent settings cannot be changed.</p></div>
      {status.data?.active ? <Button className="w-full" onClick={() => navigate(`/clients/${status.data?.tenantId}/exchange`)}>Continue to Admin Demo</Button> :
        <form className="space-y-4" onSubmit={e => { e.preventDefault(); void open(); }}>
          <label className="block space-y-2 text-sm">Username<Input autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} data-testid="input-demo-username" required /></label>
          <label className="block space-y-2 text-sm">Password<Input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} data-testid="input-demo-password" required /></label>
          <p className="text-xs text-muted-foreground">Public demo credentials: demo@qxlayer.com / Demo123!</p>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button className="w-full" type="submit" disabled={login.isPending} data-testid="button-demo-signin">{login.isPending ? 'Signing in…' : 'Open Admin Demo'}</Button>
        </form>}
      <p className="text-xs text-muted-foreground">No real funds, wallets, providers or payment credentials. Sessions expire after one hour.</p>
      <a href={`${import.meta.env.BASE_URL}`} className="text-sm text-primary underline">Back to QXLayer</a>
    </div>
  </main></ConsoleThemeScope>;
}
