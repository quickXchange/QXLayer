import { lazy, Suspense, useEffect, useRef, type ComponentType, type ReactNode } from 'react';
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Redirect, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { useGetCurrentPrincipal, getGetCurrentPrincipalQueryKey, useGetDemoSession, getGetDemoSessionQueryKey, endDemoSession } from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/app/bits';
import { Button } from '@/components/ui/button';
import { AdminShell } from '@/components/app/shell';
import { PrincipalContext, usePrincipal } from '@/lib/principal';
import NotFound from '@/pages/not-found';
import Home from '@/pages/home';
const DemoAdmin = lazy(() => import('@/pages/demo-admin'));
import { CustomerShell } from '@/components/app/customer-shell';
import { useAdminPanels } from '@/lib/customer';
const AccountDashboard = lazy(() => import('@/pages/account').then(m => ({ default: m.AccountDashboard })));
const AccountOrders = lazy(() => import('@/pages/account').then(m => ({ default: m.AccountOrders })));
const AccountWhiteLabels = lazy(() => import('@/pages/account').then(m => ({ default: m.AccountWhiteLabels })));
const AdminPanels = lazy(() => import('@/pages/account').then(m => ({ default: m.AdminPanels })));
const ConfigureExchange = lazy(() => import('@/pages/account').then(m => ({ default: m.ConfigureExchange })));
const AccountProfile = lazy(() => import('@/pages/account').then(m => ({ default: m.AccountProfile })));
const NotProvisioned = lazy(() => import('@/pages/account').then(m => ({ default: m.NotProvisioned })));
const WhiteLabelRequests = lazy(() => import('@/pages/white-label-requests'));
const WhiteLabelOrder = lazy(() => import('@/pages/white-label-order'));
const AccountOrderDetail = lazy(() => import('@/pages/account-order'));
import { useParams } from 'wouter';
const Admin = lazy(() => import('@/pages/admin'));
const Clients = lazy(() => import('@/pages/clients'));
const ClientNew = lazy(() => import('@/pages/client-new'));
const ClientDetail = lazy(() => import('@/pages/client-detail'));
const Exchange = lazy(() => import('@/pages/exchange'));
const Modules = lazy(() => import('@/pages/modules'));
const Activity = lazy(() => import('@/pages/activity'));
const WhiteLabels = lazy(() => import('@/pages/white-labels'));
const Provisioning = lazy(() => import('@/pages/provisioning'));
const Integrations = lazy(() => import('@/pages/integrations'));
const TenantIntegrations = lazy(() => import('@/pages/integrations').then(m => ({ default: m.TenantIntegrations })));
const Providers = lazy(() => import('@/pages/providers'));
const CustomerDetail = lazy(() => import('@/pages/customer-detail'));
const Plans = lazy(() => import('@/pages/plans'));
const PlanDetail = lazy(() => import('@/pages/plan-detail'));
const Addons = lazy(() => import('@/pages/addons'));
const LandingProducts = lazy(() => import('@/pages/landing-products'));
const CatalogPreview = lazy(() => import('@/pages/catalog-preview'));
import { QXLAYER_LIGHT_LOGO_URL } from '@/lib/brand';
import { BrandLogo } from '@/components/brand-logo';
import { ConsoleThemeScope } from '@/components/app/console-frame';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } });

const clerkPubKey = publishableKeyFromHost(window.location.hostname, import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || '/' : path;
}

if (!clerkPubKey) throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: { logoPlacement: 'inside' as const, logoLinkUrl: basePath || '/', logoImageUrl: new URL(QXLAYER_LIGHT_LOGO_URL, window.location.origin).href },
  variables: {
    colorPrimary: '#12423f', colorForeground: '#12201f', colorMutedForeground: '#5a6664', colorDanger: '#b3382a',
    colorBackground: '#fbf8f2', colorInput: '#ffffff', colorInputForeground: '#12201f', colorNeutral: '#8a7f6c',
    fontFamily: "'Bricolage Grotesque', sans-serif", borderRadius: '0.5rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    logoImage: '!h-20 !w-20 !object-contain',
    cardBox: 'bg-[#fbf8f2] border border-[#ddd5c4] rounded-xl w-[440px] max-w-full overflow-hidden',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'text-[#12201f] text-2xl',
    headerSubtitle: 'text-[#5a6664]',
    socialButtonsBlockButtonText: 'text-[#12201f]',
    formFieldLabel: 'text-[#12201f]',
    footerActionLink: 'text-[#b4551f] font-medium',
    footerActionText: 'text-[#5a6664]',
    dividerText: 'text-[#5a6664]',
    identityPreviewEditButton: 'text-[#b4551f]',
    formFieldSuccessText: 'text-[#12423f]',
    alertText: 'text-[#12201f]',
    formButtonPrimary: 'bg-[#12423f] hover:bg-[#0d3230] text-[#f6f1e8]',
    formFieldInput: 'border-[#cfc6b3]',
  },
};

const localization = {
  signIn: { start: { title: 'Sign in to QXLayer', subtitle: 'Your QXLayer account' } },
  signUp: { start: { title: 'Create a QXLayer account', subtitle: 'Configure and request your White Label Exchange' } },
};

function AuthFrame({ children }: { children: ReactNode }) {
  return <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">{children}</div>;
}
const SignInPage = () => <AuthFrame><SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} fallbackRedirectUrl={`${basePath}/admin`} /></AuthFrame>;
const SignUpPage = () => <AuthFrame><SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} fallbackRedirectUrl={`${basePath}/account`} /></AuthFrame>;

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prev = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    return addListener(({ user }) => {
      const id = user?.id ?? null;
      if (prev.current !== undefined && prev.current !== id) qc.clear();
      prev.current = id;
    });
  }, [addListener, qc]);
  return null;
}

function HomeRedirect() {
  return <Home />;
}

function PrincipalGate({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const q = useGetCurrentPrincipal({ query: { queryKey: getGetCurrentPrincipalQueryKey(), refetchInterval: 10000 } });
  const { signOut } = useClerk();
  const qc = useQueryClient();
  let demoTab = false;
  try { demoTab = sessionStorage.getItem('qx-isolated-demo') === 'read-only'; } catch { /* no demo intent */ }
  const leave = async () => {
    if (!demoTab) { await signOut({ redirectUrl: '/' }); return; }
    try { await endDemoSession(); } finally {
      sessionStorage.removeItem('qx-isolated-demo'); qc.clear();
      window.location.assign(import.meta.env.BASE_URL);
    }
  };
  if (q.isLoading) return <ConsoleThemeScope><div className="space-y-3 p-10"><BrandLogo size={48} /><Skeleton className="h-10 w-64" /><Skeleton className="h-64 w-full" /></div></ConsoleThemeScope>;
  if (demoTab && q.data && !q.data.demo) return <ConsoleThemeScope><Skeleton className="m-10 h-64" /></ConsoleThemeScope>;
  if (q.isError || !q.data) {
    return (
      <ConsoleThemeScope><div className="grid min-h-[100dvh] place-items-center px-5 text-center">
        <div className="space-y-3"><BrandLogo size={48} className="mx-auto" /><p className="font-display text-3xl">Could not verify your access</p>
          <div className="flex justify-center gap-2"><Button data-testid="button-retry" onClick={() => q.refetch()}>Retry</Button>
            <Button variant="ghost" onClick={() => void leave()}>{demoTab ? 'Exit demo' : 'Sign out'}</Button></div></div>
      </div></ConsoleThemeScope>
    );
  }
  if (q.data.demo) {
    const tenantId = q.data.memberships?.[0]?.tenantId;
    if (!tenantId) return <Redirect to="/demo/admin" />;
    const allowed = `/clients/${tenantId}/exchange`;
    if (location !== allowed && !location.startsWith(`${allowed}/`)) return <Redirect to={allowed} />;
  }
  return (
    <PrincipalContext.Provider value={q.data}>
      {q.data.role === 'super_admin' ? <AdminShell>{children}</AdminShell> : <CustomerShell>{children}</CustomerShell>}
    </PrincipalContext.Provider>
  );
}

function Protected({ children }: { children: ReactNode }) {
  const demo = useGetDemoSession({ query: { queryKey: getGetDemoSessionQueryKey(), retry: false, staleTime: 0, refetchInterval: 60000 } });
  let demoTab = false;
  try { demoTab = sessionStorage.getItem("qx-isolated-demo") === "read-only"; } catch { /* no demo context */ }
  if (demoTab && demo.error) return <Redirect to="/demo/admin" />;
  if (demoTab && demo.data?.active) return <PrincipalGate>{children}</PrincipalGate>;
  if (demo.isLoading) return <ConsoleThemeScope><Skeleton className="m-10 h-64" /></ConsoleThemeScope>;
  return (
    <>
      <Show when="signed-in"><PrincipalGate>{children}</PrincipalGate></Show>
      <Show when="signed-out"><Redirect to="/" /></Show>
    </>
  );
}
function SuperOnly({ children }: { children: ReactNode }) {
  const p = usePrincipal();
  return p.role === 'super_admin' ? <>{children}</> : <Redirect to="/account" />;
}
function DeliveredOnly({ children }: { children: ReactNode }) {
  const p = usePrincipal(); const { id = '' } = useParams<{ id: string }>();
  const a = useAdminPanels(!p.demo && p.role !== 'super_admin');
  // Isolated demo access is not a delivered customer assignment. Its server
  // fixture boundary is authoritative and it must not read account endpoints.
  if (p.demo) return p.memberships?.some(m => m.tenantId === id) ? <>{children}</> : <NotProvisioned />;
  if (p.role === 'super_admin') return <>{children}</>;
  if (a.isLoading) return <Skeleton className="h-64 w-full" />;
  if (a.isError) return <ErrorState what="your admin panels" onRetry={() => a.refetch()} />;
  return a.data?.some((x) => x.tenantId === id) ? <>{children}</> : <NotProvisioned />;
}
const guard = (C: ComponentType) => () => <Protected><SuperOnly><C /></SuperOnly></Protected>;
const open = (C: ComponentType) => () => <Protected><C /></Protected>;
const rTenantInt = () => <Protected><DeliveredOnly><TenantIntegrations /></DeliveredOnly></Protected>;
const rDelivered = () => <Protected><DeliveredOnly><Exchange /></DeliveredOnly></Protected>;
const rAdmin = guard(Admin), rClients = guard(Clients), rNew = guard(ClientNew), rDetail = guard(ClientDetail), rModules = guard(Modules), rActivity = guard(Activity), rPlans = guard(Plans), rPlan = guard(PlanDetail), rAddons = guard(Addons), rLanding = guard(LandingProducts), rWL = guard(WhiteLabelRequests), rWLO = guard(WhiteLabelOrder), rWLs = guard(WhiteLabels), rProv = guard(Provisioning), rProviders = guard(Providers), rInt = guard(Integrations), rCust = guard(CustomerDetail);
const rAcc = open(AccountDashboard), rOrd = open(AccountOrders), rWls = open(AccountWhiteLabels), rPanels = open(AdminPanels), rCfg = open(ConfigureExchange), rProf = open(AccountProfile), rOrdD = open(AccountOrderDetail);

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}><Suspense fallback={<div className="p-6"><Skeleton className="h-64 w-full" /></div>}>{children}</Suspense></ErrorBoundary>;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={localization}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ClerkQueryClientCacheInvalidator />
          <RoutedErrorBoundary>
            <Switch>
              <Route path="/" component={HomeRedirect} />
              <Route path="/demo/admin" component={DemoAdmin} />
              <Route path="/sign-in/*?" component={SignInPage} />
              <Route path="/sign-up/*?" component={SignUpPage} />
              <Route path="/account" component={rAcc} />
              <Route path="/account/orders" component={rOrd} />
              <Route path="/account/orders/:orderId" component={rOrdD} />
              <Route path="/account/white-labels" component={rWls} />
              <Route path="/account/admin-panels" component={rPanels} />
              <Route path="/account/configure" component={rCfg} />
              <Route path="/account/profile/*?" component={rProf} />
              <Route path="/white-label-requests" component={rWL} />
              <Route path="/white-label-requests/:orderId" component={rWLO} />
              <Route path="/white-labels" component={rWLs} />
              <Route path="/provisioning" component={rProv} />
              <Route path="/providers" component={rProviders} />
              <Route path="/integrations" component={rInt} />
              <Route path="/customers/:customerId" component={rCust} />
              <Route path="/admin" component={rAdmin} />
              <Route path="/clients" component={rClients} />
              <Route path="/clients/new" component={rNew} />
              <Route path="/clients/:id/exchange/:section?/:orderId?" component={rDelivered} />
              <Route path="/clients/:id/integrations" component={rTenantInt} />
              <Route path="/clients/:id" component={rDetail} />
              <Route path="/modules" component={rModules} />
              <Route path="/plans" component={rPlans} />
              <Route path="/plans/new" component={rPlan} />
              <Route path="/plans/:id" component={rPlan} />
              <Route path="/add-ons" component={rAddons} />
              <Route path="/landing-products" component={rLanding} />
              <Route path="/catalog-preview" component={CatalogPreview} />
              <Route path="/activity" component={rActivity} />
              <Route component={NotFound} />
            </Switch>
          </RoutedErrorBoundary>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
