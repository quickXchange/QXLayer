import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@clerk/react";
import { Button } from "@/components/ui/button";

const Ready = createContext<() => void>(() => {});

/** Outside the provider: still renders if its remote script never initializes. */
export function ClerkLoadBoundary({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [expired, setExpired] = useState(false);
  const markReady = useCallback(() => setReady(true), []);
  useEffect(() => {
    if (ready) return;
    const timer = setTimeout(() => setExpired(true), 20000);
    return () => clearTimeout(timer);
  }, [ready]);
  const failed = expired && !ready;
  return <Ready.Provider value={markReady}>
    {failed && <div role="alert" data-testid="text-clerk-load-error" className="space-y-3 text-center">
      <p>Existing-account sign-in could not load. Check your connection or content blocker, then try again.</p>
      <Button onClick={() => window.location.reload()}>Reload sign-in</Button>
    </div>}
    <div hidden={failed}>{children}</div>
  </Ready.Provider>;
}

export function ClerkReadiness() {
  const { isLoaded } = useAuth();
  const ready = useContext(Ready);
  useEffect(() => { if (isLoaded) ready(); }, [isLoaded, ready]);
  return null;
}
