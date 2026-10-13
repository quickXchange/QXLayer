/** Bound network/token/body waits without weakening caller cancellation. */
export async function withRequestDeadline<T>(
  caller: AbortSignal | null | undefined,
  milliseconds: number,
  operation: (signal: AbortSignal | undefined) => Promise<T>,
): Promise<T> {
  if (caller?.aborted) throw caller.reason ?? new DOMException("Request cancelled", "AbortError");
  if (!milliseconds) return operation(caller ?? undefined);
  const controller = new AbortController();
  let rejectAbort: (reason: unknown) => void = () => {};
  const aborted = new Promise<never>((_, reject) => { rejectAbort = reject; });
  const cancel = (reason: unknown) => {
    controller.abort(reason);
    rejectAbort(reason);
  };
  const forward = () => cancel(caller?.reason ?? new DOMException("Request cancelled", "AbortError"));
  const timer = setTimeout(() => cancel(new Error("The request took too long. Check your connection and try again.")), milliseconds);
  caller?.addEventListener("abort", forward, { once: true });
  try {
    if (caller?.aborted) forward();
    return await Promise.race([aborted, operation(controller.signal)]);
  } finally {
    clearTimeout(timer);
    caller?.removeEventListener("abort", forward);
  }
}
