// Intent is a denial boundary only, never authentication or tenant authority.
// Check it as well as the principal to cover the first render after launch,
// while an observer may still hold the previous real-session principal.
export function customerQueriesAllowed(demo: boolean | undefined, intent: string | null) {
  return !demo && intent !== 'read-only';
}
export function currentDemoIntent() {
  try { return sessionStorage.getItem('qx-isolated-demo'); } catch { return null; }
}
