export default function NotFound() {
  return (
    <div className="relative grid min-h-[100dvh] place-items-center overflow-hidden bg-background px-6 text-center" data-testid="state-not-found">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 0%, hsl(var(--primary) / .12), transparent 70%)' }} />
      <div className="relative max-w-md space-y-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Error 404</p>
        <h1 className="text-4xl font-semibold tracking-tight">Page not found</h1>
        <p className="text-muted-foreground">The address you opened does not lead anywhere. Check the link, or look up the site you were given.</p>
        <a href={import.meta.env.BASE_URL} className="inline-flex h-11 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground" data-testid="link-find-site">Find a site</a>
      </div>
    </div>
  );
}
