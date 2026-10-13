import { test } from "node:test";
import assert from "node:assert/strict";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { getGetSupabaseAuthSessionQueryKey } from "@workspace/api-client-react";
import { resetAccountQueries } from "./auth-query-transition";

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
