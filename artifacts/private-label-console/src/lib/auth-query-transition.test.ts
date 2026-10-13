import { test } from "node:test";
import assert from "node:assert/strict";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { getGetSupabaseAuthSessionQueryKey } from "@workspace/api-client-react";
import { resetAccountQueries } from "./auth-query-transition";

test("legacy clear can leave a mounted session signed out even though the replacement fetch succeeds", async () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const key = getGetSupabaseAuthSessionQueryKey();
  const anonymous = { user: null };
  const signedIn = { user: { id: "disposable-signed-in" } };
  qc.setQueryData(key, anonymous);
  const observer = new QueryObserver(qc, { queryKey: key, queryFn: async () => anonymous, staleTime: Infinity });
  const unsubscribe = observer.subscribe(() => {});
  try {
    await qc.cancelQueries();
    qc.clear();
    await qc.fetchQuery({ queryKey: key, queryFn: async () => signedIn, staleTime: 0 });
    assert.deepEqual(qc.getQueryData(key), signedIn);
    assert.deepEqual(observer.getCurrentResult().data, anonymous);
    assert.equal(qc.getQueryCache().find({ queryKey: key })?.getObserversCount(), 0);
  } finally { unsubscribe(); qc.clear(); }
});

test("fresh sign-in reaches the mounted anonymous session observer instead of leaving it signed out", async () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const key = getGetSupabaseAuthSessionQueryKey();
  const signedIn = { user: { id: "disposable-signed-in" } };
  qc.setQueryData(key, { user: null });
  const observer = new QueryObserver(qc, { queryKey: key, queryFn: async () => signedIn, staleTime: Infinity });
  const unsubscribe = observer.subscribe(() => {});
  try {
    await resetAccountQueries(qc);
    await qc.fetchQuery({ queryKey: key, queryFn: async () => signedIn, staleTime: 0 });
    assert.deepEqual(observer.getCurrentResult().data, signedIn);
    assert.equal(observer.getCurrentResult().isLoading, false);
    assert.equal(qc.getQueryCache().find({ queryKey: key })?.getObserversCount(), 1);
  } finally { unsubscribe(); qc.clear(); }
});

test("identity reset keeps session and pending principal observers alive, and drops old account data", async () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const key = getGetSupabaseAuthSessionQueryKey();
  qc.setQueryData(key, { user: { id: "fixture-new" } });
  qc.setQueryData(["old-account-orders"], { private: "old account" });
  let requests = 0;
  const observer = new QueryObserver(qc, {
    queryKey: ["principal"],
    queryFn: ({ signal }) => new Promise<{ role: string }>((resolve, reject) => {
      requests++;
      const timer = setTimeout(() => resolve({ role: "unassigned" }), 10);
      signal.addEventListener("abort", () => { clearTimeout(timer); reject(signal.reason); }, { once: true });
    }),
  });
  const unsub = observer.subscribe(() => {});
  try {
    await resetAccountQueries(qc);
    await new Promise(resolve => setTimeout(resolve, 50));
    assert.equal(observer.getCurrentResult().isLoading, false);
    assert.equal(observer.getCurrentResult().data?.role, "unassigned");
    assert.deepEqual(qc.getQueryData(key), { user: { id: "fixture-new" } });
    assert.equal(qc.getQueryData(["old-account-orders"]), undefined);
    assert.equal(qc.getQueryCache().find({ queryKey: ["principal"] })?.getObserversCount(), 1);
    assert.ok(requests >= 2);
  } finally { unsub(); qc.clear(); }
});
