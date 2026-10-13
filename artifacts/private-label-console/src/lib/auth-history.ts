import { EXISTING_ACCOUNT_LINK_CONTINUATION, signInDestination } from "./existing-account-link";

type SessionState = { user: unknown | null; recovery: boolean; mfaRequired: boolean };

/** Never turn recovery or pending MFA into a fully authenticated destination. */
export function authenticatedSignInDestination(session: SessionState | null, search: string): string | null {
  if (!session?.user || session.recovery) return null;
  const destination = signInDestination(search);
  if (!session.mfaRequired) return destination;
  return destination === "/account/link-existing"
    ? `/two-factor?${EXISTING_ACCOUNT_LINK_CONTINUATION}` : "/two-factor";
}

/** A BFCache restore does not remount React or fire the normal query mount fetch. */
export function observeAuthHistoryRestore(target: EventTarget, revalidate: () => void): () => void {
  const listener = (event: Event) => {
    if ((event as PageTransitionEvent).persisted) revalidate();
  };
  target.addEventListener("pageshow", listener);
  return () => target.removeEventListener("pageshow", listener);
}
