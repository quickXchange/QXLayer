import { assertDevelopment, initializeCatalog } from "./catalog-initializer/service";

const args = process.argv.slice(2).filter(arg => arg !== "--");
if (args.some(arg => !["--apply", "--restore-visibility", "--dry-run"].includes(arg))) throw new Error("Unsupported catalog initializer argument.");
if (args.includes("--apply") && args.includes("--dry-run")) throw new Error("Choose dry-run or apply, not both.");
assertDevelopment(process.env.NODE_ENV, process.env.REPLIT_DEPLOYMENT);
// Import/connect only after the Development guard; no alternate URL or target argument.
const { pool } = await import("@workspace/db");
const client = await pool.connect();
try {
  const options = { nodeEnv: process.env.NODE_ENV, deployment: process.env.REPLIT_DEPLOYMENT, restoreVisibility: args.includes("--restore-visibility") };
  const dryRun = await initializeCatalog(client, options);
  process.stdout.write(`${JSON.stringify({ mode: "dry-run", actions: dryRun }, null, 2)}\n`);
  if (args.includes("--apply")) {
    const applied = await initializeCatalog(client, { ...options, apply: true });
    process.stdout.write(`${JSON.stringify({ mode: "development-apply", actions: applied }, null, 2)}\n`);
  }
} finally {
  client.release();
  await pool.end();
}
