import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Redirect } from "wouter";
import { getGetSupabaseAuthSessionQueryKey } from "@workspace/api-client-react";
import { authenticatedSignInDestination, observeAuthHistoryRestore } from "@/lib/auth-history";
import { useSupabaseSessionState } from "@/lib/supabase-auth-client";
import { AuthFrame, ErrorLine } from "./auth-ui";
import { Button } from "@/components/ui/button";

/** Mounted only by the isolated Supabase Staging provider. */
const RestoringSession = createContext(false);
export function StagingAuthHistorySync({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [restoring, setRestoring] = useState(false);
  useEffect(() => observeAuthHistoryRestore(window, () => {
    // Keep active observers; a restored document must verify the real cookie.
    setRestoring(true);
    void qc.invalidateQueries({ queryKey: getGetSupabaseAuthSessionQueryKey(), exact: true })
      .finally(() => setRestoring(false));
  }), [qc]);
  return <RestoringSession.Provider value={restoring}>{children}</RestoringSession.Provider>;
}

export function StagingSignInGate({ children }: { children: ReactNode }) {
  const { session, error, isPending, isFetchedAfterMount, refetch } = useSupabaseSessionState();
  const restoring = useContext(RestoringSession);
  if (error) return <AuthFrame title="Could not verify your session">
    <ErrorLine>Check your connection before signing in again.</ErrorLine>
    <Button onClick={() => void refetch()}>Retry session check</Button>
    <Button variant="outline" onClick={() => window.location.reload()}>Reload private access</Button>
  </AuthFrame>;
  // A routine background poll must not unmount a form and erase typed credentials.
  if (isPending || !isFetchedAfterMount || restoring) return <AuthFrame title="Checking your session">
    <p className="text-sm text-muted-foreground">Checking whether you are already signed in…</p>
  </AuthFrame>;
  const destination = authenticatedSignInDestination(session, window.location.search);
  if (destination) return <Redirect to={destination} replace />;
  return children;
}
