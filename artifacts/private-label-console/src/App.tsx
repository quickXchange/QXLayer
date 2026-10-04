import { useEffect, useRef, type ReactNode } from 'react';
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Redirect, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { useGetCurrentPrincipal } from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { AdminShell } from '@/components/app/shell';
import { PrincipalContext } from '@/lib/principal';
import NotFound from '@/pages/not-found';
import Home from '@/pages/home';
import Unassigned from '@/pages/unassigned';
import Admin from '@/pages/admin';
import Clients from '@/pages/clients';
import ClientNew from '@/pages/client-new';
import ClientDetail from '@/pages/client-detail';
import Modules from '@/pages/modules';
import Activity from '@/pages/activity';
import Plans from '@/pages/plans';
import PlanDetail from '@/pages/plan-detail';
import Addons from '@/pages/addons';
import LandingProducts from '@/pages/landing-products';
import CatalogPreview from '@/pages/catalog-preview';

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
  options: { logoPlacement: 'inside' as const, logoLinkUrl: basePath || '/', logoImageUrl: `${window.location.origin}${basePath}/logo.svg` },
  variables: {
    colorPrimary: '#12423f', colorForeground: '#12201f', colorMutedForeground: '#5a6664', colorDanger: '#b3382a',
    colorBackground: '#fbf8f2', colorInput: '#ffffff', colorInputForeground: '#12201f', colorNeutral: '#8a7f6c',
    fontFamily: "'Bricolage Grotesque', sans-serif", borderRadius: '0.5rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
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
  signIn: { start: { title: 'Sign in to Private Label', subtitle: 'Operator console, sandbox environment' } },
  signUp: { start: { title: 'Request an account', subtitle: 'Access is assigned by a platform operator after sign-up' } },
};

function AuthFrame({ children }: { children: ReactNode }) {
  return <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">{children}</div>;
}
const SignInPage = () => <AuthFrame><SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} /></AuthFrame>;
const SignUpPage = () => <AuthFrame><SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} /></AuthFrame>;

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
  return (
    <>
      <Show when="signed-in"><Redirect to="/admin" /></Show>
      <Show when="signed-out"><Home /></Show>
    </>
  );
}

function PrincipalGate({ children }: { children: ReactNode }) {
  const q = useGetCurrentPrincipal();
  const { signOut } = useClerk();
  if (q.isLoading) return <div className="space-y-3 p-10"><Skeleton className="h-10 w-64" /><Skeleton className="h-64 w-full" /></div>;
  if (q.isError || !q.data) {
    return (
      <div className="grid min-h-[100dvh] place-items-center px-5 text-center">
        <div className="space-y-3"><p className="font-display text-3xl">Could not verify your access</p>
          <div className="flex justify-center gap-2"><Button data-testid="button-retry" onClick={() => q.refetch()}>Retry</Button>
            <Button variant="ghost" onClick={() => signOut({ redirectUrl: '/' })}>Sign out</Button></div></div>
      </div>
    );
  }
  return (
    <PrincipalContext.Provider value={q.data}>
      {q.data.role === 'unassigned' ? <Unassigned /> : <AdminShell>{children}</AdminShell>}
    </PrincipalContext.Provider>
  );
}

function Protected({ children }: { children: ReactNode }) {
  return (
    <>
      <Show when="signed-in"><PrincipalGate>{children}</PrincipalGate></Show>
      <Show when="signed-out"><Redirect to="/" /></Show>
    </>
  );
}
const guard = (C: () => ReactNode) => () => <Protected><C /></Protected>;
const rAdmin = guard(Admin), rClients = guard(Clients), rNew = guard(ClientNew), rDetail = guard(ClientDetail), rModules = guard(Modules), rActivity = guard(Activity), rPlans = guard(Plans), rPlan = guard(PlanDetail), rAddons = guard(Addons), rLanding = guard(LandingProducts);

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
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
              <Route path="/sign-in/*?" component={SignInPage} />
              <Route path="/sign-up/*?" component={SignUpPage} />
              <Route path="/admin" component={rAdmin} />
              <Route path="/clients" component={rClients} />
              <Route path="/clients/new" component={rNew} />
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
