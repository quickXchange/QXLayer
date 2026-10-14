import { Fragment, lazy, Suspense, useEffect, useRef, type ComponentType, type ReactNode } from 'react';
import { ClerkProvider, SignIn, SignUp, useClerk as useLegacyClerk } from '@clerk/react';
import { Show, useClerk } from '@/lib/auth';
import { authClient, ownedAuth, supabaseAuth } from '@/lib/owned-auth-client';
import { registerSupabaseQueryClient } from '@/lib/supabase-auth-client';
import { StagingAuthHistorySync } from '@/components/auth/staging-auth-navigation';
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
const AdminShell = lazy(() => import('@/components/app/shell').then(m => ({ default: m.AdminShell })));
import { PrincipalContext, usePrincipal } from '@/lib/principal';
import NotFound from '@/pages/not-found';
import Home from '@/pages/home';
const DemoAdmin = lazy(() => import('@/pages/demo-admin'));
const CustomerShell = lazy(() => import('@/components/app/customer-shell').then(m => ({ default: m.CustomerShell })));
import { RoutePrefetch } from '@/components/app/route-prefetch';
import { ExternalStagingAuthBridge } from '@/components/app/external-staging-auth';
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
import { QXLAYER_LIGHT_LOGO_URL, VYNOX_DARK_LOGO_URL } from '@/lib/brand';
import { PLATFORM_SITE } from '@/lib/platform-site';
import { useSiteTheme } from '@site/hooks/use-site-theme';
import { BrandLogo } from '@/components/brand-logo';
import { ConsoleThemeScope } from '@/components/app/console-frame';
import { resetAccountQueries } from '@/lib/auth-query-transition';
import { setRequestTimeout } from '@workspace/api-client-react';
import { ClerkLoadBoundary, ClerkReadiness } from '@/components/auth/clerk-load-boundary';

const externalStaging = import.meta.env.VITE_EXTERNAL_DEPLOYMENT === "true" &&
    import.meta.env.VITE_QXLAYER_EXTERNAL_ENVIRONMENT === "staging";
if (externalStaging) setRequestTimeout(20000);
const ClerkStartupBoundary = externalStaging ? ClerkLoadBoundary : Fragment;

const queryClient = new QueryClient({ defaultOptions: { queries: {
  retry: externalStaging ? false : 1,
  networkMode: externalStaging ? 'always' : 'online',
  refetchOnWindowFocus: false,
} } });

const clerkPubKey = ownedAuth ? undefined : import.meta.env.VITE_EXTERNAL_DEPLOYMENT === "true"
  ? import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
  : publishableKeyFromHost(window.location.hostname, import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
if (!ownedAuth && import.meta.env.VITE_QXLAYER_EXTERNAL_ENVIRONMENT === "staging" &&
    (!clerkPubKey?.startsWith("pk_test_") || clerkProxyUrl)) {
  throw new Error("Staging requires Development Clerk authentication without a Production proxy.");
}
registerSupabaseQueryClient(queryClient);
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || '/' : path;
}

if (!ownedAuth && !clerkPubKey) throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: { logoPlacement: 'inside' as const, logoLinkUrl: basePath || '/', logoImageUrl: new URL(QXLAYER_LIGHT_LOGO_URL, window.location.origin).href },
  // Resolve from the mounted theme, including body-portaled provider controls.
  variables: {
    colorPrimary: 'hsl(var(--primary))', colorForeground: 'hsl(var(--foreground))', colorMutedForeground: 'hsl(var(--muted-foreground))', colorDanger: 'hsl(var(--destructive))',
    colorBackground: 'hsl(var(--card))', colorInput: 'hsl(var(--popover))', colorInputForeground: 'hsl(var(--foreground))', colorNeutral: 'hsl(var(--foreground))',
    fontFamily: "'Space Grotesk', sans-serif", borderRadius: '0.75rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    logoImage: '!h-auto !w-[180px] !max-w-full !object-contain',
    cardBox: 'bg-card border border-border rounded-xl w-[440px] max-w-full overflow-hidden shadow-[0_30px_80px_-40px_var(--s-glow)]',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'text-foreground text-2xl',
    headerSubtitle: 'text-muted-foreground',
    socialButtonsBlockButtonText: 'text-foreground',
    formFieldLabel: 'text-foreground',
    footerActionLink: 'text-[var(--s-accent-ink)] font-medium',
    footerActionText: 'text-muted-foreground',
    dividerText: 'text-muted-foreground',
    identityPreviewEditButton: 'text-[var(--s-accent-ink)]',
    formFieldSuccessText: 'text-[var(--s-accent-ink)]',
    alertText: 'text-foreground',
    formButtonPrimary: 'bg-primary hover:opacity-90 text-primary-foreground',
    formFieldInput: 'border-input bg-popover text-foreground',
  },
};

/** Hides the provider-generated header/logo (it may carry the instance's application name); inputs, legal and security UI stay. */
const hiddenProviderHeader = { elements: { header: '!hidden', logoBox: '!hidden' } };

const localization = {
  signIn: { start: { title: 'Sign in to VYNOX LAYER', subtitle: 'Your VYNOX LAYER account' } },
  signUp: { start: { title: 'Create a VYNOX LAYER account', subtitle: 'Configure and request your White Label Exchange' } },
};

function AuthFrame({ children, title, subtitle }: { children: ReactNode; title: string; subtitle: string }) {
  return <ConsoleThemeScope><div className="flex min-h-[100dvh] flex-col items-center justify-center gap-5 px-4 py-8">
    <div className="flex flex-col items-center gap-1 text-center">
      <BrandLogo size={80} />
      <h1 className="text-2xl text-foreground">{title}</h1>
      <p className="text-sm text-muted-foreground">{subtitle}</p>
    </div>
    {children}
  </div></ConsoleThemeScope>;
}
const SignInPage = () => <AuthFrame title={localization.signIn.start.title} subtitle={localization.signIn.start.subtitle}><SignIn appearance={hiddenProviderHeader} routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} fallbackRedirectUrl={`${basePath}/admin`} /></AuthFrame>;
const SignUpPage = () => <AuthFrame title={localization.signUp.start.title} subtitle={localization.signUp.start.subtitle}><SignUp appearance={hiddenProviderHeader} routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} fallbackRedirectUrl={`${basePath}/account`} /></AuthFrame>;

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useLegacyClerk();
  const qc = useQueryClient();
  const prev = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    return addListener(({ user }) => {
      const id = user?.id ?? null;
      if (prev.current !== undefined && prev.current !== id) {
        if (externalStaging) void resetAccountQueries(qc);
        else qc.clear();
      }
      prev.current = id;
    });
  }, [addListener, qc]);
  return null;
}

function OwnedCacheInvalidator() {
  const qc = useQueryClient();
  const s = authClient.useSession();
  const prev = useRef<string | null | undefined>(undefined);
  const id = s.isPending || s.error ? undefined : (s.data?.user?.id ?? null);
  useEffect(() => {
    if (id === undefined) return;
    if (prev.current !== undefined && prev.current !== id) void resetAccountQueries(qc);
    prev.current = id;
  }, [id, qc]);
  return null;
}

function HomeRedirect() {
  return <Home />;
}

function PrincipalGate({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const q = useGetCurrentPrincipal({ query: { queryKey: getGetCurrentPrincipalQueryKey(), refetchInterval: query => externalStaging && query.state.error ? false : 10000 } });
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
  if ((q.error as { status?: number } | null)?.status === 428) return <Redirect to="/account/security" replace={supabaseAuth} />;
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
      <RoutePrefetch />
      {q.data.role === 'super_admin' ? <AdminShell>{children}</AdminShell> : <CustomerShell>{children}</CustomerShell>}
    </PrincipalContext.Provider>
  );
}

function Protected({ children }: { children: ReactNode }) {
  let demoTab = false;
  try { demoTab = sessionStorage.getItem("qx-isolated-demo") === "read-only"; } catch { /* no demo context */ }
  const demo = useGetDemoSession({ query: { queryKey: getGetDemoSessionQueryKey(), enabled: demoTab, retry: false, staleTime: 0, refetchInterval: 60000 } });
  if (demoTab && demo.error) return <Redirect to="/demo/admin" />;
  if (demoTab && demo.data?.active) return <PrincipalGate>{children}</PrincipalGate>;
  if (demoTab && demo.isLoading) return <ConsoleThemeScope><Skeleton className="m-10 h-64" /></ConsoleThemeScope>;
  if (ownedAuth && !demoTab) return <OwnedProtected>{children}</OwnedProtected>;
  return (
    <>
      <Show when="signed-in"><PrincipalGate>{children}</PrincipalGate></Show>
      <Show when="signed-out"><Redirect to="/" /></Show>
    </>
  );
}
function OwnedProtected({ children }: { children: ReactNode }) {
  const s = authClient.useSession();
  if (s.error) return <ConsoleThemeScope><ErrorState what="your session" onRetry={() => void s.refetch()} /><Button variant="outline" onClick={() => window.location.reload()}>Reload private access</Button></ConsoleThemeScope>;
  if (s.isPending) return <ConsoleThemeScope><Skeleton className="m-10 h-64" /></ConsoleThemeScope>;
  if (!s.data?.user) return <Redirect to={(s as { mfaRequired?: boolean }).mfaRequired ? '/two-factor' : '/sign-in'} replace={supabaseAuth} />;
  return <PrincipalGate>{children}</PrincipalGate>;
}
function SuperOnly({ children }: { children: ReactNode }) {
  const p = usePrincipal();
  return p.role === 'super_admin' ? <>{children}</> : <Redirect to="/account" replace={supabaseAuth} />;
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

const OwnedSignIn = lazy(() => import('@/pages/sign-in'));
const OwnedSignUp = lazy(() => import('@/pages/sign-up'));
const OwnedForgot = lazy(() => import('@/pages/forgot-password'));
const OwnedReset = lazy(() => import('@/pages/reset-password'));
const OwnedVerify = lazy(() => import('@/pages/verify-email'));
const OwnedTwoFactor = lazy(() => import('@/pages/two-factor'));
const OwnedSecurity = lazy(() => import('@/pages/account-security'));
const OwnedMigrate = lazy(() => import('@/pages/migrate-account'));
const OwnedLink = lazy(() => import('@/pages/link-existing'));

function AppRoutes() {
  return (
  <Switch>
              <Route path="/" component={HomeRedirect} />
              <Route path="/demo/admin" component={DemoAdmin} />
              {!ownedAuth && <Route path="/sign-in/*?" component={SignInPage} />}
              {!ownedAuth && <Route path="/sign-up/*?" component={SignUpPage} />}
              {ownedAuth && <Route path="/sign-in" component={OwnedSignIn} />}
              {ownedAuth && <Route path="/sign-up" component={OwnedSignUp} />}
              {ownedAuth && <Route path="/forgot-password" component={OwnedForgot} />}
              {ownedAuth && <Route path="/reset-password" component={OwnedReset} />}
              {ownedAuth && <Route path="/verify-email" component={OwnedVerify} />}
              {ownedAuth && <Route path="/two-factor" component={OwnedTwoFactor} />}
              {ownedAuth && <Route path="/account/security" component={OwnedSecurity} />}
              {ownedAuth && (!supabaseAuth || import.meta.env.VITE_QXLAYER_EXTERNAL_ENVIRONMENT === 'development') && <Route path="/migrate-account" component={OwnedMigrate} />}
              {ownedAuth && <Route path="/account/link-existing" component={OwnedLink} />}
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
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  const { dark } = useSiteTheme(PLATFORM_SITE);
  return (
    <ClerkStartupBoundary><ClerkProvider
      publishableKey={clerkPubKey!}
      proxyUrl={clerkProxyUrl}
      appearance={{ ...clerkAppearance, options: { ...clerkAppearance.options,
        logoImageUrl: new URL(dark ? VYNOX_DARK_LOGO_URL : QXLAYER_LIGHT_LOGO_URL, window.location.origin).href } }}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={localization}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      {externalStaging && <ClerkReadiness />}
      <ExternalStagingAuthBridge>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ClerkQueryClientCacheInvalidator />
          <RoutedErrorBoundary>
            <AppRoutes />
          </RoutedErrorBoundary>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
      </ExternalStagingAuthBridge>
    </ClerkProvider></ClerkStartupBoundary>
  );
}

function OwnedProviderWithRoutes() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <OwnedCacheInvalidator />
        {supabaseAuth
          ? <StagingAuthHistorySync><RoutedErrorBoundary><AppRoutes /></RoutedErrorBoundary></StagingAuthHistorySync>
          : <RoutedErrorBoundary><AppRoutes /></RoutedErrorBoundary>}
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      {ownedAuth ? <OwnedProviderWithRoutes /> : <ClerkProviderWithRoutes />}
    </WouterRouter>
  );
}

export default App;
