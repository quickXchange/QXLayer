/** Exact ledger check with one explicitly inactive, additive Staging auth migration. */
export function assertMigrationReadback(rows, manifest, env = process.env) {
  const inactiveAuth = env.QXLAYER_EXTERNAL_ENVIRONMENT === "staging" &&
    env.QXLAYER_AUTH_PROVIDER === "clerk" && rows.length === 2 && manifest.length === 3 &&
    manifest[2].file === "0003_owned_auth.sql";
  const expected = inactiveAuth ? manifest.slice(0, 2) : manifest;
  if (JSON.stringify(rows) !== JSON.stringify(expected))
    throw Error("Applied migration ledger does not match reviewed source.");
}
