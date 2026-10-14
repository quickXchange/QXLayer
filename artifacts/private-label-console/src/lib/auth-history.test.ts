import { test } from "node:test";
import assert from "node:assert/strict";
import { authenticatedSignInDestination, observeAuthHistoryRestore } from "./auth-history";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { getGetSupabaseAuthSessionQueryKey } from "@workspace/api-client-react";

const full = { user: { id: "disposable" }, recovery: false, mfaRequired: false };
test("already authenticated sign-in returns to the protected destination", () => {
  assert.equal(authenticatedSignInDestination(full, ""), "/admin");
  assert.equal(authenticatedSignInDestination(full, "?next=%2Faccount%2Flink-existing"), "/admin");
});
test("untrusted history/query continuations never become redirects", () => {
  for (const next of ["https://attacker.invalid", "//attacker.invalid", "/admin?role=super_admin", "/account/link-existing/evil"])
    assert.equal(authenticatedSignInDestination(full, `?next=${encodeURIComponent(next)}`), "/admin");
});
test("anonymous and recovery sessions cannot enter protected pages", () => {
  assert.equal(authenticatedSignInDestination(null, ""), null);
  assert.equal(authenticatedSignInDestination({ ...full, user: null }, ""), null);
  assert.equal(authenticatedSignInDestination({ ...full, recovery: true }, ""), null);
});
test("history cannot bypass MFA or restore retired account-link continuations", () => {
  assert.equal(authenticatedSignInDestination({ ...full, mfaRequired: true }, ""), "/two-factor");
  assert.equal(authenticatedSignInDestination({ ...full, mfaRequired: true }, "?next=%2Faccount%2Flink-existing"),
    "/two-factor");
});
test("BFCache restore revalidates, normal load does not duplicate fetch, and cleanup removes listener", () => {
  const target = new EventTarget();
  let calls = 0;
  const stop = observeAuthHistoryRestore(target, () => { calls++; });
  target.dispatchEvent(new Event("pageshow"));
  assert.equal(calls, 0);
  const restored = () => Object.assign(new Event("pageshow"), { persisted: true });
  target.dispatchEvent(restored());
  assert.equal(calls, 1);
  stop();
  target.dispatchEvent(restored());
  assert.equal(calls, 1);
});

test("route entry verifies cached identity but a background poll does not reset first-entry validation", async () => {
  const qc = new QueryClient();
  const key = getGetSupabaseAuthSessionQueryKey();
  qc.setQueryData(key, full);
  const anonymous = { ...full, user: null };
  const observer = new QueryObserver(qc, { queryKey: key, staleTime: Infinity,
    refetchOnMount: "always", retry: false,
    queryFn: async () => { await new Promise(resolve => setTimeout(resolve, 5)); return anonymous; } });
  const stop = observer.subscribe(() => {});
  try {
    assert.equal(observer.getCurrentResult().isFetchedAfterMount, false);
    await observer.refetch();
    assert.equal(observer.getCurrentResult().isFetchedAfterMount, true);
    assert.equal(observer.getCurrentResult().data?.user, null);
    const polling = observer.refetch();
    assert.equal(observer.getCurrentResult().isFetching, true);
    assert.equal(observer.getCurrentResult().isFetchedAfterMount, true);
    await polling;
  } finally { stop(); qc.clear(); }
});
