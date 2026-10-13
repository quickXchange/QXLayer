export const EXISTING_ACCOUNT_LINK_PATH = '/account/link-existing';

/** Fixed same-origin destination; never use Clerk callback/query input as a URL. */
export function existingAccountProofReturnUrl(basePath: string, origin: string): string {
  const result = new URL(`${basePath.replace(/\/$/, '')}${EXISTING_ACCOUNT_LINK_PATH}`, origin);
  if (result.origin !== new URL(origin).origin) throw new Error('Existing-account proof must return to this origin.');
  return result.href;
}

/** Only this bounded authentication continuation is allowed. */
export function signInDestination(search: string): string {
  return new URLSearchParams(search).get('next') === EXISTING_ACCOUNT_LINK_PATH
    ? EXISTING_ACCOUNT_LINK_PATH : '/admin';
}

export const EXISTING_ACCOUNT_LINK_CONTINUATION = `next=${encodeURIComponent(EXISTING_ACCOUNT_LINK_PATH)}`;
