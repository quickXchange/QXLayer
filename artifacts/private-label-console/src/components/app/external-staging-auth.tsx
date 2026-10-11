import { useEffect, useState, type ReactNode } from "react";
import { useClerk } from "@clerk/react";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";

const externalStaging = import.meta.env.VITE_EXTERNAL_DEPLOYMENT === "true" &&
  import.meta.env.VITE_QXLAYER_EXTERNAL_ENVIRONMENT === "staging";

/**
 * The external Development API is behind a different upstream hostname.
 * Use the genuine browser session token, not hostname-dependent session cookies.
 * Replit and Production retain their existing cookie-authentication behavior.
 */
export function ExternalStagingAuthBridge({ children }: { children: ReactNode }) {
  const clerk = useClerk();
  const [ready, setReady] = useState(!externalStaging);
  useEffect(() => {
    if (!externalStaging) return;
    setAuthTokenGetter(async () => clerk.session?.getToken() ?? null);
    setReady(true);
    return () => setAuthTokenGetter(null);
  }, [clerk]);
  // Register before mounting any generated API query, including the principal gate.
  if (!ready) return <div className="p-6"><Skeleton className="h-24 w-full" /></div>;
  return children;
}
