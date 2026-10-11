import { developmentClerkHost, stagingIdentityBindings } from "./index.mjs";

/**
 * A separately owner-controlled DEVELOPMENT application for Staging, not a
 * transfer/replacement of the managed Production tenant. This preparation
 * function never mutates keys, users, bindings, sessions or provider settings.
 */
export function independentStagingCandidate(current, candidate) {
  if (current.QXLAYER_EXTERNAL_ENVIRONMENT !== "staging" ||
      current.QXLAYER_DATABASE_PROVIDER !== "supabase")
    throw Error("Existing external Staging required.");
  if (!candidate.ownerControlConfirmed || !candidate.CLERK_SECRET_KEY?.startsWith("sk_test_"))
    throw Error("Owner-controlled Development Clerk credentials required.");
  const host = developmentClerkHost(candidate.CLERK_PUBLISHABLE_KEY);
  if (host === developmentClerkHost(current.CLERK_PUBLISHABLE_KEY) ||
      candidate.CLERK_SECRET_KEY === current.CLERK_SECRET_KEY)
    throw Error("Candidate must be independent of the existing managed application.");
  const previous = stagingIdentityBindings(current);
  const proposed = stagingIdentityBindings(candidate);
  const oldTargets = Object.values(previous).sort();
  const newTargets = Object.values(proposed).sort();
  if (JSON.stringify(oldTargets) !== JSON.stringify(newTargets) || oldTargets.length !== 1)
    throw Error("Prepare only the unchanged, existing Staging owner authorization.");
  if (Object.keys(proposed).some(id => Object.hasOwn(previous, id)))
    throw Error("Candidate native identity must belong to the independent application.");
  return {
    QXLAYER_CLERK_DEVELOPMENT_HOST: host,
    scope: "independent-staging-development-clerk",
    ownerBusinessAuthorizationPreserved: true,
    activationApproved: false,
    productionAuthenticationChanged: false,
  };
}
