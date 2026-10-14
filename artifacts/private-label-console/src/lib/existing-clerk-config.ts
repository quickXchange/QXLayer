import { publishableKeyFromHost } from '@clerk/react/internal';

const raw = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;
const staging = import.meta.env.VITE_QXLAYER_EXTERNAL_ENVIRONMENT === 'staging';

/** Staging retains its direct instance; Development retains the managed proxy. */
export const existingClerkKey = staging ? raw : publishableKeyFromHost(window.location.hostname, raw);
export const existingClerkProxy = staging ? undefined : import.meta.env.VITE_CLERK_PROXY_URL;
