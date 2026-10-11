/** Opt-in external Staging only. Replit and Production keep their existing identity path. */
export function stagingClerk(env = process.env) {
  return env.QXLAYER_DATABASE_PROVIDER === "supabase" &&
    env.QXLAYER_EXTERNAL_ENVIRONMENT === "staging";
}

export function developmentClerkHost(key) {
  if (!key?.startsWith("pk_test_")) throw new Error("Staging requires a Development publishable key.");
  const decoded = Buffer.from(key.slice(8), "base64").toString("utf8");
  if (!/^[a-z0-9-]+\.clerk\.accounts\.dev\$$/.test(decoded))
    throw new Error("Invalid Development Clerk frontend host.");
  return decoded.slice(0, -1);
}

export function stagingIdentityBindings(env = process.env) {
  let bindings;
  try { bindings = JSON.parse(env.QXLAYER_STAGING_IDENTITY_BINDINGS ?? "{}"); }
  catch { throw new Error("Invalid Staging identity bindings."); }
  if (!bindings || Array.isArray(bindings) || typeof bindings !== "object")
    throw new Error("Invalid Staging identity bindings.");
  const targets = new Set();
  for (const [source, target] of Object.entries(bindings)) {
    if (!/^user_[A-Za-z0-9]+$/.test(source) || typeof target !== "string" ||
        !/^user_[A-Za-z0-9]+$/.test(target) || targets.has(target))
      throw new Error("Staging identity bindings must be explicit one-to-one user IDs.");
    targets.add(target);
  }
  return bindings;
}

/** Only server-owned, explicitly approved bindings can authorize copied business records. */
export function applicationUserId(nativeUserId, env = process.env) {
  if (!stagingClerk(env)) return nativeUserId;
  const bindings = stagingIdentityBindings(env);
  return Object.hasOwn(bindings, nativeUserId) ? bindings[nativeUserId] : null;
}

export function assertStagingClerk(env = process.env) {
  if (!stagingClerk(env)) return;
  if (!env.CLERK_SECRET_KEY?.startsWith("sk_test_"))
    throw new Error("Staging rejects live Clerk keys and requires a Development secret key.");
  if (developmentClerkHost(env.CLERK_PUBLISHABLE_KEY) !== env.QXLAYER_CLERK_DEVELOPMENT_HOST)
    throw new Error("Staging Clerk must match the pinned existing Development instance.");
  if (env.CLERK_PROXY_PUBLIC_URL)
    throw new Error("Staging Development authentication must not use a Production proxy.");
  stagingIdentityBindings(env);
}

/** Vite builds use NODE_ENV=production even when their Clerk instance is Development. */
export function assertFrontendClerk(env = process.env) {
  if (!env.VITE_CLERK_PUBLISHABLE_KEY)
    throw new Error("A matching Clerk publishable key is required.");
  if (env.QXLAYER_EXTERNAL_ENVIRONMENT === "staging") {
    if (!env.VITE_CLERK_PUBLISHABLE_KEY.startsWith("pk_test_") || env.VITE_CLERK_PROXY_URL)
      throw new Error("Staging frontend requires Development keys and no Production proxy.");
    if (developmentClerkHost(env.VITE_CLERK_PUBLISHABLE_KEY) !== env.QXLAYER_CLERK_DEVELOPMENT_HOST)
      throw new Error("Staging frontend must match the pinned existing Development instance.");
  } else if (!env.VITE_CLERK_PROXY_URL) {
    throw new Error("Production frontend requires its existing proxy URL.");
  }
}
